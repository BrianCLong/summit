/**
 * Shared selectors for enforcing design token usage inside the design-system files.
 */
const sensitiveProps =
  '(margin|padding|gap|columnGap|rowGap|borderRadius|boxShadow|fontSize|lineHeight|zIndex)'

const literalWithoutTokens = {
  selector: `Property[key.name=/${sensitiveProps}/][value.type="Literal"]:not(:has(Literal[value=/^var\\(--ds-/])):not(:has(Literal[value=0]))`,
  message:
    'Use design tokens (var(--ds-*) or tokenVar helper) instead of literal spacing/radius/shadow values.',
}

const templateWithoutTokens = {
  selector: `Property[key.name=/${sensitiveProps}/][value.type="TemplateLiteral"]:not(:has(TemplateElement[value.raw=/--ds-/]))`,
  message:
    'Reference design tokens inside template literals (e.g. `${tokenVar("ds-space-md")}`).',
}

module.exports = {
  designTokenRestrictions: [literalWithoutTokens, templateWithoutTokens],
}
