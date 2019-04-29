import { promisify } from 'util'
import * as child_process from 'child_process'
import * as which from 'which'
import * as semver from 'semver';
import * as fs from 'fs'
import { Validator } from 'jsonschema';
import * as storage from './storage'
import { Package, Release } from './db';
import PACKAGE_SCHEMA from './package-schema';

const execFile = promisify(child_process.execFile)
const PYTHON_EXECUTABLE = which.sync('python');

interface PackageInfo {
    name: string,
    version: string,
    description: string,
    author?: string,
    homepage?: string,
    installers?: string[],
    keywords?: string[],
    dependencies?: object
};

enum Attributes {
    procs = 'procs',
    loaders = 'loaders',
    plugins = 'plugins',
    til = 'til',
    sig = 'sig',
    ids = 'ids'
};

// Python based ZIP processor
class ZipReader {
    zip_path: string
    constructor(filename: string) {
        this.zip_path = filename
    }

    invoke(args: string[]) {
        return execFile(PYTHON_EXECUTABLE,
            ['zip-processor.py', ...args], { encoding: 'buffer' })
    }

    async get(filename: string): Promise<Buffer> {
        const { stdout } = await this.invoke(['extract', this.zip_path, filename])
        return stdout
    }

    async existsMany(filenames: string[]): Promise<boolean> {
        const { stdout } = await this.invoke(['existsMany', this.zip_path, ...filenames])
        return parseInt(stdout.toString('utf-8')) === filenames.length;
    }

    async attributes(): Promise<(Attributes | string)[]> {
        const { stdout } = await this.invoke(['attributes', this.zip_path])
        return JSON.parse(stdout.toString('utf-8'));
    }
}

async function import_zipped_package(owner: string, filename: string) {
    const z = new ZipReader(filename)
    const info = JSON.parse((await z.get('info.json')).toString('utf-8'))

    // Validate info.json
    const v = new Validator()
    const res = v.validate(info, PACKAGE_SCHEMA)

    if (!res.valid) {
        return { success: false, error: "info.json validation error:\n  " + res.errors.map(x => x.toString()).join('\n  ') }
    }

    // Additional validation
    // 1. version string check
    if (!semver.valid(info.version)) {
        return { success: false, error: "info.json validation error:\n  version field is not valid: see semver.org" }
    }

    // 2. installers check
    if (info.installers && !z.existsMany(info.installers)) {
        return { success: false, error: "info.json validation error:\n  one or more items in installers field do not exist" }
    }

    const attr = await z.attributes()

    const data: any = {
        id: info._id,
        name: info.name,
        version: info.version,
        description: info.description,
        homepage: info.homepage,
        author: owner,
        readme: (await z.get('README.md')).toString('utf-8'),
        metadata: info,
        keywords: attr.concat(info.keywords || []),
        updatedAt: Date.now()
    };

    try {
        const existing: any = await Package.findOne({ id: info._id })
        let package_id = null;

        if (existing) {
            if (existing.author !== owner) {
                return { success: false, error: 'same package id with different owner exists' }
            }

            const releases = await Release.find({ package: existing.id })
            for (const release of releases) {
                if (semver.eq(<string>release.version, info.version)) {
                    // exact match, let's replace this release
                    await release.remove();
                    break;
                }
                if (semver.gt(<string>release.version, info.version)) {
                    return { success: false, error: `Uploaded package\'s version should be greater than or equal with latest one of existing versions. Latest version in this repo: ${release.version} ; Uploaded version: ${info.version}` }
                }
            }

            // Update fields
            Object.assign(existing, data)

            const item: any = await Package.findOneAndUpdate({ id: info._id }, data, { upsert: false })
            if (!item) {
                return { success: false, error: 'internal server error' };
            }
            package_id = item._id;
        } else {
            const pkg = new Package({ ...data, createdAt: data.updatedAt })
            const res = await pkg.save()
            package_id = res._id;
        }

        if (!package_id) {
            // This should not happen
            return { success: false, error: "internal server error: package id not found" }
        }

        // Save release
        await (new Release({ package: package_id, version: data.version })).save()

        // Try to save and unlink temporary file
        await storage.put(data.id, data.version, fs.createReadStream(filename))
        await fs.promises.unlink(filename)

        return { success: true, data: data }
    } catch (e) {
        return { success: false, error: e.toString() }
    }
}

export { PackageInfo, import_zipped_package }
