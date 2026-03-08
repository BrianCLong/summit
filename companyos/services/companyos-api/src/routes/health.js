"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthRoute = healthRoute;
function healthRoute(req, res) {
    res.json({
        status: 'ok',
        service: 'companyos-api',
        time: new Date().toISOString(),
    });
}
