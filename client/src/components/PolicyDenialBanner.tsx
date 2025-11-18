/**
 * Policy Denial Banner Component - GA Core Implementation
 * Displays policy denial with structured appeal path and reasons
 */

import React, { useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Form,
  Modal,
  Badge,
  Tooltip,
} from 'react-bootstrap';
import {
  InfoCircle,
  ExclamationTriangle,
  Clock,
  Shield,
  FileText,
} from 'react-bootstrap-icons';
import { useMutation, useQuery } from '@apollo/client';
import { SUBMIT_POLICY_APPEAL, GET_APPEAL_STATUS } from '../graphql/appeals';

interface AppealPath {
  available: boolean;
  appealId?: string;
  requiredRole: string;
  slaHours: number;
  escalationHours: number;
  instructions: string;
  submitUrl: string;
  statusUrl?: string;
}

interface PolicyDecision {
  allowed: boolean;
  policy: string;
  reason: string;
  appeal?: AppealPath;
  decisionId: string;
  timestamp: string;
  metadata?: {
    riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
    requiresJustification?: boolean;
    alternatives?: string[];
  };
}

interface PolicyDenialBannerProps {
  decision: PolicyDecision;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

const PolicyDenialBanner: React.FC<PolicyDenialBannerProps> = ({
  decision,
  onRetry,
  onDismiss,
  className,
}) => {
  const [showAppealForm, setShowAppealForm] = useState(false);
  const [appealSubmitted, setAppealSubmitted] = useState(false);

  // Appeal form state
  const [justification, setJustification] = useState('');
  const [businessNeed, setBusinessNeed] = useState('');
  const [urgency, setUrgency] = useState<
    'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  >('MEDIUM');
  const [requestedDuration, setRequestedDuration] = useState('24 hours');

  const [submitAppeal] = useMutation(SUBMIT_POLICY_APPEAL);

  // Check if there's an existing appeal
  const { data: appealStatus } = useQuery(GET_APPEAL_STATUS, {
    variables: { decisionId: decision.decisionId },
    skip: !appealSubmitted,
    pollInterval: appealSubmitted ? 30000 : 0, // Poll every 30 seconds if appeal submitted
  });

  const getRiskLevelColor = (level?: string) => {
    switch (level) {
      case 'HIGH':
        return 'danger';
      case 'MEDIUM':
        return 'warning';
      case 'LOW':
        return 'info';
      default:
        return 'secondary';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'CRITICAL':
        return 'danger';
      case 'HIGH':
        return 'warning';
      case 'MEDIUM':
        return 'info';
      case 'LOW':
        return 'success';
      default:
        return 'secondary';
    }
  };

  const handleSubmitAppeal = async () => {
    try {
      const result = await submitAppeal({
        variables: {
          decisionId: decision.decisionId,
          justification,
          businessNeed,
          urgency,
          requestedDuration,
        },
      });

      if (result.data?.submitPolicyAppeal) {
        setAppealSubmitted(true);
        setShowAppealForm(false);

        // Show success message
        console.log(
          'Appeal submitted successfully:',
          result.data.submitPolicyAppeal,
        );
      }
    } catch (error) {
      console.error('Failed to submit appeal:', error);
      // Handle error (show error message)
    }
  };

  const formatSlaTime = (hours: number) => {
    if (hours < 24) {
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    }
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days} day${days !== 1 ? 's' : ''}${remainingHours > 0 ? ` ${remainingHours} hour${remainingHours !== 1 ? 's' : ''}` : ''}`;
  };

  // If appeal has been approved, show success message
  if (appealStatus?.getAppealStatus?.status === 'APPROVED') {
    return (
      <Alert
        variant="success"
        className={`policy-denial-banner ${className || ''}`}
      >
        <div className="d-flex align-items-center">
          <Shield className="me-2" size={20} />
          <div className="flex-grow-1">
            <strong>Appeal Approved!</strong>
            <div className="mt-1">
              Your access request has been approved by a Data Steward. You may
              now retry your action.
              {appealStatus.getAppealStatus.responseReason && (
                <div className="text-muted small mt-1">
                  Reason: {appealStatus.getAppealStatus.responseReason}
                </div>
              )}
            </div>
          </div>
          <Button
            variant="success"
            size="sm"
            onClick={onRetry}
            className="ms-2"
          >
            Retry Action
          </Button>
        </div>
      </Alert>
    );
  }

  return (
    <>
      <Alert
        variant="danger"
        className={`policy-denial-banner ${className || ''}`}
        dismissible={!!onDismiss}
        onClose={onDismiss}
      >
        <div className="d-flex align-items-start">
          <ExclamationTriangle className="me-2 mt-1 flex-shrink-0" size={20} />
          <div className="flex-grow-1">
            <div className="d-flex align-items-center mb-2">
              <strong className="me-2">Access Denied</strong>
              {decision.metadata?.riskLevel && (
                <Badge
                  bg={getRiskLevelColor(decision.metadata.riskLevel)}
                  className="me-2"
                >
                  {decision.metadata.riskLevel} Risk
                </Badge>
              )}
              <small className="text-muted">Policy: {decision.policy}</small>
            </div>

            <div className="mb-2">{decision.reason}</div>

            {/* Alternatives if available */}
            {decision.metadata?.alternatives &&
              decision.metadata.alternatives.length > 0 && (
                <div className="mb-2">
                  <small className="text-muted">
                    <strong>Suggested alternatives:</strong>
                  </small>
                  <ul className="small mb-0">
                    {decision.metadata.alternatives.map((alt, index) => (
                      <li key={index}>{alt}</li>
                    ))}
                  </ul>
                </div>
              )}

            {/* Appeal section */}
            {decision.appeal?.available ? (
              <Card className="mt-3 border-info">
                <Card.Body className="py-2">
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center">
                      <InfoCircle className="me-2 text-info" size={16} />
                      <div>
                        <strong className="text-info">Appeal Available</strong>
                        <div className="small text-muted">
                          Response SLA:{' '}
                          {formatSlaTime(decision.appeal.slaHours)}
                          {decision.appeal.requiredRole && (
                            <span className="ms-2">
                              • Reviewer: {decision.appeal.requiredRole}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {appealSubmitted ? (
                      <div className="text-end">
                        {appealStatus?.getAppealStatus ? (
                          <div>
                            <Badge
                              bg={getUrgencyColor(
                                appealStatus.getAppealStatus.urgency,
                              )}
                            >
                              {appealStatus.getAppealStatus.status}
                            </Badge>
                            <div className="small text-muted mt-1">
                              <Clock size={12} className="me-1" />
                              Submitted{' '}
                              {new Date(
                                appealStatus.getAppealStatus.createdAt,
                              ).toLocaleString()}
                            </div>
                          </div>
                        ) : (
                          <Badge bg="info">Appeal Submitted</Badge>
                        )}
                      </div>
                    ) : (
                      <Button
                        variant="info"
                        size="sm"
                        onClick={() => setShowAppealForm(true)}
                      >
                        <FileText size={14} className="me-1" />
                        Submit Appeal
                      </Button>
                    )}
                  </div>

                  {decision.appeal.instructions && (
                    <div className="mt-2 small text-muted border-top pt-2">
                      <strong>Appeal Instructions:</strong>{' '}
                      {decision.appeal.instructions}
                    </div>
                  )}
                </Card.Body>
              </Card>
            ) : (
              decision.appeal && (
                <div className="mt-2 text-muted small">
                  <InfoCircle size={14} className="me-1" />
                  {decision.appeal.instructions ||
                    'This policy decision cannot be appealed.'}
                </div>
              )
            )}

            {/* Technical details */}
            <div className="mt-2 pt-2 border-top">
              <details>
                <summary
                  className="small text-muted"
                  style={{ cursor: 'pointer' }}
                >
                  Technical Details
                </summary>
                <div className="small text-muted mt-1">
                  <div>
                    Decision ID: <code>{decision.decisionId}</code>
                  </div>
                  <div>
                    Timestamp: {new Date(decision.timestamp).toLocaleString()}
                  </div>
                  <div>
                    Policy: <code>{decision.policy}</code>
                  </div>
                  {decision.appeal?.appealId && (
                    <div>
                      Appeal ID: <code>{decision.appeal.appealId}</code>
                    </div>
                  )}
                </div>
              </details>
            </div>
          </div>
        </div>
      </Alert>

      {/* Appeal Form Modal */}
      <Modal
        show={showAppealForm}
        onHide={() => setShowAppealForm(false)}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>Submit Policy Appeal</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <div className="mb-3">
              <Alert variant="info" className="small">
                <InfoCircle className="me-2" />
                <strong>Response SLA:</strong>{' '}
                {decision.appeal && formatSlaTime(decision.appeal.slaHours)}
                <br />
                <strong>Reviewer:</strong>{' '}
                {decision.appeal?.requiredRole || 'Data Steward'}
              </Alert>
            </div>

            <Form.Group className="mb-3">
              <Form.Label>Business Justification *</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Explain why this access is needed for business purposes..."
                value={businessNeed}
                onChange={(e: any) => setBusinessNeed(e.target.value)}
                required
              />
              <Form.Text className="text-muted">
                Describe the specific business requirement that necessitates
                this access.
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Technical Justification *</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Provide technical details about the access needed..."
                value={justification}
                onChange={(e: any) => setJustification(e.target.value)}
                required
              />
              <Form.Text className="text-muted">
                {decision.appeal?.instructions}
              </Form.Text>
            </Form.Group>

            <div className="row">
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label>Urgency Level *</Form.Label>
                  <Form.Select
                    value={urgency}
                    onChange={(e: any) => setUrgency(e.target.value as any)}
                  >
                    <option value="LOW">Low - Routine work</option>
                    <option value="MEDIUM">
                      Medium - Standard business need
                    </option>
                    <option value="HIGH">
                      High - Time-sensitive requirement
                    </option>
                    <option value="CRITICAL">
                      Critical - Security incident or emergency
                    </option>
                  </Form.Select>
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label>Requested Duration</Form.Label>
                  <Form.Select
                    value={requestedDuration}
                    onChange={(e: any) => setRequestedDuration(e.target.value)}
                  >
                    <option value="4 hours">4 hours</option>
                    <option value="12 hours">12 hours</option>
                    <option value="24 hours">24 hours (default)</option>
                    <option value="3 days">3 days</option>
                    <option value="1 week">1 week</option>
                  </Form.Select>
                </Form.Group>
              </div>
            </div>

            <Alert variant="warning" className="small">
              <ExclamationTriangle className="me-2" />
              <strong>Note:</strong> All appeals are logged and audited. Misuse
              of the appeal process may result in access restrictions.
            </Alert>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAppealForm(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmitAppeal}
            disabled={!businessNeed.trim() || !justification.trim()}
          >
            Submit Appeal
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default PolicyDenialBanner;
