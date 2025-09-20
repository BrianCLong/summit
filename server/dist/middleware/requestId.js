import { randomUUID } from 'node:crypto';
export function requestId() {
    return (req, res, next) => {
        req.reqId = req.headers['x-request-id'] || randomUUID();
        res.setHeader('x-request-id', req.reqId);
        next();
    };
}
//# sourceMappingURL=requestId.js.map