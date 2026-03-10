import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConfidenceMeter } from '../../design-system/cognitive-command/ConfidenceMeter';
import { MissionStatusPill } from '../../design-system/cognitive-command/MissionStatusPill';
import { NarrativeConflictBadge } from '../../design-system/cognitive-command/NarrativeConflictBadge';
import { SignalStrengthBar } from '../../design-system/cognitive-command/SignalStrengthBar';
import { GovernanceGateBanner } from '../../design-system/cognitive-command/GovernanceGateBanner';
import { ForecastBand } from '../../design-system/cognitive-command/ForecastBand';
import { CommandCard } from '../../design-system/cognitive-command/CommandCard';

describe('Design System - Cognitive Command', () => {
  describe('ConfidenceMeter', () => {
    it('renders with level label', () => {
      render(<ConfidenceMeter level="high" />);
      expect(screen.getByText('High')).toBeDefined();
    });

    it('renders meter role', () => {
      render(<ConfidenceMeter level="medium" />);
      expect(screen.getByRole('meter')).toBeDefined();
    });
  });

  describe('MissionStatusPill', () => {
    it('renders state label', () => {
      render(<MissionStatusPill state="critical" />);
      expect(screen.getByText('Critical')).toBeDefined();
    });

    it('renders decision required state', () => {
      render(<MissionStatusPill state="decision_required" />);
      expect(screen.getByText('Decision Required')).toBeDefined();
    });
  });

  describe('NarrativeConflictBadge', () => {
    it('renders stance', () => {
      render(<NarrativeConflictBadge stance="adversarial" />);
      expect(screen.getByText('adversarial')).toBeDefined();
    });

    it('renders custom label', () => {
      render(<NarrativeConflictBadge stance="allied" label="Friendly" />);
      expect(screen.getByText('Friendly')).toBeDefined();
    });
  });

  describe('SignalStrengthBar', () => {
    it('renders with label and percentage', () => {
      render(<SignalStrengthBar value={0.75} label="Signal A" />);
      expect(screen.getByText('Signal A')).toBeDefined();
      expect(screen.getByText('75%')).toBeDefined();
    });
  });

  describe('GovernanceGateBanner', () => {
    it('renders gate name and status', () => {
      render(<GovernanceGateBanner name="Security Review" status="pending_approval" riskLevel="high" />);
      expect(screen.getByText('Security Review')).toBeDefined();
      expect(screen.getByText('pending approval')).toBeDefined();
    });

    it('shows approval buttons for pending gates', () => {
      render(<GovernanceGateBanner name="Gate" status="pending_approval" riskLevel="medium" onApprove={() => {}} onReject={() => {}} />);
      expect(screen.getByText('Approve')).toBeDefined();
      expect(screen.getByText('Reject')).toBeDefined();
    });

    it('hides approval buttons for approved gates', () => {
      render(<GovernanceGateBanner name="Gate" status="approved" riskLevel="low" />);
      expect(screen.queryByText('Approve')).toBeNull();
    });
  });

  describe('ForecastBand', () => {
    it('renders probability percentage', () => {
      render(<ForecastBand probability={0.65} confidenceLow={0.4} confidenceHigh={0.8} label="Probability" />);
      expect(screen.getByText('65%')).toBeDefined();
      expect(screen.getByText('Probability')).toBeDefined();
    });
  });

  describe('CommandCard', () => {
    it('renders title and children', () => {
      render(<CommandCard title="Test Card"><div>Card content</div></CommandCard>);
      expect(screen.getByText('Test Card')).toBeDefined();
      expect(screen.getByText('Card content')).toBeDefined();
    });

    it('renders subtitle when provided', () => {
      render(<CommandCard title="Card" subtitle="Sub"><div>Content</div></CommandCard>);
      expect(screen.getByText('Sub')).toBeDefined();
    });
  });
});
