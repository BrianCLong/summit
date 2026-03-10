"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var serverDescriptor_1 = require("../../packages/mcp-registry/src/model/serverDescriptor");
var fs_1 = __importDefault(require("fs"));
var path_1 = __importDefault(require("path"));
function checkRegistry() {
    console.log("Validating mock registry snapshot...");
    try {
        var snapshotPath = path_1.default.join(__dirname, '../../reports/mcp/registry.snapshot.json');
        if (!fs_1.default.existsSync(snapshotPath)) {
            console.warn("No snapshot found. Skipping check.");
            process.exit(0);
        }
        var data = fs_1.default.readFileSync(snapshotPath, 'utf8');
        var snapshot = JSON.parse(data);
        for (var _i = 0, snapshot_1 = snapshot; _i < snapshot_1.length; _i++) {
            var item = snapshot_1[_i];
            serverDescriptor_1.ServerDescriptor.parse(item);
        }
        console.log("Registry snapshot validation passed.");
    }
    catch (e) {
        console.error("Registry validation failed:", e);
        process.exit(1);
    }
}
checkRegistry();
