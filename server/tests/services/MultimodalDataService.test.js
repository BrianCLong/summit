"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
// Mock dependencies
const mockQuery = globals_1.jest.fn();
const mockUploadMedia = globals_1.jest.fn();
const mockGetExtractionJobs = globals_1.jest.fn();
// Import after mocks
const MultimodalDataService_1 = require("../../src/services/MultimodalDataService");
(0, globals_1.describe)('MultimodalDataService', () => {
    let service;
    let pool;
    let mediaUploadService;
    let extractionJobService;
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        pool = { query: mockQuery };
        mediaUploadService = { uploadMedia: mockUploadMedia };
        extractionJobService = { getExtractionJobs: mockGetExtractionJobs };
        service = new MultimodalDataService_1.MultimodalDataService(pool, mediaUploadService, extractionJobService);
    });
    (0, globals_1.describe)('findCrossModalMatches', () => {
        (0, globals_1.it)('should query cross_modal_matches with correct params', async () => {
            const entityId = 'entity-1';
            const targetMediaTypes = ['IMAGE', 'VIDEO'];
            const mockRows = [{
                    id: 'match-1',
                    source_entity_id: entityId,
                    target_entity_id: 'target-1',
                    match_type: 'VISUAL_SIMILARITY',
                    confidence: 0.9,
                    created_at: new Date(),
                }];
            mockQuery.mockResolvedValueOnce({ rows: mockRows });
            const results = await service.findCrossModalMatches(entityId, targetMediaTypes);
            (0, globals_1.expect)(mockQuery).toHaveBeenCalledWith(globals_1.expect.stringContaining('SELECT cmm.*'), [entityId, targetMediaTypes]);
            (0, globals_1.expect)(results).toHaveLength(1);
            (0, globals_1.expect)(results[0].id).toBe('match-1');
        });
    });
    (0, globals_1.describe)('uploadMediaSource', () => {
        (0, globals_1.it)('should upload media and create source', async () => {
            const mockUpload = { filename: 'test.jpg' };
            const userId = 'user-1';
            const mockMetadata = {
                filename: 'uuid.jpg',
                originalName: 'test.jpg',
                mediaType: 'IMAGE',
                mimeType: 'image/jpeg',
                filesize: 100,
                checksum: '123',
                metadata: {}
            };
            const mockDbSource = {
                id: 'source-1',
                filename: 'uuid.jpg',
                media_type: 'IMAGE',
                processing_status: 'PENDING',
                created_at: new Date(),
            };
            mockUploadMedia.mockResolvedValue(mockMetadata);
            mockQuery.mockResolvedValueOnce({ rows: [mockDbSource] });
            const result = await service.uploadMediaSource(mockUpload, userId);
            (0, globals_1.expect)(mockUploadMedia).toHaveBeenCalledWith(mockUpload, userId);
            (0, globals_1.expect)(mockQuery).toHaveBeenCalledWith(globals_1.expect.stringContaining('INSERT INTO media_sources'), globals_1.expect.any(Array));
            (0, globals_1.expect)(result.id).toBe('source-1');
        });
    });
    (0, globals_1.describe)('getExtractionJobs', () => {
        (0, globals_1.it)('should delegate to ExtractionJobService', async () => {
            const mockJobs = [{ id: 'job-1' }];
            mockGetExtractionJobs.mockResolvedValue(mockJobs);
            const results = await service.getExtractionJobs({ investigationId: 'inv-1', status: 'PENDING' });
            (0, globals_1.expect)(mockGetExtractionJobs).toHaveBeenCalledWith('inv-1', { status: 'PENDING', limit: undefined });
            (0, globals_1.expect)(results).toBe(mockJobs);
        });
    });
});
