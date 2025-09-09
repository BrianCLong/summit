// Retry known flakey tests once based on tag
const retry = parseInt(process.env.JEST_RETRY_TIMES || '0', 10);
if (retry > 0 && global.jest) {
  // @ts-ignore
  jest.retryTimes(retry, { logErrorsBeforeRetry: true });
}