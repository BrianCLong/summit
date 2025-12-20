let _open;

/**
 * Binds the decision preview opener function.
 * This allows the preview mechanism to be initialized with a specific implementation.
 *
 * @param opener - The function to call when opening a decision preview.
 */
export function bind(opener) {
  _open = opener;
}

/**
 * Opens the decision preview modal or panel.
 * Calls the bound opener function with the provided arguments.
 *
 * @param args - Arguments to pass to the opener (e.g., decision ID, context).
 */
export function openDecisionPreview(args) {
  _open?.(args);
}
