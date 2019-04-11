import { promisify } from 'util'
import * as child_process from 'child_process'
import * as which from 'which'
import * as fs from 'fs'
import { Validator, ValidatorResult, validate } from 'jsonschema';
import * as storage from './storage'
import { Package, Release } from './db';
import PACKAGE_SCHEMA from './package-schema';

const execFile = promisify(child_process.execFile)
const PYTHON_EXECUTABLE = which.sync('python');

interface Entry {
    path: string,
    os?: string | string[],
    ida_version?: string,
    ea?: number[]
};

interface PackageInfo {
    name: string,
    version: string,
    description: string,
    author: string,
    homepage?: string,
    installers?: Entry[]
};

function select_entry(entries: Entry[], current_os?: string) {
    return entries;
}

// This class wraps zipfile in python
class ZipReader {
    zip_path: string
    constructor(filename: string) {
        this.zip_path = filename
    }
    async get(filename: string): Promise<Buffer> {
        const { stdout } = await execFile(PYTHON_EXECUTABLE, ['zipextract.py', this.zip_path, filename], { encoding: 'buffer' })
        return stdout
    }
}

function validate_info(info: any): ValidatorResult {
    const v = new Validator()
    return v.validate(info, PACKAGE_SCHEMA)
}

async function import_zipped_package(owner: string, filename: string) {
    const z = new ZipReader(filename)
    const info = JSON.parse((await z.get('info.json')).toString('utf-8'))

    const res = validate_info(info)

    if (!res.valid) {
        return { success: false, error: "info.json validation error:\n  " + res.errors.map(x => x.toString()).join('\n  ') }
    }

    const data: any = {
        id: info._id,
        name: info.name,
        version: info.version,
        description: info.description,
        author: info.author,
        compat_win: false,
        compat_mac: false,
        compat_linux: false,
        readme: (await z.get('README.md')).toString('utf-8'),
        metadata: info
    };

    ['win', 'mac', 'linux'].forEach((os: string) => {
        data['compat_' + os] = !!select_entry(data, os);
    })

    try {
        const existing: any = await Package.findOne({ id: info._id })
        let package_id = null;

        if (existing) {
            // TODO: check if package with version exists
            Object.assign(existing, data)
            const item: any = await Package.findOneAndUpdate({ id: info._id }, data, { upsert: false })
            if(!item) {
                return {success: false, error: 'internal server error'};
            }
            package_id = item._id;
        } else {
            const pkg = new Package(data)
            const res = await pkg.save()
            package_id = res._id;
        }
        if(!package_id) {
            return {success: false, error: "internal server error: package id not found"}
        }
        await (new Release({ package: package_id, version: data.version, spec: 'any' })).save()

        // try to save and unlink temporary file
        await storage.put(data.id, data.version, await fs.promises.readFile(filename))
        await fs.promises.unlink(filename)

        return { success: true, data: data }
    } catch (e) {
        return { success: false, error: e.toString() }
    }
}

export { PackageInfo, select_entry, Entry, import_zipped_package }