"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
const logger_js_1 = require("../config/logger.js");
class Logger {
    log;
    constructor(context) {
        this.log = logger_js_1.logger.child({ context });
    }
    info(message, ...args) {
        this.log.info(message, ...args);
    }
    error(message, ...args) {
        this.log.error(message, ...args);
    }
    warn(message, ...args) {
        this.log.warn(message, ...args);
    }
    debug(message, ...args) {
        this.log.debug(message, ...args);
    }
}
exports.Logger = Logger;
