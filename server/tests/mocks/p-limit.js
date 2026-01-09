const pLimit = (_concurrency) => {
  return async (fn) => Promise.resolve(fn());
};

module.exports = pLimit;
module.exports.default = pLimit;
