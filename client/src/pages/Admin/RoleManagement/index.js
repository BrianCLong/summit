"use strict";
/**
 * Role Management Module
 *
 * Exports all role management components.
 *
 * @module pages/Admin/RoleManagement
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermissionMatrix = exports.RoleEditor = exports.RoleList = void 0;
var RoleList_1 = require("./RoleList");
Object.defineProperty(exports, "RoleList", { enumerable: true, get: function () { return __importDefault(RoleList_1).default; } });
var RoleEditor_1 = require("./RoleEditor");
Object.defineProperty(exports, "RoleEditor", { enumerable: true, get: function () { return __importDefault(RoleEditor_1).default; } });
var PermissionMatrix_1 = require("./PermissionMatrix");
Object.defineProperty(exports, "PermissionMatrix", { enumerable: true, get: function () { return __importDefault(PermissionMatrix_1).default; } });
