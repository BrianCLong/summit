# @summit/dissemination

Report dissemination, distribution, and tracking system for secure delivery and access monitoring of intelligence products.

## Features

- Multiple distribution methods (Email, Portal, SFTP, API)
- Distribution lists and automated delivery
- Access tracking and download monitoring
- Watermarking support
- Time-based expiration
- Read receipts and engagement metrics

## Usage

```typescript
import { DistributionManager } from '@summit/dissemination';

const manager = new DistributionManager();

// Distribute report
const record = manager.distribute(
  'report-123',
  'analyst-456',
  'EMAIL',
  {
    watermark: true,
    expiresIn: 30,
    recipientEmail: 'analyst@example.com'
  }
);

// Track access
manager.trackAccess(record.trackingId, '192.168.1.1', 'Mozilla/5.0...');

// Get distribution statistics
const stats = manager.getDistributionStats('report-123');
console.log(stats);
```
