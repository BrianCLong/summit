"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.forecastBehavior = forecastBehavior;
const child_process_1 = require("child_process");
function forecastBehavior(plan) {
    const pyCode = `
import torch
lstm = torch.nn.LSTM(1,1)
print('Altered timelines')
  `;
    return (0, child_process_1.execSync)(`python -c "${pyCode}"`).toString();
}
