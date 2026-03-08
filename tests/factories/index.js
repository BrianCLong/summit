"use strict";
/**
 * Test Data Factories
 *
 * This module provides factory functions for generating consistent
 * test data across the test suite.
 *
 * Usage:
 *   import { userFactory, entityFactory, investigationFactory } from '@tests/factories';
 *
 *   const user = userFactory({ email: 'test@example.com' });
 *   const entity = entityFactory({ type: 'person' });
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(require("./userFactory"), exports);
__exportStar(require("./entityFactory"), exports);
__exportStar(require("./investigationFactory"), exports);
__exportStar(require("./relationshipFactory"), exports);
__exportStar(require("./graphFactory"), exports);
__exportStar(require("./requestFactory"), exports);
__exportStar(require("./contextFactory"), exports);
