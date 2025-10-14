const path = require('path');

const CONTRACTS_DIR = path.join(__dirname, '..', 'contracts');

const ALLOWED_CLASSIFICATIONS = ['PII', 'Secret', 'Export-Controlled', 'Internal'];
const LOWER_ENVIRONMENTS = ['dev', 'test', 'qa', 'staging'];

module.exports = {
  CONTRACTS_DIR,
  ALLOWED_CLASSIFICATIONS,
  LOWER_ENVIRONMENTS
};
