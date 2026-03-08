"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PluginPermission = void 0;
var PluginPermission;
(function (PluginPermission) {
    PluginPermission["READ_DATA"] = "read:data";
    PluginPermission["WRITE_DATA"] = "write:data";
    PluginPermission["EXECUTE_QUERIES"] = "execute:queries";
    PluginPermission["ACCESS_GRAPH"] = "access:graph";
    PluginPermission["NETWORK_ACCESS"] = "network:access";
    PluginPermission["FILE_SYSTEM"] = "filesystem:access";
    PluginPermission["DATABASE_ACCESS"] = "database:access";
    PluginPermission["API_ENDPOINTS"] = "api:endpoints";
    PluginPermission["UI_EXTENSIONS"] = "ui:extensions";
    PluginPermission["ANALYTICS"] = "analytics:access";
    PluginPermission["ML_MODELS"] = "ml:models";
    PluginPermission["WEBHOOKS"] = "webhooks:manage";
    PluginPermission["SCHEDULED_TASKS"] = "tasks:schedule";
})(PluginPermission || (exports.PluginPermission = PluginPermission = {}));
