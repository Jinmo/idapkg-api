import { Typegoose, Ref, prop, pre, instanceMethod, index, arrayProp } from 'typegoose';
import * as mongoose from 'mongoose';
import * as bcrypt from 'bcrypt';

// Schema definitions
// PackageSchema only refers latest version
class Package extends Typegoose {
    @prop({ unique: true, required: true, validate: /^[a-zA-Z0-9_\-]+$/ })
    id?: string;

    // author must point User.userame
    @prop({ required: true })
    author?: string;

    @prop({ index: true, required: true })
    name?: string;

    @prop({ required: true })
    description?: string;

    // <id, version> must point Release<.package, .version>
    @prop({ required: true })
    version?: string;

    // README.md
    @prop()
    readme?: string

    @arrayProp({ items: String })
    tags?: string[]

    // info.json
    @prop({ default: {} })
    metadata?: object

    @prop({ required: true })
    createdAt?: Date

    @prop({ required: true })
    updatedAt?: Date
};

// ReleaseSchema stores all versions
@index({ package: 1, version: 1 })
class Release extends Typegoose {
    @prop()
    package?: Ref<Package>

    @prop({ required: true })
    version?: string

    @prop({ default: Date.now })
    createdAt?: Date

    // Currently there is no release-specific metadata,
    // since I think that Release <-> File storage should be 1:1 matching.
}

@pre<User>('save', async function (next: any) {
    const SALT_WORK_FACTOR = 10;

    var user: any = this;

    if (!user.isModified('password')) return next();

    try {
        const salt = await bcrypt.genSalt(SALT_WORK_FACTOR)
        const hash = await bcrypt.hash(user.password, salt)

        user.password = hash;
        next();
    } catch (e) {
        next(e);
    }
})
class User extends Typegoose {
    @prop({ required: true, unique: true, validate: /^[a-zA-Z0-9._\-]{2,}$/ })
    username?: string;

    @prop({ required: true, validate: /^.{8,}$/ })
    password?: string;

    @prop({ required: true, validate: /@/ })
    email?: string;

    @prop({ default: Date.now })
    createdAt?: Date;

    @instanceMethod
    comparePassword(this: InstanceType<any>, candidatePassword: string) {
        return new Promise(resolve => {
            bcrypt.compare(candidatePassword, this.password, function (err, isMatch) {
                if (err) throw err;
                resolve(isMatch);
            });
        })
    };
};

// Connect to database
const db = mongoose.connection;

db.once('open', () => console.info("MongoDB connected!"))

mongoose.connect('mongodb://localhost/test', { useNewUrlParser: true, useFindAndModify: false, useCreateIndex: true });

const PackageModel = new Package().getModelForClass(Package)
const UserModel = new User().getModelForClass(User)
const ReleaseModel = new Release().getModelForClass(Release)

export { PackageModel as Package, UserModel as User, ReleaseModel as Release, db };