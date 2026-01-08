module.exports = function pLimit() {
    return (fn) => fn();
};
