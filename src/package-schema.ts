import {Schema} from 'jsonschema'

const PACKAGE_SCHEMA: Schema = {
    "definitions": {
        "entry": {
            "type": "array",
            "title": "The Plugins Schema",
            "items": {
                "type": "object",
                "title": "The Items Schema",
                "required": [
                    "path"
                ],
                "properties": {
                    "path": {
                        "type": "string",
                        "title": "The Path Schema",
                        "pattern": "^(.*)$"
                    },
                    "ida_version": {
                        "type": "string",
                        "title": "Should match this IDA version",
                        "default": "*",
                        "pattern": "^(.*)$"
                    },
                    "os": {
                        "type": "array",
                        "title": "Should match this operating system (win/mac/linux or with ! prefix).",
                        "items": {
                            "type": "string",
                            "title": "The Items Schema",
                            "enum": [
                                "win", "mac", "linux",
                                "!win", "!mac", "!linux"
                            ]
                        }
                    },
                    "ea": {
                        "type": "array",
                        "title": "Should match this/these EA (ida64.exe: 64, ida.exe: 32)",
                        "default": null,
                        "items": {
                            "type": "integer",
                            "title": "The Items Schema",
                            "enum": [32, 64]
                        }
                    }
                }
            }
        }
    },
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
            "pattern": "^(.*)$"
        },
        "version": {
            "type": "string",
            "title": "The Version Schema",
            "pattern": "^(?:0|[1-9]\\d*)\\.(?:0|[1-9]\\d*)\\.(?:0|[1-9]\\d*)(?:-[\\da-z-]+(?:\\.[\\da-z-]+)*)?(?:\\+[\\da-z-]+(?:\\.[\\da-z-]+)*)?$"
        },
        "installers": { "$ref": "#/definitions/entry" },
        "description": {
            "type": "string",
            "title": "The Description Schema",
            "pattern": "^(.*)$"
        },
        "homepage": {
            "type": "string",
            "title": "The Homepage Schema",
            "pattern": "^(.*)$"
        }
    }
}

export default PACKAGE_SCHEMA