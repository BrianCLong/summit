exports.Flags = {
  provLedger: process.env.FLAG_PROV_LEDGER === '1',
  lac: process.env.FLAG_LAC === '1',
  nlq: process.env.FLAG_NLQ === '1',
  ingest: process.env.FLAG_INGEST === '1',
  licenseReg: process.env.FLAG_LICENSE_REG === '1',
  cases: process.env.FLAG_CASES === '1',
  reports: process.env.FLAG_REPORTS === '1',
  opsPack: process.env.FLAG_OPS_PACK === '1',
  zktx: process.env.FLAG_ZKTX === '1',
  fedPlan: process.env.FLAG_FEDPLAN === '1',
  edgeKit: process.env.FLAG_EDGEKIT === '1',
};
