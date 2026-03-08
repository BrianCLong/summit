"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdmissionController = void 0;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const DEFAULT_QOS_PATH = process.env.QOS_CONFIG_PATH || node_path_1.default.resolve(process.cwd(), 'router/qos.yaml');
class AdmissionController {
    cfg;
    constructor(cfgPath = DEFAULT_QOS_PATH) {
        const raw = node_fs_1.default.readFileSync(cfgPath, 'utf8');
        this.cfg = js_yaml_1.default.load(raw);
    }
    effectiveExploreMax(cls, expert) {
        const o = cls.experts?.[expert]?.explore_max;
        return typeof o === 'number' ? o : cls.explore_max;
    }
    shouldAdmit(req, stats) {
        const cls = this.cfg.classes[req.tenantTier] || this.cfg.classes['default'];
        if (!cls) {
            return { ok: false, reason: `unknown tier: ${req.tenantTier}` };
        }
        const effExploreMax = this.effectiveExploreMax(cls, req.expert);
        if (req.exploration && stats.recentExploreRatio >= effExploreMax) {
            return {
                ok: false,
                reason: `exploration cap exceeded (${stats.recentExploreRatio.toFixed(3)} >= ${effExploreMax})`,
                suggest: { degrade: true, route: 'fallback' },
            };
        }
        return { ok: true };
    }
}
exports.AdmissionController = AdmissionController;
