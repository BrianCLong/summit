import pino from 'pino';

const logger = pino({
  redact: {
    paths: ['req.headers.authorization', 'variables.*', 'data.*'],
    remove: true,
  },
});

export const redactLogs = () => ({
  async requestDidStart({ request, context }: any) {
    const logData: any = { op: request.operationName };
    if (context.traceId) {
      logData.trace_id = context.traceId;
    }
    if (context.spanId) {
      logData.span_id = context.spanId;
    }
    logger.info(logData, 'op start');
  },
  async willSendResponse({ response, context }: any) {
    const logData: any = { status: response?.http?.status };
    if (context.traceId) {
      logData.trace_id = context.traceId;
    }
    if (context.spanId) {
      logData.span_id = context.spanId;
    }
    logger.info(logData, 'op done');
  },
});
