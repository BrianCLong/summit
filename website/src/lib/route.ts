export function isInternalPath(href: string) {
  return href.startsWith("/") && !href.startsWith("//");
}
