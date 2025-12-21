/**
 * Codemod to replace console.* calls with the structured logger.
 *
 * Usage:
 *   npx jscodeshift -t tools/codemods/replace-console-with-logger.js <files> --loggerIdentifier=appLogger
 */

module.exports = function transformer(file, api, options) {
  const j = api.jscodeshift;
  const loggerIdentifier = options.loggerIdentifier || 'logger';
  const validMethods = new Set(['log', 'info', 'warn', 'error', 'debug']);

  const root = j(file.source);
  let transformed = false;

  root
    .find(j.MemberExpression, {
      object: { type: 'Identifier', name: 'console' },
      property: { type: 'Identifier' },
    })
    .filter((path) => validMethods.has(path.node.property.name))
    .forEach((path) => {
      path.node.object = j.identifier(loggerIdentifier);
      transformed = true;
    });

  if (!transformed) {
    return null;
  }

  return root.toSource({ quote: 'single' });
};

module.exports.parser = 'tsx';
