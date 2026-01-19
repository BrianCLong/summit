import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { osintService } from '../osint_service'; // Adjust import path
import { pg } from '../../db/pg';
import axios from 'axios';

// Mock dependencies
jest.mock('../../db/pg', () => ({
  pg: {
    oneOrNone: jest.fn(),
    many: jest.fn(),
  },
}));

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('OsintService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ingestFeed', () => {
    it('should fetch RSS and insert IOCs', async () => {
      const mockXml = `
        <rss>
          <channel>
            <item>
              <title>Malicious IP 192.168.1.1 detected</title>
              <description>We found 10.0.0.1 acting suspiciously.</description>
              <link>http://example.com/report</link>
            </item>
          </channel>
        </rss>
      `;

      mockedAxios.get.mockResolvedValue({ data: mockXml });

      (pg.oneOrNone as jest.Mock).mockResolvedValue({ id: 1 }); // Insert success

      const result = await osintService.ingestFeed('http://test.com/rss');

      expect(mockedAxios.get).toHaveBeenCalledWith('http://test.com/rss');
      // Should find 192.168.1.1 and 10.0.0.1
      expect(pg.oneOrNone).toHaveBeenCalledTimes(2);
      expect(result.count).toBe(2);
    });
  });

  describe('analyzePending', () => {
    it('should analyze pending IOCs and store results', async () => {
      const mockIocs = [
        { id: 1, type: 'ipv4', value: '1.2.3.4' },
      ];

      (pg.many as jest.Mock).mockResolvedValue(mockIocs);
      (pg.oneOrNone as jest.Mock).mockResolvedValue({ id: 100, risk_score: 50 });

      const results = await osintService.analyzePending(1);

      expect(pg.many).toHaveBeenCalled(); // Fetch pending
      expect(pg.oneOrNone).toHaveBeenCalled(); // Insert assessment
      expect(results).toHaveLength(1);
    });
  });
});
