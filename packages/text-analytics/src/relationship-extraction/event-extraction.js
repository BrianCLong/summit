"use strict";
/**
 * Event extraction
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventExtractor = void 0;
class EventExtractor {
    /**
     * Extract events from text
     */
    extract(text) {
        const events = [];
        // Simplified event extraction
        const eventPatterns = [
            /(\w+)\s+(attacked|met|visited|signed|announced)\s+(\w+)/gi,
        ];
        for (const pattern of eventPatterns) {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                events.push({
                    event: match[2],
                    eventType: 'action',
                    participants: [
                        { role: 'agent', entity: match[1] },
                        { role: 'patient', entity: match[3] },
                    ],
                    confidence: 0.7,
                });
            }
        }
        return events;
    }
    /**
     * Build timeline from events
     */
    buildTimeline(events) {
        return [];
    }
}
exports.EventExtractor = EventExtractor;
