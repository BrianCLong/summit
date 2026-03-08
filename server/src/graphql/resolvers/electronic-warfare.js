"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ElectronicWarfareService_js_1 = __importDefault(require("../../services/ElectronicWarfareService.js"));
const resolvers = {
    Query: {
        ewBattleSpace: () => {
            return ElectronicWarfareService_js_1.default.getBattleSpacePicture();
        },
        ewAnalyzeEMP: (_, args) => {
            return ElectronicWarfareService_js_1.default.analyzeEMPBlast({ lat: args.lat, lon: args.lon }, args.yieldKt);
        },
    },
    Mutation: {
        ewRegisterAsset: (_, args) => {
            const asset = {
                id: args.id,
                name: args.name,
                type: args.type,
                location: { lat: args.lat, lon: args.lon || 0 },
                capabilities: args.capabilities,
                maxPower: args.maxPower,
                frequencyRange: [args.minFreq, args.maxFreq],
                status: 'ACTIVE',
                activeProtection: [],
            };
            ElectronicWarfareService_js_1.default.registerAsset(asset);
            return asset;
        },
        ewDeployJammer: (_, args) => {
            return ElectronicWarfareService_js_1.default.deployJammer(args.assetId, args.targetFrequency, args.bandwidth, args.effect, args.durationSeconds);
        },
        ewStopJammer: (_, args) => {
            try {
                ElectronicWarfareService_js_1.default.stopJammer(args.missionId);
                return true;
            }
            catch (e) {
                return false;
            }
        },
        ewSimulateSignalDetection: (_, args) => {
            const signal = {
                id: `SIG-${Date.now()}`,
                frequency: args.frequency,
                bandwidth: args.bandwidth,
                power: args.power,
                modulation: args.modulation,
                type: args.type,
                location: args.lat ? { lat: args.lat, lon: args.lon || 0 } : undefined,
                timestamp: new Date(),
            };
            ElectronicWarfareService_js_1.default.detectSignal(signal);
            return signal;
        },
        ewTriangulateSignal: (_, args) => {
            return ElectronicWarfareService_js_1.default.triangulateSignal(args.signalId);
        },
        ewActivateProtection: (_, args) => {
            try {
                ElectronicWarfareService_js_1.default.activateProtection(args.assetId, args.measure);
                return true;
            }
            catch (e) {
                return false;
            }
        },
    },
};
exports.default = resolvers;
