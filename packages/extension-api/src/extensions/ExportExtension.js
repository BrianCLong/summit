"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseExportExtension = void 0;
class BaseExportExtension {
    id;
    format;
    mimeType;
    fileExtension;
    type = 'export';
    constructor(id, format, mimeType, fileExtension) {
        this.id = id;
        this.format = format;
        this.mimeType = mimeType;
        this.fileExtension = fileExtension;
    }
}
exports.BaseExportExtension = BaseExportExtension;
