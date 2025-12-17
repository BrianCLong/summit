/**
 * Intelligent Request Router
 *
 * Handles route matching, path parameters, and request routing
 */

export interface Backend {
  url: string;
  weight?: number;
  healthy?: boolean;
  metadata?: Record<string, any>;
}

export interface Route {
  path: string;
  method?: string | string[];
  backends: Backend[];
  middleware?: any[];
  version?: string;
  rateLimit?: {
    requests: number;
    window: number;
  };
  cache?: {
    enabled: boolean;
    ttl: number;
  };
}

export class Router {
  private routes: Route[];
  private compiledRoutes: CompiledRoute[];

  constructor(routes: Route[]) {
    this.routes = routes;
    this.compiledRoutes = routes.map(route => this.compileRoute(route));
  }

  match(path: string, method: string): Route | null {
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

  addRoute(route: Route): void {
    this.routes.push(route);
    this.compiledRoutes.push(this.compileRoute(route));
  }

  removeRoute(path: string): void {
    const index = this.routes.findIndex(r => r.path === path);
    if (index !== -1) {
      this.routes.splice(index, 1);
      this.compiledRoutes.splice(index, 1);
    }
  }

  getRoutes(): Route[] {
    return [...this.routes];
  }

  private compileRoute(route: Route): CompiledRoute {
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

interface CompiledRoute {
  pattern: RegExp;
  route: Route;
  method?: string | string[];
}
