"use strict";
/**
 * Signal Generator - Creates simulated signals for training
 * TRAINING/SIMULATION ONLY
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SignalGenerator = void 0;
const uuid_1 = require("uuid");
class SignalGenerator {
    config;
    random;
    // Training data sets
    sampleCallsigns = [
        'ALPHA-1', 'BRAVO-2', 'CHARLIE-3', 'DELTA-4', 'ECHO-5',
        'FOXTROT-6', 'GOLF-7', 'HOTEL-8', 'INDIA-9', 'JULIET-0'
    ];
    sampleLocations = [
        { name: 'Location Alpha', lat: 38.8977, lon: -77.0365 },
        { name: 'Location Bravo', lat: 51.5074, lon: -0.1278 },
        { name: 'Location Charlie', lat: 48.8566, lon: 2.3522 },
        { name: 'Location Delta', lat: 35.6762, lon: 139.6503 },
        { name: 'Location Echo', lat: -33.8688, lon: 151.2093 }
    ];
    sampleRadarTypes = [
        { name: 'SEARCH-A', type: 'RADAR_SEARCH', freq: 1.3e9, prf: 400 },
        { name: 'TRACK-B', type: 'RADAR_TRACK', freq: 9.4e9, prf: 2000 },
        { name: 'FC-C', type: 'RADAR_FIRE_CONTROL', freq: 15e9, prf: 5000 },
        { name: 'NAV-D', type: 'RADAR_NAVIGATION', freq: 9.4e9, prf: 1000 },
        { name: 'HF-E', type: 'RADAR_HEIGHT_FINDER', freq: 2.9e9, prf: 500 }
    ];
    constructor(config = {}) {
        this.config = {
            seed: config.seed,
            realism: config.realism || 'MEDIUM',
            includeNoise: config.includeNoise ?? true,
            noiseFloor: config.noiseFloor || -100
        };
        // Simple seeded random for reproducibility
        this.random = config.seed
            ? this.seededRandom(config.seed)
            : Math.random.bind(Math);
    }
    seededRandom(seed) {
        let s = seed;
        return () => {
            s = Math.sin(s * 9999) * 10000;
            return s - Math.floor(s);
        };
    }
    generateRFSignal(params) {
        const freq = params.frequency || this.getTypicalFrequency(params.signalType);
        const modulation = this.getTypicalModulation(params.signalType);
        const metadata = {
            id: (0, uuid_1.v4)(),
            timestamp: new Date(),
            signalType: params.signalType,
            category: this.inferCategory(params.signalType),
            classification: params.classification || 'UNCLASSIFIED',
            frequency: freq,
            bandwidth: this.getTypicalBandwidth(params.signalType),
            signalStrength: this.config.noiseFloor + 20 + this.random() * 50,
            snr: 10 + this.random() * 30,
            modulation,
            collectorId: 'SIMULATOR',
            processed: false,
            priority: Math.ceil(this.random() * 5),
            isSimulated: true
        };
        const iqData = this.generateIQData(freq, modulation, 2048);
        return {
            metadata,
            iqData,
            decodedContent: '[SIMULATED SIGNAL]'
        };
    }
    generateCOMINTMessage(params) {
        const participants = Array.from({ length: 2 + Math.floor(this.random() * 3) }, (_, i) => ({
            identifier: `ENTITY-${this.sampleCallsigns[Math.floor(this.random() * this.sampleCallsigns.length)]}`,
            role: i === 0 ? 'SENDER' : 'RECEIVER',
            location: this.random() > 0.5 ? this.randomLocation() : undefined
        }));
        const sampleContent = this.generateSampleContent(params.communicationType);
        return {
            id: (0, uuid_1.v4)(),
            timestamp: new Date(),
            sourceSignal: (0, uuid_1.v4)(),
            communicationType: params.communicationType,
            participants,
            content: {
                raw: '[SIMULATED - REDACTED]',
                transcription: sampleContent,
                language: params.language || 'en',
                summary: `Simulated ${params.communicationType} communication for training`
            },
            keywords: this.extractKeywords(sampleContent),
            entities: this.extractEntities(sampleContent),
            classification: params.classification || 'UNCLASSIFIED',
            minimized: false,
            isSimulated: true
        };
    }
    generateELINTReport(params) {
        const radarType = params?.emitterType
            ? this.sampleRadarTypes.find(r => r.type === params.emitterType) || this.sampleRadarTypes[0]
            : this.sampleRadarTypes[Math.floor(this.random() * this.sampleRadarTypes.length)];
        const location = this.randomLocation();
        return {
            id: (0, uuid_1.v4)(),
            timestamp: new Date(),
            emitterId: (0, uuid_1.v4)(),
            emitterType: radarType.type,
            parameters: {
                frequency: radarType.freq + (this.random() - 0.5) * 100e6,
                prf: radarType.prf + (this.random() - 0.5) * 100,
                pri: 1000000 / radarType.prf,
                pulseWidth: 0.5 + this.random() * 5,
                scanRate: 5 + this.random() * 30,
                scanType: ['CIRCULAR', 'SECTOR', 'TRACK'][Math.floor(this.random() * 3)],
                power: 60 + this.random() * 30
            },
            platform: {
                type: ['GROUND', 'NAVAL', 'AIRBORNE'][Math.floor(this.random() * 3)],
                designation: `PLATFORM-${Math.floor(this.random() * 1000)}`,
                nationality: 'UNKNOWN'
            },
            location: {
                latitude: location.latitude,
                longitude: location.longitude,
                accuracy: 100 + this.random() * 1000
            },
            threat: {
                level: ['LOW', 'MEDIUM', 'HIGH'][Math.floor(this.random() * 3)],
                assessment: 'Simulated threat assessment for training purposes'
            },
            classification: params?.classification || 'UNCLASSIFIED',
            isSimulated: true
        };
    }
    generateIQData(frequency, modulation, sampleCount) {
        const i = new Float32Array(sampleCount);
        const q = new Float32Array(sampleCount);
        const sampleRate = 1e6;
        for (let n = 0; n < sampleCount; n++) {
            const t = n / sampleRate;
            let signal;
            switch (modulation) {
                case 'AM':
                    signal = this.generateAM(t, frequency);
                    break;
                case 'FM':
                    signal = this.generateFM(t, frequency);
                    break;
                case 'PSK':
                case 'BPSK':
                    signal = this.generateBPSK(t, frequency, n);
                    break;
                case 'QPSK':
                    signal = this.generateQPSK(t, frequency, n);
                    break;
                case 'PULSE':
                    signal = this.generatePulse(t, frequency, n);
                    break;
                default:
                    signal = { i: Math.cos(2 * Math.PI * frequency * t), q: Math.sin(2 * Math.PI * frequency * t) };
            }
            // Add noise
            if (this.config.includeNoise) {
                signal.i += (this.random() - 0.5) * 0.1;
                signal.q += (this.random() - 0.5) * 0.1;
            }
            i[n] = signal.i;
            q[n] = signal.q;
        }
        return { i, q };
    }
    generateAM(t, fc) {
        const fm = 1000; // Message frequency
        const m = 0.5; // Modulation index
        const envelope = 1 + m * Math.sin(2 * Math.PI * fm * t);
        return {
            i: envelope * Math.cos(2 * Math.PI * fc * t),
            q: envelope * Math.sin(2 * Math.PI * fc * t)
        };
    }
    generateFM(t, fc) {
        const fm = 1000;
        const beta = 5; // Modulation index
        const phase = 2 * Math.PI * fc * t + beta * Math.sin(2 * Math.PI * fm * t);
        return { i: Math.cos(phase), q: Math.sin(phase) };
    }
    generateBPSK(t, fc, n) {
        const symbol = n % 100 < 50 ? 1 : -1;
        const phase = 2 * Math.PI * fc * t;
        return { i: symbol * Math.cos(phase), q: symbol * Math.sin(phase) };
    }
    generateQPSK(t, fc, n) {
        const symbols = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
        const symbol = symbols[Math.floor(n / 50) % 4];
        const phase = 2 * Math.PI * fc * t;
        return {
            i: symbol[0] * Math.cos(phase) - symbol[1] * Math.sin(phase),
            q: symbol[0] * Math.sin(phase) + symbol[1] * Math.cos(phase)
        };
    }
    generatePulse(t, fc, n) {
        const pulseWidth = 50; // samples
        const pri = 500; // samples
        const inPulse = (n % pri) < pulseWidth;
        if (!inPulse)
            return { i: 0, q: 0 };
        const phase = 2 * Math.PI * fc * t;
        return { i: Math.cos(phase), q: Math.sin(phase) };
    }
    getTypicalFrequency(signalType) {
        const freqMap = {
            'CELLULAR_2G': 900e6,
            'CELLULAR_3G': 2100e6,
            'CELLULAR_4G': 1800e6,
            'CELLULAR_5G': 3500e6,
            'WIFI': 2437e6,
            'BLUETOOTH': 2440e6,
            'VHF': 150e6,
            'UHF': 450e6,
            'RADAR': 9400e6,
            'SATELLITE': 12500e6,
            'SHORTWAVE': 15e6
        };
        return freqMap[signalType] || 100e6;
    }
    getTypicalModulation(signalType) {
        const modMap = {
            'RF_ANALOG': 'FM',
            'RF_DIGITAL': 'QPSK',
            'CELLULAR_2G': 'GMSK',
            'CELLULAR_3G': 'QPSK',
            'CELLULAR_4G': 'OFDM',
            'CELLULAR_5G': 'OFDM',
            'WIFI': 'OFDM',
            'RADAR': 'PULSE',
            'BROADCAST': 'FM'
        };
        return modMap[signalType] || 'UNKNOWN';
    }
    getTypicalBandwidth(signalType) {
        const bwMap = {
            'CELLULAR_2G': 200e3,
            'CELLULAR_3G': 5e6,
            'CELLULAR_4G': 20e6,
            'CELLULAR_5G': 100e6,
            'WIFI': 20e6,
            'VHF': 25e3,
            'UHF': 25e3,
            'RADAR': 2e6
        };
        return bwMap[signalType] || 25e3;
    }
    inferCategory(signalType) {
        if (['RADAR', 'NAVIGATION', 'TELEMETRY'].includes(signalType))
            return 'ELINT';
        return 'COMINT';
    }
    randomLocation() {
        const loc = this.sampleLocations[Math.floor(this.random() * this.sampleLocations.length)];
        return {
            latitude: loc.lat + (this.random() - 0.5) * 0.1,
            longitude: loc.lon + (this.random() - 0.5) * 0.1
        };
    }
    generateSampleContent(type) {
        const samples = {
            VOICE: [
                '[SIMULATED] Audio intercept - Training scenario alpha',
                '[SIMULATED] Voice communication - Exercise traffic',
                '[SIMULATED] Radio transmission - Drill message'
            ],
            SMS: [
                '[SIMULATED] Text message content for training',
                '[SIMULATED] SMS intercept - Exercise data'
            ],
            EMAIL: [
                '[SIMULATED] Email content - Training purposes only',
                '[SIMULATED] Electronic mail - Exercise scenario'
            ],
            RADIO: [
                '[SIMULATED] Radio traffic - Training exercise',
                '[SIMULATED] HF transmission - Drill communication'
            ]
        };
        const options = samples[type] || samples.VOICE;
        return options[Math.floor(this.random() * options.length)];
    }
    extractKeywords(content) {
        return ['SIMULATED', 'TRAINING', 'EXERCISE'];
    }
    extractEntities(content) {
        return [
            { text: 'Training Entity', type: 'ORGANIZATION', confidence: 0.95 }
        ];
    }
}
exports.SignalGenerator = SignalGenerator;
//# sourceMappingURL=SignalGenerator.js.map