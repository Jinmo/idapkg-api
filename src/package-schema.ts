import { Schema } from 'jsonschema'

const PACKAGE_SCHEMA: Schema = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "object",
    "title": "The Root Schema",
    "required": [
        "_id",
        "name",
        "version",
        "description"
    ],
    "properties": {
        "_id": {
            "type": "string",
            "title": "actual path name",
            "pattern": "^[a-zA-Z0-9\\-][a-zA-Z0-9_\\-]{3,214}$"
        },
        "name": {
            "type": "string",
            "title": "The Name Schema",
            "pattern": "^[^\\s].*[^\\s]$"
        },
        "version": {
            "type": "string",
            "title": "The Version Schema",
            "pattern": "^(?:0|[1-9]\\d*)\\.(?:0|[1-9]\\d*)\\.(?:0|[1-9]\\d*)(?:-[\\da-z-]+(?:\\.[\\da-z-]+)*)?(?:\\+[\\da-z-]+(?:\\.[\\da-z-]+)*)?$"
        },
        "installers": {
            "type": "array", "items": { "type": "string" }
        },
        "uninstallers": {
            "type": "array", "items": { "type": "string" }
        },
        "restart_required": {
            "type": "boolean"
        },
        "keywords": {
            "type": "array",
            "items": { "type": "string", "pattern": "^[\\w-_.]+$" },
            "uniqueItems": true
        },
        "description": {
            "type": "string",
            "title": "The Description Schema",
            "pattern": "^(.*)$"
        },
        "homepage": {
            "type": "string",
            "title": "The Homepage Schema",
            "pattern": "^http(s)?:\/\/[^\\s]*$"
        },
        "dependencies": {
            "type": "object",
            "patternProperties": {
                "^[a-zA-Z0-9\\-][a-zA-Z0-9_\\-]{3,214}$": {
                    "type": "string"
                }
            },
            "additionalProperties": false
        }
    }
}

export default PACKAGE_SCHEMA