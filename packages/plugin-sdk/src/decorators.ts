import { PluginPermission } from '@summit/plugin-system';

/**
 * Decorator to mark a class as a plugin
 */
export function Plugin(config: {
  id: string;
  name: string;
  version: string;
  description: string;
  category: string;
}): ClassDecorator {
  return function (target: any) {
    target.prototype.__pluginConfig = config;
    return target;
  };
}

/**
 * Decorator to request permissions
 */
export function RequiresPermission(...permissions: PluginPermission[]): MethodDecorator {
  return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    const original = descriptor.value;

    descriptor.value = async function (...args: any[]) {
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
export function Endpoint(config: {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
}): MethodDecorator {
  return function (target: any, propertyKey: string | symbol) {
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
export function WebhookHandler(event: string): MethodDecorator {
  return function (target: any, propertyKey: string | symbol) {
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
export function ExtensionPoint(config: { id: string; type: string }): MethodDecorator {
  return function (target: any, propertyKey: string | symbol) {
    if (!target.constructor.prototype.__extensionPoints) {
      target.constructor.prototype.__extensionPoints = [];
    }
    target.constructor.prototype.__extensionPoints.push({
      ...config,
      handler: propertyKey.toString(),
    });
  };
}
