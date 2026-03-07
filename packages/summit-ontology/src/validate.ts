export function validateNode(node: any): boolean {
  return typeof node === 'object' && typeof node.id === 'string' && typeof node.kind === 'string';
}
