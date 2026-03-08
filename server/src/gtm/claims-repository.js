"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClaimsRepository = void 0;
// @ts-nocheck
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const json2csv_1 = require("json2csv");
const DEFAULT_BASE_PATH = path_1.default.resolve(process.cwd(), 'docs/gtm/claims');
class ClaimsRepository {
    claimsPath;
    csvPath;
    constructor(basePath = DEFAULT_BASE_PATH) {
        this.claimsPath = path_1.default.join(basePath, 'claims.json');
        this.csvPath = path_1.default.join(basePath, 'claims.csv');
    }
    async init() {
        await fs_1.promises.mkdir(path_1.default.dirname(this.claimsPath), { recursive: true });
        try {
            await fs_1.promises.access(this.claimsPath);
        }
        catch {
            await this.saveClaims([]);
        }
    }
    async loadClaims() {
        await this.init();
        const raw = await fs_1.promises.readFile(this.claimsPath, 'utf8');
        const claims = JSON.parse(raw);
        return claims.map((claim) => ({ ...claim, channels: [...new Set(claim.channels)] }));
    }
    async saveClaims(claims) {
        await fs_1.promises.mkdir(path_1.default.dirname(this.claimsPath), { recursive: true });
        await fs_1.promises.writeFile(this.claimsPath, JSON.stringify(claims, null, 2));
        await this.writeCsv(claims);
    }
    async upsertClaim(updated) {
        const claims = await this.loadClaims();
        const existingIndex = claims.findIndex((claim) => claim.claimId === updated.claimId);
        if (existingIndex >= 0) {
            claims[existingIndex] = updated;
        }
        else {
            claims.push(updated);
        }
        await this.saveClaims(claims.sort((a, b) => a.claimId.localeCompare(b.claimId)));
    }
    async writeCsv(claims) {
        const parser = new json2csv_1.Parser({
            fields: [
                'claimId',
                'message',
                'evidenceType',
                'evidenceSource',
                'status',
                'reviewDate',
                'owner',
                'channels',
                'riskTier',
                'expiry',
                'publishedAt',
                'forwardLooking',
                'complianceSurface',
            ],
        });
        const csv = parser.parse(claims.map((claim) => ({
            ...claim,
            channels: claim.channels.join('|'),
            complianceSurface: claim.complianceSurface?.join('|'),
        })));
        await fs_1.promises.writeFile(this.csvPath, csv);
    }
}
exports.ClaimsRepository = ClaimsRepository;
