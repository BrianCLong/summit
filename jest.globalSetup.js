const { trace, context } = require('@opentelemetry/api');
module.exports = async () => {
  global.__span = trace.getTracer('ci').startSpan('jest');
};
