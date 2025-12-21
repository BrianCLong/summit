/**
 * DAG-Based Runbook Examples
 *
 * Demonstrates how to execute the three runbooks:
 * - R1: Rapid Attribution (CTI)
 * - R2: Phishing Cluster Discovery (DFIR)
 * - R3: Disinformation Network Mapping
 */

import { DAGExecutor } from './dags/dag-executor';
import { LegalBasis, DataLicense } from './dags/types';
import { createR1RapidAttributionRunbook } from './r1-rapid-attribution';
import { createR2PhishingClusterRunbook } from './r2-phishing-cluster';
import { createR3DisinformationNetworkRunbook } from './r3-disinformation-network';

/**
 * Example: Execute R1 - Rapid Attribution (CTI)
 */
export async function executeR1Example() {
  console.log('=== R1: Rapid Attribution (CTI) ===\n');

  const dag = createR1RapidAttributionRunbook();
  const executor = new DAGExecutor();

  const result = await executor.execute(dag, {
    tenantId: 'tenant-1',
    userId: 'analyst-1',
    legalBasis: LegalBasis.LEGITIMATE_INTERESTS,
    dataLicenses: [DataLicense.INTERNAL_USE_ONLY],
    inputData: {
      incidentData: {
        id: 'incident-001',
        reportUrl: 'https://incident-tracker.example.com/001',
        analyst: 'John Doe',
        ips: ['192.168.1.100', '10.0.0.50'],
        domains: ['malicious-c2.example.com', 'phishing.bad-domain.net'],
        hashes: [
          'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',
          'z9y8x7w6v5u4t3s2r1q0p9o8n7m6l5k4',
        ],
      },
    },
  });

  console.log('Execution Result:');
  console.log(`  Success: ${result.success}`);
  console.log(`  Duration: ${result.totalDuration}ms (Benchmark: ${dag.benchmarks.total}ms)`);
  console.log(`  Within Benchmark: ${result.benchmarkComparison.withinBenchmark}`);
  console.log(`  Evidence Count: ${result.evidence.length}`);
  console.log(`  Citation Count: ${result.citations.length}`);
  console.log(`  Proof Count: ${result.proofs.length}`);
  console.log(`  Publication Allowed: ${result.publicationAllowed}`);

  if (!result.publicationAllowed) {
    console.log('  Publication Blocked Reasons:');
    result.publicationBlockReasons.forEach((reason) => {
      console.log(`    - ${reason}`);
    });
  }

  console.log('\nKPIs:');
  Object.entries(result.kpis).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`);
  });

  console.log('\nReplay Log Summary:');
  const replayLogSummary = executor.getReplayLog().getSummary();
  console.log(`  Total Entries: ${replayLogSummary.totalEntries}`);
  console.log(`  Duration: ${replayLogSummary.duration}ms`);
  console.log(`  Success: ${replayLogSummary.success}`);
  console.log(`  Nodes: ${replayLogSummary.nodes.join(', ')}`);

  console.log('\nReplay Log Integrity:');
  const integrity = executor.verifyReplayLogIntegrity();
  console.log(`  Valid: ${integrity.valid}`);
  if (!integrity.valid) {
    console.log(`  Error: ${integrity.error}`);
  }

  return result;
}

/**
 * Example: Execute R2 - Phishing Cluster Discovery (DFIR)
 */
export async function executeR2Example() {
  console.log('\n=== R2: Phishing Cluster Discovery (DFIR) ===\n');

  const dag = createR2PhishingClusterRunbook();
  const executor = new DAGExecutor();

  // Sample phishing emails
  const sampleEmails = [
    {
      id: 'email-001',
      subject: 'Urgent: Verify your account',
      sender: 'noreply@fake-bank.com',
      recipients: ['victim1@example.com'],
      headers: {
        'X-Originating-IP': '192.168.1.10',
        'Authentication-Results': 'spf=fail dkim=fail dmarc=fail',
      },
      body: 'Click here to verify your account...',
      links: ['http://phishing-site.bad/verify'],
      attachments: [],
      receivedAt: new Date('2024-01-15T10:00:00Z'),
      metadata: {
        server: 'mail.example.com',
        collectedBy: 'security-team',
      },
    },
    {
      id: 'email-002',
      subject: 'Urgent: Verify your account now',
      sender: 'support@fake-bank.com',
      recipients: ['victim2@example.com'],
      headers: {
        'X-Originating-IP': '192.168.1.10',
        'Authentication-Results': 'spf=fail dkim=fail dmarc=fail',
      },
      body: 'Click here to verify your account immediately...',
      links: ['http://phishing-site.bad/verify2'],
      attachments: [],
      receivedAt: new Date('2024-01-15T10:05:00Z'),
      metadata: {
        server: 'mail.example.com',
        collectedBy: 'security-team',
      },
    },
    {
      id: 'email-003',
      subject: 'Invoice #12345',
      sender: 'billing@fake-supplier.com',
      recipients: ['victim3@example.com'],
      headers: {
        'X-Originating-IP': '10.0.0.20',
        'Authentication-Results': 'spf=fail dkim=fail dmarc=fail',
      },
      body: 'Please find attached invoice...',
      links: [],
      attachments: [
        {
          filename: 'invoice.pdf.exe',
          hash: 'malware-hash-123',
          mimeType: 'application/x-msdownload',
        },
      ],
      receivedAt: new Date('2024-01-15T14:00:00Z'),
      metadata: {
        server: 'mail.example.com',
        collectedBy: 'security-team',
      },
    },
    {
      id: 'email-004',
      subject: 'Invoice #12346',
      sender: 'accounts@fake-supplier.com',
      recipients: ['victim4@example.com'],
      headers: {
        'X-Originating-IP': '10.0.0.20',
        'Authentication-Results': 'spf=fail dkim=fail dmarc=fail',
      },
      body: 'Please find attached invoice...',
      links: [],
      attachments: [
        {
          filename: 'invoice.pdf.exe',
          hash: 'malware-hash-123',
          mimeType: 'application/x-msdownload',
        },
      ],
      receivedAt: new Date('2024-01-15T14:10:00Z'),
      metadata: {
        server: 'mail.example.com',
        collectedBy: 'security-team',
      },
    },
    {
      id: 'email-005',
      subject: 'Urgent: Confirm your details',
      sender: 'admin@fake-bank.com',
      recipients: ['victim5@example.com'],
      headers: {
        'X-Originating-IP': '192.168.1.10',
        'Authentication-Results': 'spf=fail dkim=fail dmarc=fail',
      },
      body: 'Click here to confirm your details...',
      links: ['http://phishing-site.bad/confirm'],
      attachments: [],
      receivedAt: new Date('2024-01-15T10:15:00Z'),
      metadata: {
        server: 'mail.example.com',
        collectedBy: 'security-team',
      },
    },
  ];

  const result = await executor.execute(dag, {
    tenantId: 'tenant-1',
    userId: 'dfir-analyst-1',
    legalBasis: LegalBasis.LEGITIMATE_INTERESTS,
    dataLicenses: [DataLicense.INTERNAL_USE_ONLY],
    inputData: {
      emails: sampleEmails,
      emailServerUrl: 'https://mail.example.com',
      analyst: 'DFIR Team',
    },
  });

  console.log('Execution Result:');
  console.log(`  Success: ${result.success}`);
  console.log(`  Duration: ${result.totalDuration}ms (Benchmark: ${dag.benchmarks.total}ms)`);
  console.log(`  Within Benchmark: ${result.benchmarkComparison.withinBenchmark}`);
  console.log(`  Evidence Count: ${result.evidence.length}`);
  console.log(`  Citation Count: ${result.citations.length}`);
  console.log(`  Proof Count: ${result.proofs.length}`);
  console.log(`  Publication Allowed: ${result.publicationAllowed}`);

  if (!result.publicationAllowed) {
    console.log('  Publication Blocked Reasons:');
    result.publicationBlockReasons.forEach((reason) => {
      console.log(`    - ${reason}`);
    });
  }

  console.log('\nKPIs:');
  Object.entries(result.kpis).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`);
  });

  return result;
}

/**
 * Example: Execute R3 - Disinformation Network Mapping
 */
export async function executeR3Example() {
  console.log('\n=== R3: Disinformation Network Mapping ===\n');

  const dag = createR3DisinformationNetworkRunbook();
  const executor = new DAGExecutor();

  // Sample disinformation content
  const sampleContent = Array.from({ length: 15 }, (_, i) => ({
    id: `content-${i + 1}`,
    platform: i % 3 === 0 ? 'twitter' : i % 3 === 1 ? 'facebook' : 'telegram',
    author: `user${i % 5}`,
    authorId: `user-id-${i % 5}`,
    content: `Sample disinformation content about ${i % 2 === 0 ? 'election fraud' : 'health misinformation'} with various claims and narratives...`,
    url: `https://social-platform.example.com/post/${i + 1}`,
    timestamp: new Date(Date.now() - (15 - i) * 60 * 60 * 1000),
    engagementMetrics: {
      likes: Math.floor(Math.random() * 10000),
      shares: Math.floor(Math.random() * 5000),
      comments: Math.floor(Math.random() * 2000),
      views: Math.floor(Math.random() * 50000),
    },
  }));

  const result = await executor.execute(dag, {
    tenantId: 'tenant-1',
    userId: 'disinfo-analyst-1',
    legalBasis: LegalBasis.PUBLIC_TASK,
    dataLicenses: [DataLicense.CC_BY],
    inputData: {
      samples: sampleContent,
    },
  });

  console.log('Execution Result:');
  console.log(`  Success: ${result.success}`);
  console.log(`  Duration: ${result.totalDuration}ms (Benchmark: ${dag.benchmarks.total}ms)`);
  console.log(`  Within Benchmark: ${result.benchmarkComparison.withinBenchmark}`);
  console.log(`  Evidence Count: ${result.evidence.length}`);
  console.log(`  Citation Count: ${result.citations.length}`);
  console.log(`  Proof Count: ${result.proofs.length}`);
  console.log(`  Publication Allowed: ${result.publicationAllowed}`);

  if (!result.publicationAllowed) {
    console.log('  Publication Blocked Reasons:');
    result.publicationBlockReasons.forEach((reason) => {
      console.log(`    - ${reason}`);
    });
  }

  console.log('\nKPIs:');
  Object.entries(result.kpis).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`);
  });

  return result;
}

/**
 * Run all examples
 */
export async function runAllExamples() {
  try {
    await executeR1Example();
    await executeR2Example();
    await executeR3Example();

    console.log('\n=== All Examples Completed Successfully ===\n');
  } catch (error) {
    console.error('Error running examples:', error);
    throw error;
  }
}

// If running this file directly
if (require.main === module) {
  runAllExamples().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
