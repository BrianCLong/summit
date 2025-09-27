/**
 * Notification Service Tests - P1 Priority
 * Comprehensive test suite for real-time notifications and alerting
 */

const NotificationService = require('../services/NotificationService');

describe('Notification Service - P1 Priority', () => {
  let notificationService;
  let mockWebSocketManager;
  let mockEmailService;
  let mockSMSService;
  let mockPostgresPool;
  let mockRedisClient;
  let mockLogger;
  let mockClient;

  beforeEach(() => {
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };

    mockPostgresPool = {
      connect: jest.fn(() => mockClient)
    };

    mockRedisClient = {
      publish: jest.fn(),
      subscribe: jest.fn(),
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      zadd: jest.fn(),
      zrange: jest.fn()
    };

    mockWebSocketManager = {
      broadcast: jest.fn(),
      sendToUser: jest.fn(),
      sendToRoom: jest.fn(),
      getConnectedUsers: jest.fn(() => ['user1', 'user2'])
    };

    mockEmailService = {
      sendEmail: jest.fn(),
      validateEmail: jest.fn(() => true)
    };

    mockSMSService = {
      sendSMS: jest.fn(),
      validatePhoneNumber: jest.fn(() => true)
    };

    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn()
    };

    notificationService = new NotificationService(
      mockWebSocketManager,
      mockEmailService,
      mockSMSService,
      mockPostgresPool,
      mockRedisClient,
      mockLogger
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Notification Templates', () => {
    test('should initialize all required notification templates', () => {
      const templates = notificationService.getAvailableTemplates();
      
      expect(templates.length).toBeGreaterThanOrEqual(8);
      expect(templates.map(t => t.id)).toContain('INVESTIGATION_ALERT');
      expect(templates.map(t => t.id)).toContain('ANALYTICS_COMPLETE');
      expect(templates.map(t => t.id)).toContain('SECURITY_THREAT');
      expect(templates.map(t => t.id)).toContain('SYSTEM_MAINTENANCE');
      expect(templates.map(t => t.id)).toContain('COLLABORATION_INVITE');
      expect(templates.map(t => t.id)).toContain('DATA_EXPORT_READY');
      expect(templates.map(t => t.id)).toContain('WORKFLOW_STATUS');
      expect(templates.map(t => t.id)).toContain('CUSTOM_ALERT');
    });

    test('should configure template priorities correctly', () => {
      const templates = notificationService.getAvailableTemplates();
      
      const securityTemplate = templates.find(t => t.id === 'SECURITY_THREAT');
      expect(securityTemplate.priority).toBe('CRITICAL');
      expect(securityTemplate.channels).toContain('websocket');
      expect(securityTemplate.channels).toContain('email');
      
      const analyticsTemplate = templates.find(t => t.id === 'ANALYTICS_COMPLETE');
      expect(analyticsTemplate.priority).toBe('MEDIUM');
      expect(analyticsTemplate.channels).toContain('websocket');
    });

    test('should validate template variables', () => {
      const templates = notificationService.getAvailableTemplates();
      
      const investigationTemplate = templates.find(t => t.id === 'INVESTIGATION_ALERT');
      expect(investigationTemplate.variables).toContain('investigationTitle');
      expect(investigationTemplate.variables).toContain('alertType');
      expect(investigationTemplate.variables).toContain('severity');
    });
  });

  describe('Notification Creation and Delivery', () => {
    test('should create and send notifications successfully', async () => {
      mockClient.query.mockResolvedValue({ 
        rows: [{ id: 'notif123', created_at: new Date() }] 
      });

      const notificationData = {
        templateId: 'INVESTIGATION_ALERT',
        recipients: ['user123'],
        variables: {
          investigationTitle: 'Test Investigation',
          alertType: 'High Priority Finding',
          severity: 'HIGH'
        },
        channels: ['websocket', 'email'],
        userId: 'sender123'
      };

      const notification = await notificationService.sendNotification(notificationData);
      
      expect(notification.id).toBeDefined();
      expect(notification.templateId).toBe('INVESTIGATION_ALERT');
      expect(notification.recipients).toEqual(['user123']);
      expect(notification.status).toBe('PROCESSING');
      expect(mockClient.query).toHaveBeenCalled();
    });

    test('should handle multiple delivery channels', async () => {
      mockClient.query.mockResolvedValue({ 
        rows: [{ id: 'notif123', created_at: new Date() }] 
      });

      const notification = await notificationService.sendNotification({
        templateId: 'SECURITY_THREAT',
        recipients: ['user123'],
        variables: { threatType: 'Malware Detection' },
        channels: ['websocket', 'email', 'sms'],
        userId: 'system'
      });

      expect(notification.deliveries.length).toBe(3);
      expect(notification.deliveries.map(d => d.channel)).toEqual(
        expect.arrayContaining(['websocket', 'email', 'sms'])
      );
    });

    test('should validate notification data before sending', async () => {
      const invalidNotification = {
        templateId: 'INVALID_TEMPLATE',
        recipients: [],
        variables: {},
        userId: 'user123'
      };

      await expect(notificationService.sendNotification(invalidNotification))
        .rejects.toThrow();
    });

    test('should handle delivery failures gracefully', async () => {
      mockClient.query.mockResolvedValue({ 
        rows: [{ id: 'notif123', created_at: new Date() }] 
      });
      mockEmailService.sendEmail.mockRejectedValue(new Error('Email service down'));

      const notification = await notificationService.sendNotification({
        templateId: 'INVESTIGATION_ALERT',
        recipients: ['user123'],
        variables: { investigationTitle: 'Test' },
        channels: ['websocket', 'email'],
        userId: 'sender123'
      });

      // Should succeed with partial delivery
      expect(notification.status).toBe('PROCESSING');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('WebSocket Real-time Delivery', () => {
    test('should deliver websocket notifications in real-time', async () => {
      await notificationService.deliverWebSocketNotification(
        ['user123'],
        {
          id: 'notif123',
          title: 'Test Notification',
          body: 'Test message',
          priority: 'HIGH'
        }
      );

      expect(mockWebSocketManager.sendToUser).toHaveBeenCalledWith(
        'user123',
        expect.objectContaining({
          type: 'NOTIFICATION',
          data: expect.objectContaining({
            title: 'Test Notification',
            priority: 'HIGH'
          })
        })
      );
    });

    test('should broadcast to investigation rooms', async () => {
      await notificationService.deliverWebSocketNotification(
        { investigationId: 'inv123' },
        {
          id: 'notif123',
          title: 'Investigation Update',
          investigationId: 'inv123'
        }
      );

      expect(mockWebSocketManager.sendToRoom).toHaveBeenCalledWith(
        'investigation:inv123',
        expect.objectContaining({
          type: 'NOTIFICATION'
        })
      );
    });

    test('should handle user presence checking', async () => {
      mockWebSocketManager.getConnectedUsers.mockReturnValue(['user1']);

      const result = await notificationService.deliverWebSocketNotification(
        ['user1', 'user2'],
        { id: 'notif123', title: 'Test' }
      );

      expect(result.delivered).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.offline).toEqual(['user2']);
    });
  });

  describe('Email Notification Delivery', () => {
    test('should send formatted email notifications', async () => {
      mockEmailService.sendEmail.mockResolvedValue({ messageId: 'email123' });

      const result = await notificationService.deliverEmailNotification(
        ['user@example.com'],
        {
          id: 'notif123',
          title: 'Investigation Alert',
          body: 'New findings detected',
          variables: { investigationTitle: 'Test Investigation' }
        }
      );

      expect(mockEmailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ['user@example.com'],
          subject: 'Investigation Alert',
          html: expect.stringContaining('Test Investigation')
        })
      );
      expect(result.delivered).toBe(1);
    });

    test('should handle email template rendering', async () => {
      const template = notificationService.getTemplate('ANALYTICS_COMPLETE');
      const rendered = notificationService.renderEmailTemplate(template, {
        analyticsType: 'Link Prediction',
        resultCount: 25,
        investigationTitle: 'Test Investigation'
      });

      expect(rendered.subject).toContain('Analytics Complete');
      expect(rendered.html).toContain('Link Prediction');
      expect(rendered.html).toContain('25');
      expect(rendered.text).toBeDefined();
    });

    test('should validate email addresses', () => {
      expect(notificationService.isValidEmail('test@example.com')).toBe(true);
      expect(notificationService.isValidEmail('user.name+tag@domain.co.uk')).toBe(true);
      expect(notificationService.isValidEmail('invalid-email')).toBe(false);
      expect(notificationService.isValidEmail('no-at-symbol.com')).toBe(false);
    });
  });

  describe('SMS Notification Delivery', () => {
    test('should send SMS notifications for critical alerts', async () => {
      mockSMSService.sendSMS.mockResolvedValue({ messageId: 'sms123' });

      const result = await notificationService.deliverSMSNotification(
        ['+1234567890'],
        {
          id: 'notif123',
          title: 'Security Alert',
          body: 'Critical security threat detected',
          priority: 'CRITICAL'
        }
      );

      expect(mockSMSService.sendSMS).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '+1234567890',
          body: expect.stringContaining('Security Alert')
        })
      );
      expect(result.delivered).toBe(1);
    });

    test('should truncate SMS messages appropriately', () => {
      const longMessage = 'This is a very long notification message that exceeds the typical SMS length limit and needs to be truncated appropriately to fit within the constraints while preserving the essential information';
      
      const truncated = notificationService.truncateForSMS(longMessage);
      
      expect(truncated.length).toBeLessThanOrEqual(160);
      expect(truncated).toContain('...');
    });

    test('should validate phone numbers', () => {
      expect(notificationService.isValidPhoneNumber('+1234567890')).toBe(true);
      expect(notificationService.isValidPhoneNumber('1234567890')).toBe(false);
      expect(notificationService.isValidPhoneNumber('invalid')).toBe(false);
    });
  });

  describe('Push Notification Delivery', () => {
    test('should send mobile push notifications', async () => {
      const mockFCM = {
        send: jest.fn().mockResolvedValue({ messageId: 'fcm123' })
      };
      notificationService.fcmClient = mockFCM;

      const result = await notificationService.deliverPushNotification(
        { deviceToken: 'device123' },
        {
          notification: {
            title: 'Investigation Update',
            body: 'New entities detected'
          },
          data: {
            investigationId: 'inv123',
            deepLink: 'intelgraph://investigation/inv123'
          }
        }
      );

      expect(mockFCM.send).toHaveBeenCalledWith(
        expect.objectContaining({
          token: 'device123',
          notification: expect.objectContaining({
            title: 'Investigation Update'
          })
        })
      );
      expect(result.success).toBe(true);
    });

    test('should handle device token validation', async () => {
      const result = await notificationService.deliverPushNotification(
        { deviceToken: 'invalid_token' },
        { notification: { title: 'Test' } }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid device token');
    });
  });

  describe('Webhook Delivery', () => {
    test('should deliver webhook notifications', async () => {
      const mockAxios = jest.fn().mockResolvedValue({ status: 200, data: 'OK' });
      notificationService.httpClient = { post: mockAxios };

      const result = await notificationService.deliverWebhookNotification(
        'https://example.com/webhook',
        {
          id: 'notif123',
          title: 'Webhook Test',
          timestamp: new Date().toISOString(),
          data: { investigationId: 'inv123' }
        }
      );

      expect(mockAxios).toHaveBeenCalledWith(
        'https://example.com/webhook',
        expect.objectContaining({
          id: 'notif123',
          title: 'Webhook Test'
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );
      expect(result.success).toBe(true);
    });

    test('should include HMAC signature for webhook security', () => {
      const payload = { id: 'notif123', data: 'test' };
      const secret = 'webhook_secret';
      
      const signature = notificationService.generateWebhookSignature(payload, secret);
      
      expect(signature).toBeDefined();
      expect(signature).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('Alert Rules Engine', () => {
    test('should create and manage alert rules', async () => {
      const ruleData = {
        name: 'High Risk Entity Alert',
        description: 'Alert when high-risk entities are detected',
        conditions: {
          entityType: 'PERSON',
          riskLevel: 'HIGH',
          investigationStatus: 'ACTIVE'
        },
        actions: {
          templateId: 'INVESTIGATION_ALERT',
          channels: ['websocket', 'email'],
          recipients: ['analyst_team']
        },
        userId: 'admin123'
      };

      const rule = await notificationService.createAlertRule(ruleData);
      
      expect(rule.id).toBeDefined();
      expect(rule.name).toBe('High Risk Entity Alert');
      expect(rule.status).toBe('ACTIVE');
      expect(rule.conditions).toEqual(ruleData.conditions);
    });

    test('should evaluate alert rules against events', async () => {
      const rule = {
        id: 'rule123',
        conditions: {
          entityType: 'PERSON',
          riskLevel: 'HIGH'
        },
        status: 'ACTIVE'
      };

      const event = {
        type: 'ENTITY_RISK_UPDATED',
        data: {
          entityId: 'ent123',
          entityType: 'PERSON',
          riskLevel: 'HIGH',
          investigationId: 'inv123'
        }
      };

      notificationService.alertRules.set('rule123', rule);
      const matches = await notificationService.evaluateAlertRules(event);
      
      expect(matches).toHaveLength(1);
      expect(matches[0].ruleId).toBe('rule123');
    });

    test('should execute alert actions when rules match', async () => {
      const rule = {
        id: 'rule123',
        actions: {
          templateId: 'INVESTIGATION_ALERT',
          channels: ['websocket'],
          recipients: ['user123']
        }
      };

      const event = {
        type: 'ENTITY_RISK_UPDATED',
        data: { entityId: 'ent123', riskLevel: 'HIGH' }
      };

      mockClient.query.mockResolvedValue({ 
        rows: [{ id: 'notif123', created_at: new Date() }] 
      });

      await notificationService.executeAlertActions(rule, event);
      
      expect(mockClient.query).toHaveBeenCalled();
      expect(mockWebSocketManager.sendToUser).toHaveBeenCalled();
    });
  });

  describe('Notification Management', () => {
    test('should retrieve user notifications with filtering', async () => {
      mockClient.query.mockResolvedValue({
        rows: [
          {
            id: 'notif1',
            title: 'Test Notification',
            body: 'Test body',
            priority: 'HIGH',
            read: false,
            created_at: new Date()
          }
        ]
      });

      const notifications = await notificationService.getUserNotifications('user123', {
        limit: 10,
        unreadOnly: true
      });
      
      expect(notifications).toHaveLength(1);
      expect(notifications[0].id).toBe('notif1');
      expect(notifications[0].read).toBe(false);
    });

    test('should mark notifications as read', async () => {
      mockClient.query.mockResolvedValue({ rowCount: 1 });

      const result = await notificationService.markAsRead('notif123', 'user123');
      
      expect(result).toBe(true);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE notifications SET read = true'),
        expect.arrayContaining(['notif123', 'user123'])
      );
    });

    test('should delete notifications', async () => {
      mockClient.query.mockResolvedValue({ rowCount: 1 });

      const result = await notificationService.deleteNotification('notif123', 'user123');
      
      expect(result).toBe(true);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM notifications'),
        expect.arrayContaining(['notif123', 'user123'])
      );
    });

    test('should get notification statistics', async () => {
      mockClient.query.mockResolvedValue({
        rows: [
          { priority: 'HIGH', count: '5' },
          { priority: 'MEDIUM', count: '10' },
          { priority: 'LOW', count: '3' }
        ]
      });

      const stats = await notificationService.getNotificationStats('user123');
      
      expect(stats.total).toBe(18);
      expect(stats.byPriority.HIGH).toBe(5);
      expect(stats.byPriority.MEDIUM).toBe(10);
      expect(stats.byPriority.LOW).toBe(3);
    });
  });

  describe('User Preferences', () => {
    test('should manage user notification preferences', async () => {
      const preferences = {
        userId: 'user123',
        channels: {
          websocket: true,
          email: true,
          sms: false,
          push: true
        },
        frequency: {
          CRITICAL: 'IMMEDIATE',
          HIGH: 'IMMEDIATE',
          MEDIUM: 'HOURLY',
          LOW: 'DAILY'
        },
        quietHours: {
          enabled: true,
          start: '22:00',
          end: '08:00'
        }
      };

      mockClient.query.mockResolvedValue({ 
        rows: [{ id: 'pref123', ...preferences }] 
      });

      const saved = await notificationService.updateUserPreferences('user123', preferences);
      
      expect(saved.userId).toBe('user123');
      expect(saved.channels.email).toBe(true);
      expect(saved.channels.sms).toBe(false);
    });

    test('should respect quiet hours in notification delivery', () => {
      const preferences = {
        quietHours: {
          enabled: true,
          start: '22:00',
          end: '08:00'
        }
      };

      // Test during quiet hours (23:00)
      const quietTime = new Date();
      quietTime.setHours(23, 0, 0);
      
      const shouldDelay = notificationService.shouldDelayForQuietHours(
        preferences,
        'MEDIUM',
        quietTime
      );
      
      expect(shouldDelay).toBe(true);
    });

    test('should allow critical alerts during quiet hours', () => {
      const preferences = {
        quietHours: {
          enabled: true,
          start: '22:00',
          end: '08:00'
        }
      };

      const quietTime = new Date();
      quietTime.setHours(23, 0, 0);
      
      const shouldDelay = notificationService.shouldDelayForQuietHours(
        preferences,
        'CRITICAL',
        quietTime
      );
      
      expect(shouldDelay).toBe(false);
    });
  });

  describe('Metrics and Analytics', () => {
    test('should track notification metrics', () => {
      const metrics = notificationService.getMetrics();
      
      expect(metrics.totalNotifications).toBeGreaterThanOrEqual(0);
      expect(metrics.deliveredNotifications).toBeGreaterThanOrEqual(0);
      expect(metrics.failedNotifications).toBeGreaterThanOrEqual(0);
      expect(metrics.channelBreakdown).toBeDefined();
      expect(metrics.deliveryRate).toBeDefined();
    });

    test('should calculate delivery success rate', () => {
      notificationService.metrics.totalNotifications = 100;
      notificationService.metrics.deliveredNotifications = 95;
      
      const metrics = notificationService.getMetrics();
      expect(metrics.deliveryRate).toBe('95.00');
    });

    test('should provide channel breakdown statistics', () => {
      const breakdown = notificationService.getChannelBreakdown();
      
      expect(breakdown.websocket).toBeGreaterThanOrEqual(0);
      expect(breakdown.email).toBeGreaterThanOrEqual(0);
      expect(breakdown.sms).toBeGreaterThanOrEqual(0);
      expect(breakdown.push).toBeGreaterThanOrEqual(0);
      expect(breakdown.webhook).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Batch Operations', () => {
    test('should handle bulk notification sending', async () => {
      mockClient.query.mockResolvedValue({ 
        rows: Array(50).fill().map((_, i) => ({ 
          id: `notif${i}`, 
          created_at: new Date() 
        }))
      });

      const recipients = Array(50).fill().map((_, i) => `user${i}`);
      
      const result = await notificationService.sendBulkNotification({
        templateId: 'SYSTEM_MAINTENANCE',
        recipients,
        variables: { maintenanceWindow: '2024-01-15 02:00-04:00 UTC' },
        channels: ['websocket', 'email'],
        userId: 'system'
      });

      expect(result.queued).toBe(50);
      expect(result.failed).toBe(0);
    });

    test('should process notification queue efficiently', async () => {
      // Queue multiple notifications
      for (let i = 0; i < 10; i++) {
        await notificationService.queueNotification({
          id: `notif${i}`,
          priority: i % 2 === 0 ? 'HIGH' : 'MEDIUM'
        });
      }

      await notificationService.processNotificationQueue();
      
      expect(notificationService.getQueueSize()).toBe(0);
    });
  });
});

// Performance and load tests
describe('Notification Service Performance', () => {
  let notificationService;

  beforeEach(() => {
    notificationService = new NotificationService(
      { broadcast: jest.fn(), sendToUser: jest.fn() },
      { sendEmail: jest.fn() },
      { sendSMS: jest.fn() },
      { connect: jest.fn(() => ({ query: jest.fn(), release: jest.fn() })) },
      { publish: jest.fn(), get: jest.fn(), set: jest.fn() },
      { info: jest.fn(), error: jest.fn() }
    );
  });

  test('should handle high-volume notification processing', async () => {
    const startTime = Date.now();
    
    const notifications = Array(1000).fill().map((_, i) => ({
      templateId: 'INVESTIGATION_ALERT',
      recipients: [`user${i}`],
      variables: { investigationTitle: `Investigation ${i}` },
      channels: ['websocket']
    }));

    await Promise.all(notifications.map(n => 
      notificationService.queueNotification(n)
    ));

    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    expect(notificationService.getQueueSize()).toBeGreaterThan(0);
  });
});