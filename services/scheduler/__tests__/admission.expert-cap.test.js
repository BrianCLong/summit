"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const admission_controller_1 = require("../admission/admission-controller");
function writeQoS(tmp) {
    fs_1.default.writeFileSync(path_1.default.join(tmp, 'qos.yaml'), `
classes:
  business:
    explore_max: 0.08
    queue_target_sec: 10
    budget_overdraft_pct: 0
    experts:
      osint_analysis: { explore_max: 0.12 }
`);
    return path_1.default.join(tmp, 'qos.yaml');
}
test('uses per-expert cap when present', () => {
    const dir = fs_1.default.mkdtempSync(path_1.default.join(os_1.default.tmpdir(), 'qos-'));
    const ctrl = new admission_controller_1.AdmissionController(writeQoS(dir));
    const d = ctrl.shouldAdmit({ tenantTier: 'business', expert: 'osint_analysis', exploration: true }, {
        recentExploreRatio: 0.1,
        queueOldestAgeSec: 1,
        tenantBudgetRemaining: 1.0,
    });
    expect(d.ok).toBe(true);
});
