const React = require('react');

const Grid2 = React.forwardRef(function Grid2({ children, ...props }, ref) {
  return React.createElement('div', { ref, ...props }, children);
});

module.exports = Grid2;
module.exports.default = Grid2;
