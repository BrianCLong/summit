declare module 'uuid' {
  export function v4(): string;
  const uuid: { v4: typeof v4 };
  export default uuid;
}
