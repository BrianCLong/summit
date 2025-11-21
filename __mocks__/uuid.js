let counter = 0;
module.exports = {
  v4: () => `00000000-0000-4000-8000-${String(++counter).padStart(12, '0')}`,
  v1: () => `00000000-0000-1000-8000-${String(++counter).padStart(12, '0')}`,
};
