"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PluginPermission = exports.PluginSignatureSchema = exports.PluginManifestSchema = exports.PluginState = void 0;
const schema_js_1 = require("../manifest/schema.js");
Object.defineProperty(exports, "PluginManifestSchema", { enumerable: true, get: function () { return schema_js_1.PluginManifestSchema; } });
Object.defineProperty(exports, "PluginSignatureSchema", { enumerable: true, get: function () { return schema_js_1.PluginSignatureSchema; } });
const permissions_js_1 = require("./permissions.js");
Object.defineProperty(exports, "PluginPermission", { enumerable: true, get: function () { return permissions_js_1.PluginPermission; } });
/**
 * Plugin lifecycle states
 */
var PluginState;
(function (PluginState) {
    PluginState["UNLOADED"] = "unloaded";
    PluginState["LOADING"] = "loading";
    PluginState["LOADED"] = "loaded";
    PluginState["INITIALIZING"] = "initializing";
    PluginState["ACTIVE"] = "active";
    PluginState["PAUSED"] = "paused";
    PluginState["ERROR"] = "error";
    PluginState["UNLOADING"] = "unloading";
})(PluginState || (exports.PluginState = PluginState = {}));
