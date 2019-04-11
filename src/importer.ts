import { Package, db } from './db';
import { readdir, lstatSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';

import {PackageInfo} from './upload'

const PACKAGE_BASE = process.argv[2];

class DirEntry {
    constructor(base: string, file: string) {
        this.path = join(base, file);
        this.name = file;
    }
    info(): PackageInfo {
        const path = join(this.path, 'info.json');
        const json = JSON.parse(readFileSync(path).toString('utf-8'));

        this.validateJson(json)

        return json;
    }

    validateJson(obj: any): obj is PackageInfo {
        return true;
    }

    readme(): string {
        try {
            return readFileSync(join(this.path, 'README.md')).toString('utf-8');
        } catch (e) {
            console.error(e);
            return '';
        }
    }
    path: string;
    name: string;
};

readdir(PACKAGE_BASE, async (err, files) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }

    try {
        await db.dropCollection('packages');
    } catch(e) {
        console.warn(e)
    }

    await Package.insertMany(files
        .map(file => new DirEntry(PACKAGE_BASE, file))
        .filter((file: DirEntry) => {
            if (!lstatSync(file.path).isDirectory())
                return false;

            const info_path = join(file.path, 'info.json');

            if (existsSync(info_path))
                return lstatSync(info_path).isFile();
        })
        .map((file: DirEntry) => {
            console.info('Adding', file);

            const info = file.info();

            const data: any = {
                id: file.name,
                name: info.name,
                version: info.version,
                description: info.description,
                author: info.author,
                compat_win: false,
                compat_mac: false,
                compat_linux: false,
                readme: file.readme()
            };

            ['win', 'mac', 'linux'].forEach((os: string) => {
                data['compat_' + os] = false;
            })

            return data
        }))
    
    console.info('all done!')
    process.exit(0)
})
