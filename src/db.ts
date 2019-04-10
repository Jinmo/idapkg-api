import * as mongoose from 'mongoose';
import * as bcrypt from 'bcrypt';

// Schema and model definitions

const PackageSchema = new mongoose.Schema({
    id: { type: String, unique: true, required: true, validate: /^[a-zA-Z0-9_\-]+$/ },
    // displayed name, short description
    name: { type: String, index: true, required: true },
    description: { type: String, required: true },
    // author must point User.userame
    author: { type: String, required: true },
    // latest version
    version: { type: String, required: true },
    // long description
    readme: String,
    // indexing for compatibility searching
    compat_win: Boolean,
    compat_linux: Boolean,
    compat_mac: Boolean,
    // info.json
    metadata: { type: Object, default: {} }
});

// PackageSchema only refers latest version
// ReleaseSchema stores all versions
const ReleaseSchema = new mongoose.Schema({
    package: {type: mongoose.Schema.Types.ObjectId, ref: 'Package'},
    version: {type: String, required: true},
    createdAt: {
        type: Date,
        default: Date.now
    }
})

const SALT_WORK_FACTOR = 10;

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, validate: /^[a-zA-Z0-9._\-]{5,}$/ },
    password: { type: String, required: true, validate: /^.{8,}$/ },
    email: {type: String, required: true, validate: /@/},
    createdAt: {
        type: Date,
        default: Date.now
    }
});

UserSchema.pre('save', function(next: any) {
    var user: any = this;

    if (!user.isModified('password')) return next();

    bcrypt.genSalt(SALT_WORK_FACTOR, (err, salt) => {
        if (err) return next(err);

        bcrypt.hash(user.password, salt, (err, hash) => {
            if (err) return next(err);

            user.password = hash;
            next();
        })
    })
})

UserSchema.methods.comparePassword = function(candidatePassword: string) {
    return new Promise(resolve => {
        bcrypt.compare(candidatePassword, this.password, function(err, isMatch) {
            if (err) throw err;
            resolve(isMatch);
        });
    })
};

const Package = mongoose.model('Package', PackageSchema);
const User = mongoose.model('User', UserSchema);
const Release = mongoose.model('Release', ReleaseSchema);

// Connect to database
const db = mongoose.connection;

db.once('open', () => {
    console.info("MongoDB connected!");
})

mongoose.connect('mongodb://localhost/test', { useNewUrlParser: true });

export { Package, User, Release, db };