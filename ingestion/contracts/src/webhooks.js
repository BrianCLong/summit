"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookDispatcher = void 0;
const https_1 = require("https");
class WebhookDispatcher {
    send(url, payload) {
        const body = JSON.stringify(payload);
        return new Promise((resolve, reject) => {
            const req = (0, https_1.request)(url, { method: 'POST', headers: { 'Content-Type': 'application/json' } }, (res) => {
                resolve(res.statusCode ?? 0);
            });
            req.on('error', reject);
            req.write(body);
            req.end();
        });
    }
}
exports.WebhookDispatcher = WebhookDispatcher;
