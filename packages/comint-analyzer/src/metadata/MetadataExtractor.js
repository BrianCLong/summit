"use strict";
/**
 * Metadata Extractor - Communications metadata analysis
 * TRAINING/SIMULATION ONLY
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetadataExtractor = void 0;
const uuid_1 = require("uuid");
class MetadataExtractor {
    identifierNormalizers = new Map();
    constructor() {
        this.initializeNormalizers();
    }
    initializeNormalizers() {
        // Phone number normalizer
        this.identifierNormalizers.set('phone', (value) => {
            return value.replace(/[\s\-().]/g, '');
        });
        // Email normalizer
        this.identifierNormalizers.set('email', (value) => {
            return value.toLowerCase().trim();
        });
        // IP address normalizer
        this.identifierNormalizers.set('ip', (value) => {
            return value.trim();
        });
    }
    /**
     * Extract metadata from raw communication data
     */
    extractMetadata(rawData) {
        const source = this.extractIdentifier(rawData.headers?.['from'] || rawData.headers?.['source']);
        const destinations = this.extractDestinations(rawData.headers?.['to'] || rawData.headers?.['destination']);
        const metadata = {
            id: (0, uuid_1.v4)(),
            timestamp: new Date(rawData.headers?.['date'] || Date.now()),
            source,
            destination: destinations,
            cc: rawData.headers?.['cc'] ? this.extractDestinations(rawData.headers['cc']) : undefined,
            channel: this.inferChannel(rawData),
            direction: this.inferDirection(source),
            protocol: rawData.protocol || 'unknown',
            encrypted: this.detectEncryption(rawData),
            encryptionType: this.detectEncryptionType(rawData),
            size: rawData.content?.length || rawData.binary?.length || 0,
            capturePoint: 'TRAINING-SIMULATOR',
            processingPath: ['MetadataExtractor'],
            isSimulated: true
        };
        return metadata;
    }
    /**
     * Generate simulated CDRs for training
     */
    generateSimulatedCDR(params) {
        const startTime = new Date(Date.now() - Math.random() * 86400000);
        const duration = Math.floor(10 + Math.random() * 600);
        return {
            id: (0, uuid_1.v4)(),
            source: this.generateSimulatedIdentifier(params?.sourceType || 'phone'),
            destination: this.generateSimulatedIdentifier(params?.sourceType || 'phone'),
            startTime,
            endTime: new Date(startTime.getTime() + duration * 1000),
            duration,
            callType: params?.callType || 'voice',
            status: 'completed',
            cellTowers: this.generateSimulatedCellTowers(),
            isSimulated: true
        };
    }
    /**
     * Extract and normalize identifier
     */
    extractIdentifier(value) {
        if (!value) {
            return { type: 'unknown', value: 'unknown', confidence: 0 };
        }
        const type = this.inferIdentifierType(value);
        const normalizer = this.identifierNormalizers.get(type);
        return {
            type,
            value,
            normalized: normalizer ? normalizer(value) : value,
            confidence: 0.8 + Math.random() * 0.15
        };
    }
    extractDestinations(value) {
        if (!value)
            return [];
        // Handle comma-separated destinations
        const parts = value.split(',').map(p => p.trim()).filter(p => p);
        return parts.map(p => this.extractIdentifier(p));
    }
    inferIdentifierType(value) {
        if (/@/.test(value))
            return 'email';
        if (/^\+?\d{7,}$/.test(value.replace(/[\s\-().]/g, '')))
            return 'phone';
        if (/^\d{1,3}(\.\d{1,3}){3}$/.test(value))
            return 'ip';
        if (/^[A-F0-9]{2}(:[A-F0-9]{2}){5}$/i.test(value))
            return 'mac';
        if (/^\d{15}$/.test(value))
            return 'imei';
        if (/^\d{15,16}$/.test(value))
            return 'imsi';
        return 'unknown';
    }
    inferChannel(rawData) {
        const protocol = rawData.protocol?.toLowerCase() || '';
        if (protocol.includes('sip') || protocol.includes('voip')) {
            return { type: 'voip', technology: 'SIP' };
        }
        if (protocol.includes('smtp') || protocol.includes('email')) {
            return { type: 'email', technology: 'SMTP' };
        }
        if (protocol.includes('sms')) {
            return { type: 'sms', technology: 'GSM' };
        }
        return { type: 'unknown' };
    }
    inferDirection(_source) {
        // Would use network topology in real implementation
        return 'unknown';
    }
    detectEncryption(rawData) {
        const headers = rawData.headers;
        if (headers?.['content-type']?.includes('encrypted'))
            return true;
        if (headers?.['x-encryption'])
            return true;
        return false;
    }
    detectEncryptionType(rawData) {
        const headers = rawData.headers;
        return headers?.['x-encryption-type'];
    }
    generateSimulatedIdentifier(type) {
        let value;
        switch (type) {
            case 'phone':
                value = `+1${Math.floor(2000000000 + Math.random() * 7999999999)}`;
                break;
            case 'email':
                value = `user${Math.floor(Math.random() * 10000)}@training.example`;
                break;
            case 'ip':
                value = `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
                break;
            default:
                value = `ENTITY-${(0, uuid_1.v4)().slice(0, 8)}`;
        }
        return {
            type,
            value,
            normalized: value,
            confidence: 0.95
        };
    }
    generateSimulatedCellTowers() {
        const count = 1 + Math.floor(Math.random() * 3);
        const towers = [];
        for (let i = 0; i < count; i++) {
            towers.push({
                id: `TOWER-${Math.floor(Math.random() * 100000)}`,
                location: {
                    latitude: 38 + Math.random() * 2,
                    longitude: -77 + Math.random() * 2,
                    accuracy: 100 + Math.random() * 500,
                    method: 'simulated',
                    timestamp: new Date()
                },
                signalStrength: -50 - Math.random() * 50
            });
        }
        return towers;
    }
}
exports.MetadataExtractor = MetadataExtractor;
