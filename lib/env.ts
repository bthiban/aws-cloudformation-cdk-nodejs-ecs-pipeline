import {
    resolve
} from "path"
import {
    config
} from "dotenv"
var dotenvExpand = require('dotenv-expand')
var environment = config({
    path: resolve(__dirname, "../.env")
});
dotenvExpand(environment);