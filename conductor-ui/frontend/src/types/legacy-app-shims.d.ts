// Common asset & JSON modules
declare module "*.css";
declare module "*.scss";
declare module "*.jpg" {
  const src: string;
  export default src;
}
declare module "*.jpeg" {
  const src: string;
  export default src;
}
declare module "*.gif" {
  const src: string;
  export default src;
}
declare module "*.json" {
  const value: any;
  export default value;
}

// Window config seen in legacy app too
declare global {
  interface Window {
    APP_CONFIG?: Record<string, unknown>;
  }
}
export {};
