"use strict";
/**
 * Cloud-agnostic object storage interface
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GCPStorageProvider = exports.AzureStorageProvider = exports.AWSStorageProvider = void 0;
var aws_storage_1 = require("./aws-storage");
Object.defineProperty(exports, "AWSStorageProvider", { enumerable: true, get: function () { return aws_storage_1.AWSStorageProvider; } });
var azure_storage_1 = require("./azure-storage");
Object.defineProperty(exports, "AzureStorageProvider", { enumerable: true, get: function () { return azure_storage_1.AzureStorageProvider; } });
var gcp_storage_1 = require("./gcp-storage");
Object.defineProperty(exports, "GCPStorageProvider", { enumerable: true, get: function () { return gcp_storage_1.GCPStorageProvider; } });
