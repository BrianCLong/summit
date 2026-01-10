import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock dependencies
const mockQuery: jest.MockedFunction<
  (text: string, params?: unknown[]) => Promise<{ rows: any[] }>
> = jest.fn();
const mockUploadMedia: jest.MockedFunction<
  (upload: any, userId: string) => Promise<any>
> = jest.fn();

const mockGetExtractionJobs: jest.MockedFunction<
  (investigationId: string, options: any) => Promise<any>
> = jest.fn();

// Import after mocks
import { MultimodalDataService } from '../../src/services/MultimodalDataService';

describe('MultimodalDataService', () => {
  let service: MultimodalDataService;
  let pool: any;
  let mediaUploadService: any;
  let extractionJobService: any;

  beforeEach(() => {
    jest.clearAllMocks();

    pool = { query: mockQuery };
    mediaUploadService = { uploadMedia: mockUploadMedia };
    extractionJobService = { getExtractionJobs: mockGetExtractionJobs };

    service = new MultimodalDataService(
        pool,
        mediaUploadService,
        extractionJobService
    );
  });

  describe('findCrossModalMatches', () => {
    it('should query cross_modal_matches with correct params', async () => {
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

        const results = await service.findCrossModalMatches(entityId, targetMediaTypes as any);

        expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('SELECT cmm.*'), [entityId, targetMediaTypes]);
        expect(results).toHaveLength(1);
        expect(results[0].id).toBe('match-1');
    });
  });

  describe('uploadMediaSource', () => {
      it('should upload media and create source', async () => {
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

          expect(mockUploadMedia).toHaveBeenCalledWith(mockUpload, userId);
          expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO media_sources'), expect.any(Array));
          expect(result.id).toBe('source-1');
      });
  });

  describe('getExtractionJobs', () => {
      it('should delegate to ExtractionJobService', async () => {
          const mockJobs = [{ id: 'job-1' }];
          mockGetExtractionJobs.mockResolvedValue(mockJobs);

          const results = await service.getExtractionJobs({ investigationId: 'inv-1', status: 'PENDING' });

          expect(mockGetExtractionJobs).toHaveBeenCalledWith('inv-1', { status: 'PENDING', limit: undefined });
          expect(results).toBe(mockJobs);
      });
  });
});
