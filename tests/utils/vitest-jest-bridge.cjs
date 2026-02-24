const jestGlobals = require('@jest/globals');

module.exports = {
  ...jestGlobals,
  vi: {
    fn: jestGlobals.jest.fn,
    spyOn: jestGlobals.jest.spyOn,
    mock: jestGlobals.jest.mock,
    resetAllMocks: jestGlobals.jest.resetAllMocks,
  },
};
