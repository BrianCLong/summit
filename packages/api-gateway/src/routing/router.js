"use strict";
/**
 * Intelligent Request Router
 *
 * Handles route matching, path parameters, and request routing
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Router = void 0;
class Router {
    routes;
    compiledRoutes;
    constructor(routes) {
        this.routes = routes;
        this.compiledRoutes = routes.map(route => this.compileRoute(route));
    }
    match(path, method) {
        for (const compiledRoute of this.compiledRoutes) {
            const methodMatch = !compiledRoute.method ||
                (Array.isArray(compiledRoute.method)
                    ? compiledRoute.method.includes(method)
                    : compiledRoute.method === method);
            if (methodMatch && compiledRoute.pattern.test(path)) {
                return compiledRoute.route;
            }
        }
        return null;
    }
    addRoute(route) {
        this.routes.push(route);
        this.compiledRoutes.push(this.compileRoute(route));
    }
    removeRoute(path) {
        const index = this.routes.findIndex(r => r.path === path);
        if (index !== -1) {
            this.routes.splice(index, 1);
            this.compiledRoutes.splice(index, 1);
        }
    }
    getRoutes() {
        return [...this.routes];
    }
    compileRoute(route) {
        // Convert path pattern to regex
        // Example: /api/v1/users/:id -> /^\/api\/v1\/users\/([^/]+)$/
        const pattern = route.path
            .replace(/:[^/]+/g, '([^/]+)')
            .replace(/\*/g, '.*');
        return {
            pattern: new RegExp(`^${pattern}$`),
            route,
            method: route.method,
        };
    }
}
exports.Router = Router;
