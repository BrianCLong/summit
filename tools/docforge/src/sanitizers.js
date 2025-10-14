function sanitizeId(input) {
  return input
    .replace(/\\/g, '/')
    .replace(/[^a-zA-Z0-9/_-]/g, '_')
    .replace(/[\/]/g, '__');
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

module.exports = {
  sanitizeId,
  slugify
};
