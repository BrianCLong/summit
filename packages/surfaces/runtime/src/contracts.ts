// TODO: Needs full implementation after verification.

export interface SurfaceContext {
  token?: string;
  theme?: string;
  config?: Record<string, any>;
}

export interface SurfaceManifest {
  id: string;
  version: string;
  entry: string;
}

export interface SurfaceModule {
  mount(el: HTMLElement, context: SurfaceContext): void;
  unmount(el: HTMLElement): void;
  getManifest(): SurfaceManifest;
}
