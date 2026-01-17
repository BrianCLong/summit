const pLimit = (_concurrency) => {
  return async (fn) => Promise.resolve(fn());
};

export default pLimit;
module.exports.default = pLimit;
