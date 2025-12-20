let _open;
export function bind(opener) {
  _open = opener;
}
export function openDecisionPreview(args) {
  _open?.(args);
}
