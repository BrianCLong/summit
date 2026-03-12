module.exports = async () => {
  if (global.__span) global.__span.end();
};
