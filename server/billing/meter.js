"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.usage = void 0;
exports.recordUsage = recordUsage;
const prom_client_1 = __importDefault(require("prom-client"));
exports.usage = new prom_client_1.default.Counter({
    name: 'usage_api_calls',
    help: 'API calls',
    labelNames: ['tenant'],
});
async function recordUsage(db, tenantId, key = 'api_calls_per_day') {
    await db.none('insert into quota_usage(tenant_id,key,period,used) values($1,$2,current_date,1)\                 on conflict (tenant_id,key,period) do update set used=quota_usage.used+1', [tenantId, key]);
    exports.usage.inc({ tenant: tenantId });
}
