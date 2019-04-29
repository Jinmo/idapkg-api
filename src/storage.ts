import * as AWS from 'aws-sdk';
import { Readable } from 'stream';

const CONFIG = {
    region: 'ap-northeast-2',
    bucket_name: 'idapkg',
    credentials: new AWS.SharedIniFileCredentials({profile: 'idapkg'})
}

const s3 = new AWS.S3({
    region: CONFIG.region,
    credentials: CONFIG.credentials
})

async function put(name: string, version: string, value: Buffer|Readable): Promise<void> {
    const key = `${name}==${version}.zip`
    await s3.putObject({
        Key: key,
        Body: value,
        Bucket: CONFIG.bucket_name
    }).promise()
}

async function get(name: string, version: string): Promise<string> {
    const key = `${name}==${version}.zip`
    const res = s3.getSignedUrl('getObject', {
        Key: key,
        Bucket: CONFIG.bucket_name
    })

    return res
}

export {put, get}