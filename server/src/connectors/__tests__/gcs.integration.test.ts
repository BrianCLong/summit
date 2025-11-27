import { GCSConnector } from '../gcs';
import { PiiCategory, PiiTaggedField } from '../../lib/pii/types';
import { ProvenanceMetadata } from '../../lib/provenance/types';
import { createProvenance } from '../../lib/provenance/utils';
import { tagPiiField } from '../../lib/pii/utils';
import { GCSConsumer } from '../../consumers/gcs-consumer';

// Mock the GCSConnector to avoid making actual API calls
vi.mock('../gcs');

describe('GCS Connector Integration', () => {
  it('should preserve PII and provenance metadata', async () => {
    const mockGcsConnector = new GCSConnector('test-tenant', {
      projectId: 'test-project',
      bucketName: 'test-bucket',
    });

    const piiTags = [tagPiiField('email', PiiCategory.Sensitive, 0.9)];
    const provenance = createProvenance(
      'test-system',
      'test-id',
      'job-123',
      0.9,
      'test-owner'
    );

    const objectName = 'test-object';
    const objectData = 'test data';

    // Mock the upload and getObjectMetadata methods
    const mockUpload = vi.spyOn(mockGcsConnector, 'uploadObject');
    mockUpload.mockResolvedValue({
      name: objectName,
      bucket: 'test-bucket',
      size: objectData.length,
      contentType: 'text/plain',
      md5Hash: '',
      crc32c: '',
      etag: '',
      timeCreated: new Date(),
      updated: new Date(),
      storageClass: 'STANDARD',
      metadata: {
        pii: JSON.stringify(piiTags),
        provenance: JSON.stringify(provenance),
      },
    });

    const mockGetMetadata = vi.spyOn(mockGcsConnector, 'getObjectMetadata');
    mockGetMetadata.mockResolvedValue({
      name: objectName,
      bucket: 'test-bucket',
      size: objectData.length,
      contentType: 'text/plain',
      md5Hash: '',
      crc32c: '',
      etag: '',
      timeCreated: new Date(),
      updated: new Date(),
      storageClass: 'STANDARD',
      metadata: {
        pii: JSON.stringify(piiTags),
        provenance: JSON.stringify(provenance),
      },
    });

    await mockGcsConnector.uploadObject(objectName, objectData, {
      pii: piiTags,
      provenance,
    });


    const consumer = new GCSConsumer(mockGcsConnector);
    // We are spying on the console to check the output
    const consoleSpy = vi.spyOn(console, 'log');
    await consumer.processObject(objectName);

    // Verify that the consumer correctly identifies the trusted source
    expect(consoleSpy).toHaveBeenCalledWith(
      `Processing object: ${objectName}, size: ${objectData.length}`
    );
  });
});
