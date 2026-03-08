"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyTariffToRequest = applyTariffToRequest;
const gateway_tariff_1 = require("@intelgraph/gateway-tariff");
function applyTariffToRequest(sig) {
    const t = (0, gateway_tariff_1.tariff)(sig);
    return {
        enforce: async () => {
            if (t.throttleMs)
                await new Promise((r) => setTimeout(r, t.throttleMs));
            return t;
        },
    };
}
