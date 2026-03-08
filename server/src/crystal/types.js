"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttachmentType = exports.PanelType = void 0;
var PanelType;
(function (PanelType) {
    PanelType["AGENT"] = "AGENT";
    PanelType["TERMINAL"] = "TERMINAL";
    PanelType["DIFF"] = "DIFF";
    PanelType["EDITOR"] = "EDITOR";
    PanelType["LOGS"] = "LOGS";
    PanelType["TOOLS"] = "TOOLS";
})(PanelType || (exports.PanelType = PanelType = {}));
var AttachmentType;
(function (AttachmentType) {
    AttachmentType["TEXT"] = "TEXT";
    AttachmentType["IMAGE"] = "IMAGE";
    AttachmentType["FILE"] = "FILE";
})(AttachmentType || (exports.AttachmentType = AttachmentType = {}));
