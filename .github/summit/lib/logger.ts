export function log(message: string, meta?: unknown) {
  if (meta === undefined) {
    console.log(message);
    return;
  }
  console.log(message, JSON.stringify(meta));
}
