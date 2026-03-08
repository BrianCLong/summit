"use strict";
/**
 * Segmentation Service
 *
 * Segments conversations into sessions, threads, and key turns.
 * Identifies topic boundaries, speaker changes, and conversation structure.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.segmentationService = exports.SegmentationService = void 0;
const logger_js_1 = require("../utils/logger.js");
const hash_js_1 = require("../utils/hash.js");
const time_js_1 = require("../utils/time.js");
const DEFAULT_OPTIONS = {
    sessionGapThreshold: 30000, // 30 seconds
    minUtterancesPerThread: 2,
    enableTopicSegmentation: true,
    enableKeyTurnDetection: true,
    keyTurnKeywords: [
        'important',
        'critical',
        'urgent',
        'deadline',
        'decision',
        'agree',
        'disagree',
        'confirm',
        'approve',
        'reject',
        'action item',
        'next steps',
        'follow up',
        'question',
        'concern',
        'issue',
        'problem',
        'solution',
    ],
};
class SegmentationService {
    log = (0, logger_js_1.createChildLogger)({ service: 'SegmentationService' });
    /**
     * Segment a transcript into threads and identify key turns
     */
    segment(transcript, options = {}) {
        const startTime = Date.now();
        const opts = { ...DEFAULT_OPTIONS, ...options };
        this.log.info({ transcriptId: transcript.id, utteranceCount: transcript.utterances.length }, 'Starting segmentation');
        // Identify sessions based on time gaps
        const sessions = this.identifySessions(transcript.utterances, opts.sessionGapThreshold);
        // Create threads from sessions and speaker patterns
        const threads = this.createThreads(transcript, sessions, opts);
        // Identify key turns
        const keyTurns = opts.enableKeyTurnDetection
            ? this.identifyKeyTurns(transcript.utterances, opts.keyTurnKeywords)
            : [];
        // Mark key turns in utterances
        for (const keyTurn of keyTurns) {
            keyTurn.isKeyTurn = true;
        }
        const processingTimeMs = Date.now() - startTime;
        this.log.info({
            transcriptId: transcript.id,
            threadCount: threads.length,
            sessionCount: sessions.length,
            keyTurnCount: keyTurns.length,
            processingTimeMs,
        }, 'Segmentation completed');
        return {
            threads,
            keyTurns,
            sessions,
            metadata: {
                totalThreads: threads.length,
                totalSessions: sessions.length,
                keyTurnCount: keyTurns.length,
                processingTimeMs,
            },
        };
    }
    /**
     * Identify sessions based on gaps between utterances
     */
    identifySessions(utterances, gapThreshold) {
        if (utterances.length === 0)
            return [];
        const sessions = [];
        let currentSession = {
            id: (0, hash_js_1.generateId)(),
            startTime: utterances[0].startTime,
            endTime: utterances[0].endTime,
            utteranceCount: 1,
        };
        for (let i = 1; i < utterances.length; i++) {
            const prevUtterance = utterances[i - 1];
            const currentUtterance = utterances[i];
            const gap = currentUtterance.startTime - prevUtterance.endTime;
            if (gap > gapThreshold) {
                // End current session and start new one
                sessions.push(currentSession);
                currentSession = {
                    id: (0, hash_js_1.generateId)(),
                    startTime: currentUtterance.startTime,
                    endTime: currentUtterance.endTime,
                    utteranceCount: 1,
                };
            }
            else {
                // Extend current session
                currentSession.endTime = currentUtterance.endTime;
                currentSession.utteranceCount++;
            }
        }
        // Add final session
        sessions.push(currentSession);
        return sessions;
    }
    /**
     * Create threads from transcript
     */
    createThreads(transcript, sessions, options) {
        const threads = [];
        // Create a thread for each session
        for (const session of sessions) {
            const sessionUtterances = transcript.utterances.filter((u) => u.startTime >= session.startTime && u.endTime <= session.endTime);
            if (sessionUtterances.length < (options.minUtterancesPerThread || 2)) {
                continue;
            }
            // Extract participants for this thread
            const participantMap = new Map();
            for (const utterance of sessionUtterances) {
                if (utterance.speakerLabel) {
                    const existing = transcript.participants.find((p) => p.speakerId === utterance.speakerLabel);
                    if (existing && !participantMap.has(existing.id)) {
                        participantMap.set(existing.id, existing);
                    }
                }
            }
            const timeRange = {
                start: new Date(session.startTime).toISOString(),
                end: new Date(session.endTime).toISOString(),
                duration: session.endTime - session.startTime,
            };
            const thread = {
                id: (0, hash_js_1.generateId)(),
                transcriptId: transcript.id,
                type: 'session',
                participants: Array.from(participantMap.values()),
                utteranceIds: sessionUtterances.map((u) => u.id),
                utteranceCount: sessionUtterances.length,
                timeRange,
                language: transcript.language,
                createdAt: (0, time_js_1.now)(),
            };
            // Extract topics/keywords if enabled
            if (options.enableTopicSegmentation) {
                const { topics, keywords } = this.extractTopicsAndKeywords(sessionUtterances);
                thread.topics = topics;
                thread.keywords = keywords;
            }
            threads.push(thread);
        }
        return threads;
    }
    /**
     * Identify key turns in the conversation
     */
    identifyKeyTurns(utterances, keywords) {
        const keyTurns = [];
        const lowerKeywords = keywords.map((k) => k.toLowerCase());
        for (const utterance of utterances) {
            const lowerContent = utterance.content.toLowerCase();
            // Check for keyword matches
            const hasKeyword = lowerKeywords.some((keyword) => lowerContent.includes(keyword));
            // Check for question marks (questions are often key turns)
            const isQuestion = utterance.content.includes('?');
            // Check for significant length (longer utterances may be more important)
            const isLong = utterance.content.split(/\s+/).length > 20;
            if (hasKeyword || isQuestion || isLong) {
                keyTurns.push(utterance);
            }
        }
        return keyTurns;
    }
    /**
     * Extract topics and keywords from utterances
     */
    extractTopicsAndKeywords(utterances) {
        const wordFrequency = new Map();
        const stopWords = new Set([
            'the',
            'a',
            'an',
            'is',
            'are',
            'was',
            'were',
            'be',
            'been',
            'being',
            'have',
            'has',
            'had',
            'do',
            'does',
            'did',
            'will',
            'would',
            'could',
            'should',
            'may',
            'might',
            'must',
            'shall',
            'can',
            'need',
            'dare',
            'ought',
            'used',
            'to',
            'of',
            'in',
            'for',
            'on',
            'with',
            'at',
            'by',
            'from',
            'as',
            'into',
            'through',
            'during',
            'before',
            'after',
            'above',
            'below',
            'between',
            'under',
            'again',
            'further',
            'then',
            'once',
            'here',
            'there',
            'when',
            'where',
            'why',
            'how',
            'all',
            'each',
            'few',
            'more',
            'most',
            'other',
            'some',
            'such',
            'no',
            'nor',
            'not',
            'only',
            'own',
            'same',
            'so',
            'than',
            'too',
            'very',
            'just',
            'and',
            'but',
            'if',
            'or',
            'because',
            'until',
            'while',
            'although',
            'though',
            'this',
            'that',
            'these',
            'those',
            'i',
            'you',
            'he',
            'she',
            'it',
            'we',
            'they',
            'me',
            'him',
            'her',
            'us',
            'them',
            'my',
            'your',
            'his',
            'its',
            'our',
            'their',
            'what',
            'which',
            'who',
            'whom',
            "it's",
            "i'm",
            "you're",
            "we're",
            "they're",
            "don't",
            "doesn't",
            "didn't",
            "won't",
            "wouldn't",
            "couldn't",
            "shouldn't",
            "can't",
            "cannot",
            'yeah',
            'yes',
            'okay',
            'ok',
            'um',
            'uh',
            'like',
            'know',
            'think',
            'going',
            'want',
            'get',
            'got',
            'make',
            'made',
            'say',
            'said',
            'see',
            'look',
            'come',
            'came',
            'go',
            'went',
            'take',
            'took',
            'give',
            'gave',
        ]);
        // Count word frequency
        for (const utterance of utterances) {
            const words = utterance.content
                .toLowerCase()
                .replace(/[^\w\s]/g, '')
                .split(/\s+/)
                .filter((w) => w.length > 2 && !stopWords.has(w));
            for (const word of words) {
                wordFrequency.set(word, (wordFrequency.get(word) || 0) + 1);
            }
        }
        // Sort by frequency
        const sorted = Array.from(wordFrequency.entries()).sort((a, b) => b[1] - a[1]);
        // Top keywords (words appearing more than once)
        const keywords = sorted.filter(([_, count]) => count > 1).slice(0, 20).map(([word]) => word);
        // Topics are the top 5 most frequent meaningful words
        const topics = sorted.slice(0, 5).map(([word]) => word);
        return { topics, keywords };
    }
    /**
     * Generate a summary for a thread
     */
    generateThreadSummary(thread, utterances) {
        const threadUtterances = utterances.filter((u) => thread.utteranceIds.includes(u.id));
        if (threadUtterances.length === 0) {
            return 'Empty thread';
        }
        const participantCount = thread.participants.length;
        const duration = thread.timeRange?.duration
            ? Math.round(thread.timeRange.duration / 1000)
            : 0;
        let summary = `Conversation with ${participantCount} participant(s)`;
        if (duration > 0) {
            summary += ` lasting ${duration} seconds`;
        }
        if (thread.topics && thread.topics.length > 0) {
            summary += `. Topics discussed: ${thread.topics.slice(0, 3).join(', ')}`;
        }
        return summary;
    }
}
exports.SegmentationService = SegmentationService;
exports.segmentationService = new SegmentationService();
exports.default = exports.segmentationService;
