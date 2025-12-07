
declare module 'isomorphic-dompurify' {
  const DOMPurify: any;
  export default DOMPurify;
}

declare namespace DOMPurify {
  type Config = any;
}

declare module 'validator' {
  const validator: any;
  export default validator;
}

declare namespace validator {
  type UUIDVersion = any;
}

declare module 'zod' {
  export const z: any;
  export type ZodError = any;
  export type ZodSchema<T = any> = any;
  export type ZodType<T = any> = any;
  export interface ZodTypeDef { }
}
