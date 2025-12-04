
module.exports = (path, options) => {
  const resolver = options.defaultResolver;

  // console.error('Resolving:', path);

  try {
    return resolver(path, options);
  } catch (error) {
    if (path.endsWith('.js')) {
      // console.error('Failed to resolve .js, trying .ts for:', path);
      try {
        const tsPath = path.replace(/\.js$/, '.ts');
        const res = resolver(tsPath, options);
        // console.error('Resolved .ts:', res);
        return res;
      } catch (e2) {
        // console.error('Failed .ts:', tsPath);
        try {
          const tsxPath = path.replace(/\.js$/, '.tsx');
          return resolver(tsxPath, options);
        } catch (e3) {
          // ignore
        }
      }
    }
    throw error;
  }
};
