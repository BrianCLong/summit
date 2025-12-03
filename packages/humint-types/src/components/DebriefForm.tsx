/**
 * Debrief Form Component
 *
 * Multi-step form for conducting and documenting debrief sessions.
 */

import React, { useState, useCallback } from 'react';
import type {
  CreateDebriefInput,
  UpdateDebriefInput,
  CompleteDebriefInput,
  DebriefType,
  IntelligenceItem,
  DebriefTasking,
  SecurityAssessment,
} from '../debrief.js';
import type { ClassificationLevel, RiskLevel } from '../constants.js';
import { DEBRIEF_TYPES, CLASSIFICATION_LEVELS, RISK_LEVELS } from '../constants.js';

export interface DebriefFormProps {
  sourceId: string;
  sourceCryptonym: string;
  mode: 'schedule' | 'conduct' | 'complete' | 'review';
  initialData?: Partial<CreateDebriefInput & UpdateDebriefInput & CompleteDebriefInput>;
  onSubmit: (data: unknown) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  error?: string | null;
}

type DebriefStep = 'schedule' | 'objectives' | 'notes' | 'intelligence' | 'security' | 'review';

interface ScheduleFormState {
  debriefType: DebriefType;
  scheduledAt: string;
  locationType: 'SAFE_HOUSE' | 'NEUTRAL' | 'VEHICLE' | 'VIRTUAL' | 'OTHER';
  locationId: string;
  securityVerified: boolean;
  objectives: string[];
  classification: ClassificationLevel;
}

interface ConductFormState {
  topicsCovered: string[];
  rawNotes: string;
  sourceDemeanor: string;
  credibilityObservations: string;
}

interface CompleteFormState {
  processedNotes: string;
  intelligenceItems: Partial<IntelligenceItem>[];
  taskings: Partial<DebriefTasking>[];
  securityAssessment: Partial<SecurityAssessment>;
}

export const DebriefForm: React.FC<DebriefFormProps> = ({
  sourceId,
  sourceCryptonym,
  mode,
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  error = null,
}) => {
  const [currentStep, setCurrentStep] = useState<DebriefStep>(
    mode === 'schedule' ? 'schedule' : mode === 'conduct' ? 'notes' : 'intelligence',
  );

  const [scheduleForm, setScheduleForm] = useState<ScheduleFormState>({
    debriefType: (initialData?.debriefType as DebriefType) || 'SCHEDULED',
    scheduledAt: initialData?.scheduledAt
      ? new Date(initialData.scheduledAt).toISOString().slice(0, 16)
      : new Date().toISOString().slice(0, 16),
    locationType: 'SAFE_HOUSE',
    locationId: '',
    securityVerified: false,
    objectives: [],
    classification: 'SECRET',
  });

  const [conductForm, setConductForm] = useState<ConductFormState>({
    topicsCovered: (initialData?.topicsCovered as string[]) || [],
    rawNotes: (initialData?.rawNotes as string) || '',
    sourceDemeanor: '',
    credibilityObservations: '',
  });

  const [completeForm, setCompleteForm] = useState<CompleteFormState>({
    processedNotes: (initialData?.processedNotes as string) || '',
    intelligenceItems: [],
    taskings: [],
    securityAssessment: {
      sourceCompromiseRisk: 'NONE',
      operationalSecurityIssues: [],
      counterintelligenceIndicators: [],
      recommendedMitigations: [],
      evaluatorNotes: '',
    },
  });

  const [objectiveInput, setObjectiveInput] = useState('');
  const [topicInput, setTopicInput] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Schedule form handlers
  const handleScheduleChange = useCallback(
    (field: keyof ScheduleFormState, value: unknown) => {
      setScheduleForm((prev) => ({ ...prev, [field]: value }));
      setValidationErrors((prev) => ({ ...prev, [field]: '' }));
    },
    [],
  );

  const addObjective = useCallback(() => {
    if (objectiveInput.trim()) {
      setScheduleForm((prev) => ({
        ...prev,
        objectives: [...prev.objectives, objectiveInput.trim()],
      }));
      setObjectiveInput('');
    }
  }, [objectiveInput]);

  const removeObjective = useCallback((index: number) => {
    setScheduleForm((prev) => ({
      ...prev,
      objectives: prev.objectives.filter((_, i) => i !== index),
    }));
  }, []);

  // Conduct form handlers
  const handleConductChange = useCallback(
    (field: keyof ConductFormState, value: unknown) => {
      setConductForm((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const addTopic = useCallback(() => {
    if (topicInput.trim()) {
      setConductForm((prev) => ({
        ...prev,
        topicsCovered: [...prev.topicsCovered, topicInput.trim()],
      }));
      setTopicInput('');
    }
  }, [topicInput]);

  // Complete form handlers
  const handleCompleteChange = useCallback(
    (field: keyof CompleteFormState, value: unknown) => {
      setCompleteForm((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const addIntelligenceItem = useCallback(() => {
    setCompleteForm((prev) => ({
      ...prev,
      intelligenceItems: [
        ...prev.intelligenceItems,
        {
          id: `temp-${Date.now()}`,
          topic: '',
          content: '',
          informationRating: '3',
          classification: 'SECRET',
          requiresCorroboration: true,
          corroboratedBy: [],
          linkedEntities: [],
          actionability: 'BACKGROUND',
          disseminationRestrictions: [],
        },
      ],
    }));
  }, []);

  const updateIntelligenceItem = useCallback(
    (index: number, field: keyof IntelligenceItem, value: unknown) => {
      setCompleteForm((prev) => ({
        ...prev,
        intelligenceItems: prev.intelligenceItems.map((item, i) =>
          i === index ? { ...item, [field]: value } : item,
        ),
      }));
    },
    [],
  );

  const removeIntelligenceItem = useCallback((index: number) => {
    setCompleteForm((prev) => ({
      ...prev,
      intelligenceItems: prev.intelligenceItems.filter((_, i) => i !== index),
    }));
  }, []);

  const addTasking = useCallback(() => {
    setCompleteForm((prev) => ({
      ...prev,
      taskings: [
        ...prev.taskings,
        {
          id: `temp-${Date.now()}`,
          description: '',
          priority: 'MEDIUM',
          status: 'PENDING',
        },
      ],
    }));
  }, []);

  const updateTasking = useCallback(
    (index: number, field: keyof DebriefTasking, value: unknown) => {
      setCompleteForm((prev) => ({
        ...prev,
        taskings: prev.taskings.map((item, i) =>
          i === index ? { ...item, [field]: value } : item,
        ),
      }));
    },
    [],
  );

  const handleSecurityAssessmentChange = useCallback(
    (field: keyof SecurityAssessment, value: unknown) => {
      setCompleteForm((prev) => ({
        ...prev,
        securityAssessment: { ...prev.securityAssessment, [field]: value },
      }));
    },
    [],
  );

  // Navigation
  const goToStep = useCallback((step: DebriefStep) => {
    setCurrentStep(step);
  }, []);

  // Submit handlers
  const handleSubmit = useCallback(async () => {
    let data: unknown;

    if (mode === 'schedule') {
      if (scheduleForm.objectives.length === 0) {
        setValidationErrors({ objectives: 'At least one objective required' });
        return;
      }

      data = {
        sourceId,
        debriefType: scheduleForm.debriefType,
        scheduledAt: new Date(scheduleForm.scheduledAt),
        location: {
          type: scheduleForm.locationType,
          identifier: scheduleForm.locationId,
          securityVerified: scheduleForm.securityVerified,
        },
        objectives: scheduleForm.objectives,
        policyLabels: {
          classification: scheduleForm.classification,
          caveats: [],
          releasableTo: [],
          originatorControl: false,
          legalBasis: 'EO 12333',
          needToKnow: [],
          retentionPeriod: 365,
        },
      } as CreateDebriefInput;
    } else if (mode === 'conduct') {
      data = {
        topicsCovered: conductForm.topicsCovered,
        rawNotes: conductForm.rawNotes,
        sourceDemeanor: conductForm.sourceDemeanor,
        credibilityObservations: conductForm.credibilityObservations,
      } as UpdateDebriefInput;
    } else {
      data = {
        endedAt: new Date(),
        processedNotes: completeForm.processedNotes,
        intelligenceItems: completeForm.intelligenceItems.filter(
          (i) => i.topic && i.content,
        ),
        taskings: completeForm.taskings.filter((t) => t.description),
        securityAssessment: completeForm.securityAssessment,
      } as CompleteDebriefInput;
    }

    await onSubmit(data);
  }, [mode, sourceId, scheduleForm, conductForm, completeForm, onSubmit]);

  // Render different steps
  const renderScheduleStep = () => (
    <div className="debrief-step">
      <h3>Schedule Debrief</h3>

      <div className="form-row">
        <div className="form-field">
          <label htmlFor="debriefType">Debrief Type</label>
          <select
            id="debriefType"
            value={scheduleForm.debriefType}
            onChange={(e) => handleScheduleChange('debriefType', e.target.value)}
          >
            {Object.entries(DEBRIEF_TYPES).map(([key, value]) => (
              <option key={key} value={value}>
                {key.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>

        <div className="form-field">
          <label htmlFor="scheduledAt">Scheduled Date/Time</label>
          <input
            id="scheduledAt"
            type="datetime-local"
            value={scheduleForm.scheduledAt}
            onChange={(e) => handleScheduleChange('scheduledAt', e.target.value)}
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-field">
          <label htmlFor="locationType">Location Type</label>
          <select
            id="locationType"
            value={scheduleForm.locationType}
            onChange={(e) => handleScheduleChange('locationType', e.target.value)}
          >
            <option value="SAFE_HOUSE">Safe House</option>
            <option value="NEUTRAL">Neutral Location</option>
            <option value="VEHICLE">Vehicle</option>
            <option value="VIRTUAL">Virtual</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        <div className="form-field">
          <label htmlFor="locationId">Location Identifier</label>
          <input
            id="locationId"
            type="text"
            value={scheduleForm.locationId}
            onChange={(e) => handleScheduleChange('locationId', e.target.value)}
            placeholder="Location code or address"
          />
        </div>
      </div>

      <div className="form-field checkbox-field">
        <label>
          <input
            type="checkbox"
            checked={scheduleForm.securityVerified}
            onChange={(e) => handleScheduleChange('securityVerified', e.target.checked)}
          />
          Location Security Verified
        </label>
      </div>

      <div className="form-field">
        <label htmlFor="classification">Classification</label>
        <select
          id="classification"
          value={scheduleForm.classification}
          onChange={(e) => handleScheduleChange('classification', e.target.value)}
        >
          {Object.entries(CLASSIFICATION_LEVELS).map(([key, value]) => (
            <option key={key} value={value}>
              {key.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        className="btn-secondary"
        onClick={() => goToStep('objectives')}
      >
        Next: Set Objectives
      </button>
    </div>
  );

  const renderObjectivesStep = () => (
    <div className="debrief-step">
      <h3>Debrief Objectives</h3>

      <div className="form-field">
        <label>Objectives *</label>
        <div className="objective-input">
          <input
            type="text"
            value={objectiveInput}
            onChange={(e) => setObjectiveInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addObjective();
              }
            }}
            placeholder="Enter objective and press Enter"
          />
          <button type="button" onClick={addObjective}>
            Add
          </button>
        </div>
        <ul className="objectives-list">
          {scheduleForm.objectives.map((obj, i) => (
            <li key={i}>
              {obj}
              <button type="button" onClick={() => removeObjective(i)}>
                ×
              </button>
            </li>
          ))}
        </ul>
        {validationErrors.objectives && (
          <span className="field-error">{validationErrors.objectives}</span>
        )}
      </div>

      <div className="step-navigation">
        <button type="button" className="btn-secondary" onClick={() => goToStep('schedule')}>
          Back
        </button>
        <button type="button" className="btn-primary" onClick={handleSubmit} disabled={isLoading}>
          {isLoading ? 'Scheduling...' : 'Schedule Debrief'}
        </button>
      </div>
    </div>
  );

  const renderNotesStep = () => (
    <div className="debrief-step">
      <h3>Session Notes - {sourceCryptonym}</h3>

      <div className="form-field">
        <label>Topics Covered</label>
        <div className="tag-input">
          <input
            type="text"
            value={topicInput}
            onChange={(e) => setTopicInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addTopic();
              }
            }}
            placeholder="Add topic"
          />
          <div className="tags">
            {conductForm.topicsCovered.map((topic, i) => (
              <span key={i} className="tag">
                {topic}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="form-field">
        <label htmlFor="rawNotes">Raw Notes</label>
        <textarea
          id="rawNotes"
          value={conductForm.rawNotes}
          onChange={(e) => handleConductChange('rawNotes', e.target.value)}
          rows={10}
          placeholder="Document the debrief session in detail..."
        />
      </div>

      <div className="form-row">
        <div className="form-field">
          <label htmlFor="sourceDemeanor">Source Demeanor</label>
          <textarea
            id="sourceDemeanor"
            value={conductForm.sourceDemeanor}
            onChange={(e) => handleConductChange('sourceDemeanor', e.target.value)}
            rows={3}
            placeholder="Describe source behavior, body language, emotional state..."
          />
        </div>

        <div className="form-field">
          <label htmlFor="credibilityObservations">Credibility Observations</label>
          <textarea
            id="credibilityObservations"
            value={conductForm.credibilityObservations}
            onChange={(e) => handleConductChange('credibilityObservations', e.target.value)}
            rows={3}
            placeholder="Note any credibility concerns or confirmations..."
          />
        </div>
      </div>

      <div className="step-navigation">
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Save & Exit
        </button>
        <button type="button" className="btn-primary" onClick={handleSubmit} disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save Notes'}
        </button>
      </div>
    </div>
  );

  const renderIntelligenceStep = () => (
    <div className="debrief-step">
      <h3>Intelligence Extraction</h3>

      <div className="form-field">
        <label htmlFor="processedNotes">Processed Notes</label>
        <textarea
          id="processedNotes"
          value={completeForm.processedNotes}
          onChange={(e) => handleCompleteChange('processedNotes', e.target.value)}
          rows={6}
          placeholder="Summarize and structure the raw notes..."
        />
      </div>

      <div className="intelligence-items">
        <h4>Intelligence Items</h4>
        {completeForm.intelligenceItems.map((item, index) => (
          <div key={item.id || index} className="intelligence-item-card">
            <div className="form-row">
              <div className="form-field">
                <label>Topic</label>
                <input
                  type="text"
                  value={item.topic || ''}
                  onChange={(e) => updateIntelligenceItem(index, 'topic', e.target.value)}
                  placeholder="Intelligence topic"
                />
              </div>
              <div className="form-field">
                <label>Info Rating</label>
                <select
                  value={item.informationRating || '3'}
                  onChange={(e) =>
                    updateIntelligenceItem(index, 'informationRating', e.target.value)
                  }
                >
                  <option value="1">1 - Confirmed</option>
                  <option value="2">2 - Probably True</option>
                  <option value="3">3 - Possibly True</option>
                  <option value="4">4 - Doubtful</option>
                  <option value="5">5 - Improbable</option>
                  <option value="6">6 - Cannot Judge</option>
                </select>
              </div>
              <div className="form-field">
                <label>Actionability</label>
                <select
                  value={item.actionability || 'BACKGROUND'}
                  onChange={(e) =>
                    updateIntelligenceItem(index, 'actionability', e.target.value)
                  }
                >
                  <option value="IMMEDIATE">Immediate</option>
                  <option value="SHORT_TERM">Short Term</option>
                  <option value="LONG_TERM">Long Term</option>
                  <option value="BACKGROUND">Background</option>
                </select>
              </div>
            </div>
            <div className="form-field">
              <label>Content</label>
              <textarea
                value={item.content || ''}
                onChange={(e) => updateIntelligenceItem(index, 'content', e.target.value)}
                rows={3}
                placeholder="Detailed intelligence content..."
              />
            </div>
            <button
              type="button"
              className="remove-btn"
              onClick={() => removeIntelligenceItem(index)}
            >
              Remove
            </button>
          </div>
        ))}
        <button type="button" className="add-btn" onClick={addIntelligenceItem}>
          + Add Intelligence Item
        </button>
      </div>

      <div className="taskings">
        <h4>Follow-up Taskings</h4>
        {completeForm.taskings.map((tasking, index) => (
          <div key={tasking.id || index} className="tasking-row">
            <input
              type="text"
              value={tasking.description || ''}
              onChange={(e) => updateTasking(index, 'description', e.target.value)}
              placeholder="Tasking description"
            />
            <select
              value={tasking.priority || 'MEDIUM'}
              onChange={(e) => updateTasking(index, 'priority', e.target.value)}
            >
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
        ))}
        <button type="button" className="add-btn" onClick={addTasking}>
          + Add Tasking
        </button>
      </div>

      <div className="step-navigation">
        <button type="button" className="btn-secondary" onClick={() => goToStep('security')}>
          Next: Security Assessment
        </button>
      </div>
    </div>
  );

  const renderSecurityStep = () => (
    <div className="debrief-step">
      <h3>Security Assessment</h3>

      <div className="form-field">
        <label htmlFor="compromiseRisk">Source Compromise Risk</label>
        <select
          id="compromiseRisk"
          value={completeForm.securityAssessment.sourceCompromiseRisk || 'NONE'}
          onChange={(e) =>
            handleSecurityAssessmentChange('sourceCompromiseRisk', e.target.value)
          }
        >
          <option value="NONE">None</option>
          <option value="LOW">Low</option>
          <option value="MODERATE">Moderate</option>
          <option value="HIGH">High</option>
          <option value="CRITICAL">Critical</option>
        </select>
      </div>

      <div className="form-field">
        <label htmlFor="evaluatorNotes">Security Evaluator Notes</label>
        <textarea
          id="evaluatorNotes"
          value={completeForm.securityAssessment.evaluatorNotes || ''}
          onChange={(e) => handleSecurityAssessmentChange('evaluatorNotes', e.target.value)}
          rows={4}
          placeholder="Document any security concerns, CI indicators, or recommended actions..."
        />
      </div>

      <div className="step-navigation">
        <button type="button" className="btn-secondary" onClick={() => goToStep('intelligence')}>
          Back
        </button>
        <button type="button" className="btn-primary" onClick={handleSubmit} disabled={isLoading}>
          {isLoading ? 'Completing...' : 'Complete Debrief'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="debrief-form">
      <div className="form-header">
        <h2>Debrief: {sourceCryptonym}</h2>
        {error && <div className="form-error-banner">{error}</div>}
      </div>

      {mode === 'schedule' && currentStep === 'schedule' && renderScheduleStep()}
      {mode === 'schedule' && currentStep === 'objectives' && renderObjectivesStep()}
      {mode === 'conduct' && renderNotesStep()}
      {mode === 'complete' && currentStep === 'intelligence' && renderIntelligenceStep()}
      {mode === 'complete' && currentStep === 'security' && renderSecurityStep()}

      <div className="form-footer">
        <button type="button" className="btn-cancel" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
};
