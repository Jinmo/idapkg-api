//@ts-check
import * as Koa from 'koa';
import * as KoaRouter from 'koa-router';
import * as AsyncLock from 'async-lock';
import * as bodyParser from 'koa-bodyparser';
import * as cors from '@koa/cors';
import * as session from 'koa-session';
import * as multer from 'koa-multer';
import * as crypto from 'crypto';
import { Package, User, Release } from './db';
import { import_zipped_package } from './upload';
import * as storage from './storage'
import PACKAGE_SCHEMA from './package-schema';

const app = new Koa();
const _ = new KoaRouter();

const multerInstance = multer({ dest: 'uploads' })
// const ALLOWED_ORIGIN = 'https://idapkg.com'
const ALLOWED_ORIGIN = undefined;

enum Locks {
    Package,
    Release
};

const lock = new AsyncLock();

_.get('/search', async (ctx: any) => {
    const { q } = ctx.query;
    const arr = await Package.find({ name: new RegExp(q, 'i') }, 'name id version compat_win compat_mac compat_linux author description keywords -_id');

    ctx.body = { success: true, data: arr };
});

_.get('/info', async (ctx: any) => {
    const { id } = ctx.query;
    const item: any = await Package.findOne({ id });

    if (!item) {
        ctx.body = { success: false, error: 404 }
        return;
    }

    if (item.id !== id) {
        ctx.body = { success: false, error: 500 };
    } else {
        ctx.body = { success: true, data: item };
    }
});

// User-related endpoints

const login = (ctx: any, user: any) => {
    ctx.session = { username: user.username };
}

_.post('/signup', async (ctx: any) => {
    const { username, password, email } = ctx.request.body;
    const user = new User({ username, password, email });

    try {
        await user.save();
        ctx.body = { success: true }
    } catch (e) {
        ctx.body = { success: false, error: e.message }
    }
})

_.post('/login', async (ctx: any) => {
    const { username, password } = ctx.request.body;
    const user: any = await User.findOne({ $or: [{ username: username }, { email: username }] });

    if (user && await user.comparePassword(password)) {
        ctx.body = { success: true, data: { username: user.username } }

        login(ctx, user)
    } else {
        ctx.body = { success: false, error: 'Username or password does not exist' }
    }
})

_.get('/user', async (ctx: any) => {
    if (!ctx.session.username) {
        ctx.body = { success: false }
    }
    else {
        let user: any;

        try {
            user = await User.findOne({ username: ctx.session.username })
            ctx.body = { success: true, data: { username: user.username } }
        } catch (error) {
            ctx.body = { success: false, error: error }
        }
    }
})

_.get('/user/packages', async (ctx: any) => {
    const { username } = ctx.query;
    const user: any = await User.findOne({ username })

    if (user) {
        const pkgs = await Package.find({ author: username })
        ctx.body = { success: true, data: { packages: pkgs, createdAt: user.createdAt } }
    }
    else {
        ctx.body = { success: false, error: 'User not found' }
    }
})

_.get('/logout', async (ctx: any) => {
    ctx.session = null
    ctx.body = { success: true }
})

_.post('/upload', async (ctx: any, next: any) => {
    let user: any;

    if (!ctx.session.username) {
        ctx.body = { success: false, error: 'Login required' }
        return
    }
    else {
        try {
            user = await User.findOne({ username: ctx.session.username })
            ctx.body = { success: true, data: { username: user.username } }
        } catch (error) {
            ctx.body = { success: false, error: error }
            return
        }
    }
    await multerInstance.single('file')(ctx, next)

    await lock.acquire(['package', 'release'], async () => {
        ctx.body = await import_zipped_package(ctx.session.username, ctx.req.file.path)
    })
})

const error = (ctx: any, data: any) => {
    if (data.success === false) {
        ctx.set("X-Error", data.error)
        ctx.status = 404
    } else {
        ctx.redirect(data.redirect)
    }
}

_.get('/download', async (ctx: any) => {
    const { spec } = ctx.query;
    let name, version_spec;
    let query = {}

    if (spec.indexOf('==') !== -1) {
        [name, version_spec] = spec.split('==');
    } else {
        [name, version_spec] = [spec, null];
    }

    if (name === '') {
        return error(ctx, { success: false, error: 'name is empty' })
    }

    if (version_spec === '') {
        return error(ctx, { success: false, error: 'version is empty' })
    }

    if (version_spec && version_spec !== '*')
        Object.assign(query, { version: version_spec });

    const pkg = await Package.findOne({ id: name })
    if (!pkg) {
        console.info(name)
        return error(ctx, { success: false, error: 'Package not found' })
    }

    Object.assign(query, { package: pkg._id })
    const item: any = await Release.findOne(query).sort('-createdAt')
    if (item) {
        return error(ctx, { success: true, redirect: (await storage.get(name, item.version)) })
    }

    return error(ctx, { success: false, error: "Release empty" })
})

_.get('/releases', async (ctx: any) => {
    const { name } = ctx.query

    const pkg = await Package.findOne({ id: name })
    if (!pkg) {
        ctx.body = { success: false, error: 'Package not found' }
        return
    }

    const releases = await Release.find({ package: pkg._id }, 'version -_id')
        .sort('createdAt')
    ctx.body = { success: true, data: releases }
})

_.get('/schema', async (ctx: any) => {
    ctx.body = PACKAGE_SCHEMA;
})

app.keys = [crypto.randomBytes(32).toString('hex')];

const CONFIG = {
    key: 'koa:sess', /** (string) cookie key (default is koa:sess) */
    /** (number || 'session') maxAge in ms (default is 1 days) */
    /** 'session' will result in a cookie that expires when session/browser is closed */
    /** Warning: If a session cookie is stolen, this cookie will never expire */
    maxAge: 86400000,
    autoCommit: true, /** (boolean) automatically commit headers (default true) */
    overwrite: true, /** (boolean) can overwrite or not (default true) */
    httpOnly: true, /** (boolean) httpOnly or not (default true) */
    signed: true, /** (boolean) signed or not (default true) */
    rolling: false, /** (boolean) Force a session identifier cookie to be set on every response. The expiration is reset to the original maxAge, resetting the expiration countdown. (default is false) */
    renew: false, /** (boolean) renew session when session is nearly expired, so we can always keep user logged in. (default is false)*/
};

app
    .use(session(CONFIG, app))
    .use(cors({ credentials: true, origin: ALLOWED_ORIGIN }))
    .use(bodyParser())
    .use(_.routes())
    ;

app.listen(8080);