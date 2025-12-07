import { InfluenceChannelService, ActivityMetric } from '../InfluenceChannelService';

describe('InfluenceChannelService', () => {
  let service: InfluenceChannelService;

  beforeEach(() => {
    service = new InfluenceChannelService();
    // service._resetForTesting() is available if needed, but new instance is cleaner
  });

  describe('catalogChannel', () => {
    it('should catalog a new channel with default profile values', async () => {
      const channel = await service.catalogChannel('chan-001', 'Test Forum', 'FORUM');

      expect(channel).toBeDefined();
      expect(channel.id).toBe('chan-001');
      expect(channel.platform).toBe('FORUM');
      expect(channel.profile.susceptibility).toBe(0.5); // Default
    });

    it('should update existing channel but preserve unspecified profile fields', async () => {
      await service.catalogChannel('chan-001', 'Test Forum', 'FORUM', { reach: 1000 });
      const updated = await service.catalogChannel('chan-001', 'Test Forum Renamed', 'FORUM', { velocity: 50 });

      expect(updated.name).toBe('Test Forum Renamed');
      expect(updated.profile.reach).toBe(1000); // Preserved
      expect(updated.profile.velocity).toBe(50); // Updated
    });
  });

  describe('updateChannelProfile', () => {
    it('should update specific profile fields', async () => {
      await service.catalogChannel('chan-001', 'Test Forum', 'FORUM');
      const updated = await service.updateChannelProfile('chan-001', { susceptibility: 0.9 });

      expect(updated.profile.susceptibility).toBe(0.9);
    });

    it('should throw error for non-existent channel', async () => {
      await expect(service.updateChannelProfile('ghost-chan', {}))
        .rejects.toThrow('Channel with ID ghost-chan not found');
    });
  });

  describe('monitorActivity & Anomaly Detection', () => {
    it('should track activity and update velocity', async () => {
      await service.catalogChannel('chan-001', 'Test Forum', 'FORUM');

      const metric: ActivityMetric = {
        channelId: 'chan-001',
        timestamp: new Date(),
        postCount: 10,
        engagementCount: 5
      };

      await service.monitorActivity(metric);

      const channel = await service.getChannel('chan-001');
      expect(channel?.profile.velocity).toBe(10);
    });

    it('should detect anomaly on activity spike', async () => {
      await service.catalogChannel('chan-001', 'Test Forum', 'FORUM');
      const anomalySpy = jest.fn();
      service.on('anomaly', anomalySpy);

      // Establish baseline (low activity)
      for (let i = 0; i < 20; i++) {
        await service.monitorActivity({
          channelId: 'chan-001',
          timestamp: new Date(),
          postCount: 10, // constant baseline
          engagementCount: 5
        });
      }

      // Inject spike
      await service.monitorActivity({
        channelId: 'chan-001',
        timestamp: new Date(),
        postCount: 100, // massive spike
        engagementCount: 50
      });

      expect(anomalySpy).toHaveBeenCalled();
      const anomaly = anomalySpy.mock.calls[0][0];
      expect(anomaly.type).toBe('VELOCITY_SPIKE');
      expect(anomaly.channelId).toBe('chan-001');
    });
  });
});
