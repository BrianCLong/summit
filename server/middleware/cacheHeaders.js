"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.withETag = withETag;
const crypto_1 = __importDefault(require("crypto"));
function withETag(ttl = 60, swr = 300) {
    return (req, res, next) => {
        res.setHeader('Cache-Control', `public, max-age=${ttl}, stale-while-revalidate=${swr}`);
        const _send = res.send.bind(res);
        res.send = ((body) => {
            const etag = 'W/"' + crypto_1.default.createHash('sha1').update(body).digest('hex') + '"';
            res.setHeader('ETag', etag);
            if (req.headers['if-none-match'] === etag) {
                res.status(304).end();
                return res;
            }
            return _send(body);
        });
        next();
    };
}
