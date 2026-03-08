"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Plugin = Plugin;
exports.RequiresPermission = RequiresPermission;
exports.Endpoint = Endpoint;
exports.WebhookHandler = WebhookHandler;
exports.ExtensionPoint = ExtensionPoint;
/**
 * Decorator to mark a class as a plugin
 */
function Plugin(config) {
    return function (target) {
        target.prototype.__pluginConfig = config;
        return target;
    };
}
/**
 * Decorator to request permissions
 */
function RequiresPermission(...permissions) {
    return function (target, propertyKey, descriptor) {
        const original = descriptor.value;
        descriptor.value = async function (...args) {
            // In runtime, this would check if permissions are granted
            // For now, just call the original method
            return original.apply(this, args);
        };
        return descriptor;
    };
}
/**
 * Decorator to mark a method as an API endpoint
 */
function Endpoint(config) {
    return function (target, propertyKey) {
        if (!target.constructor.prototype.__endpoints) {
            target.constructor.prototype.__endpoints = [];
        }
        target.constructor.prototype.__endpoints.push({
            ...config,
            handler: propertyKey.toString(),
        });
    };
}
/**
 * Decorator to mark a method as a webhook handler
 */
function WebhookHandler(event) {
    return function (target, propertyKey) {
        if (!target.constructor.prototype.__webhooks) {
            target.constructor.prototype.__webhooks = [];
        }
        target.constructor.prototype.__webhooks.push({
            event,
            handler: propertyKey.toString(),
        });
    };
}
/**
 * Decorator to provide an extension point
 */
function ExtensionPoint(config) {
    return function (target, propertyKey) {
        if (!target.constructor.prototype.__extensionPoints) {
            target.constructor.prototype.__extensionPoints = [];
        }
        target.constructor.prototype.__extensionPoints.push({
            ...config,
            handler: propertyKey.toString(),
        });
    };
}
