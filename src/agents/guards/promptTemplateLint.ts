export function lintPromptTemplate(template: string): void {
  if (/\|\s*safe\b/.test(template)) {
    throw new Error(
      "Disallowed template filter detected: '| safe' (template portability gate).",
    );
  }
}
