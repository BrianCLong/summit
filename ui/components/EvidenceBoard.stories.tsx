import type { Meta, StoryObj } from '@storybook/react';
import { EvidenceBoard } from './EvidenceBoard';
import { AccessibilityProvider } from '../../design-system/src/accessibility/AccessibilityContext';

const meta = {
  title: 'IntelGraph/EvidenceBoard',
  component: EvidenceBoard,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <AccessibilityProvider>
        <div style={{ height: '100vh' }}>
          <Story />
        </div>
      </AccessibilityProvider>
    ),
  ],
  tags: ['autodocs'],
  argTypes: {
    className: { control: 'text' },
  },
} satisfies Meta<typeof EvidenceBoard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    initialColumns: [
      { id: 'new', title: 'New Evidence', description: 'Recently discovered items', itemCount: 0, color: '#667eea' },
      { id: 'analyzing', title: 'In Analysis', description: 'Currently being examined', itemCount: 0, color: '#667eea' },
      { id: 'verified', title: 'Verified', description: 'Confirmed and validated', itemCount: 0, color: '#28a745' },
      { id: 'rejected', title: 'Rejected', description: 'Discredited or invalid', itemCount: 0, color: '#dc3545' },
    ],
    initialItems: [
      {
        id: '1',
        title: 'Document Analysis',
        description: 'Analysis of the suspicious document found at the scene',
        tags: ['document', 'physical'],
        columnId: 'analyzing',
        createdAt: new Date(),
        updatedAt: new Date(),
        priority: 'high',
        source: 'Field Agent #123',
        confidence: 85,
        status: 'pending',
      },
      {
        id: '2',
        title: 'Digital Evidence',
        description: 'Digital artifacts recovered from the suspect device',
        tags: ['digital', 'corroborated'],
        columnId: 'new',
        createdAt: new Date(),
        updatedAt: new Date(),
        priority: 'critical',
        source: 'Digital Forensics',
        confidence: 90,
        status: 'pending',
      },
      {
        id: '3',
        title: 'Witness Testimony',
        description: 'Testimony from the key witness in the case',
        tags: ['testimony', 'source'],
        columnId: 'verified',
        createdAt: new Date(),
        updatedAt: new Date(),
        priority: 'medium',
        source: 'Interview Room A',
        confidence: 75,
        status: 'confirmed',
      },
    ],
    initialTags: [
      { id: 'source', name: 'Source', color: '#667eea' },
      { id: 'document', name: 'Document', color: '#17a2b8' },
      { id: 'testimony', name: 'Testimony', color: '#ffc107' },
      { id: 'digital', name: 'Digital', color: '#28a745' },
      { id: 'physical', name: 'Physical', color: '#fd7e14' },
      { id: 'corroborated', name: 'Corroborated', color: '#6f42c1' },
    ],
  },
};

export const Empty: Story = {
  args: {
    initialColumns: [
      { id: 'new', title: 'New Evidence', description: 'Recently discovered items', itemCount: 0, color: '#667eea' },
      { id: 'analyzing', title: 'In Analysis', description: 'Currently being examined', itemCount: 0, color: '#667eea' },
      { id: 'verified', title: 'Verified', description: 'Confirmed and validated', itemCount: 0, color: '#28a745' },
      { id: 'rejected', title: 'Rejected', description: 'Discredited or invalid', itemCount: 0, color: '#dc3545' },
    ],
    initialItems: [],
    initialTags: [
      { id: 'source', name: 'Source', color: '#667eea' },
      { id: 'document', name: 'Document', color: '#17a2b8' },
      { id: 'testimony', name: 'Testimony', color: '#ffc107' },
      { id: 'digital', name: 'Digital', color: '#28a745' },
      { id: 'physical', name: 'Physical', color: '#fd7e14' },
      { id: 'corroborated', name: 'Corroborated', color: '#6f42c1' },
    ],
  },
};