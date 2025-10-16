const { SchemaRegistry } = require('./schemaRegistry');
const { LineageSink } = require('./lineageSink');
const {
  applyPolicies,
  reversePolicies,
  enforceResidency,
  getMetadata,
} = require('./policyHooks');

module.exports = {
  SchemaRegistry,
  LineageSink,
  policy: {
    applyPolicies,
    reversePolicies,
    enforceResidency,
    getMetadata,
  },
};
