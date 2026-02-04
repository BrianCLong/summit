import { RedactionClass, DEFAULT_REDACTION_RULES } from "./classification";

export interface ToolManifest {
  tools: {
    [toolId: string]: {
      allowedContextSpaces: string[];
      allowedRedactionClasses: RedactionClass[];
    };
  };
}

/**
 * Redacts sensitive content based on allowed classes.
 * If a class is NOT in the allowed list, its patterns are applied to the text.
 */
export function redact(
  text: string,
  allowedClasses: RedactionClass[]
): string {
  let redactedText = text;

  for (const rule of DEFAULT_REDACTION_RULES) {
    if (!allowedClasses.includes(rule.class)) {
      redactedText = redactedText.replace(rule.pattern, rule.replacement);
    }
  }

  return redactedText;
}

/**
 * Validates a tool egress request against the tool's manifest.
 * Deny-by-default if the tool is not in the manifest.
 */
export function validateEgress(
  toolId: string,
  contextSpace: string,
  manifest: ToolManifest
): boolean {
  const toolEntry = manifest.tools?.[toolId];
  if (!toolEntry) return false;

  return toolEntry.allowedContextSpaces.includes(contextSpace);
}
