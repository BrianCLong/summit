"use strict";
// @ts-nocheck
/**
 * Debrief Form Component
 *
 * Multi-step form for conducting and documenting debrief sessions.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DebriefForm = void 0;
const react_1 = __importStar(require("react"));
const constants_js_1 = require("../constants.js");
const DebriefForm = ({ sourceId, sourceCryptonym, mode, initialData, onSubmit, onCancel, isLoading = false, error = null, }) => {
    const [currentStep, setCurrentStep] = (0, react_1.useState)(mode === 'schedule' ? 'schedule' : mode === 'conduct' ? 'notes' : 'intelligence');
    const [scheduleForm, setScheduleForm] = (0, react_1.useState)({
        debriefType: initialData?.debriefType || 'SCHEDULED',
        scheduledAt: initialData?.scheduledAt
            ? new Date(initialData.scheduledAt).toISOString().slice(0, 16)
            : new Date().toISOString().slice(0, 16),
        locationType: 'SAFE_HOUSE',
        locationId: '',
        securityVerified: false,
        objectives: [],
        classification: 'SECRET',
    });
    const [conductForm, setConductForm] = (0, react_1.useState)({
        topicsCovered: initialData?.topicsCovered || [],
        rawNotes: initialData?.rawNotes || '',
        sourceDemeanor: '',
        credibilityObservations: '',
    });
    const [completeForm, setCompleteForm] = (0, react_1.useState)({
        processedNotes: initialData?.processedNotes || '',
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
    const [objectiveInput, setObjectiveInput] = (0, react_1.useState)('');
    const [topicInput, setTopicInput] = (0, react_1.useState)('');
    const [validationErrors, setValidationErrors] = (0, react_1.useState)({});
    // Schedule form handlers
    const handleScheduleChange = (0, react_1.useCallback)((field, value) => {
        setScheduleForm((prev) => ({ ...prev, [field]: value }));
        setValidationErrors((prev) => ({ ...prev, [field]: '' }));
    }, []);
    const addObjective = (0, react_1.useCallback)(() => {
        if (objectiveInput.trim()) {
            setScheduleForm((prev) => ({
                ...prev,
                objectives: [...prev.objectives, objectiveInput.trim()],
            }));
            setObjectiveInput('');
        }
    }, [objectiveInput]);
    const removeObjective = (0, react_1.useCallback)((index) => {
        setScheduleForm((prev) => ({
            ...prev,
            objectives: prev.objectives.filter((_, i) => i !== index),
        }));
    }, []);
    // Conduct form handlers
    const handleConductChange = (0, react_1.useCallback)((field, value) => {
        setConductForm((prev) => ({ ...prev, [field]: value }));
    }, []);
    const addTopic = (0, react_1.useCallback)(() => {
        if (topicInput.trim()) {
            setConductForm((prev) => ({
                ...prev,
                topicsCovered: [...prev.topicsCovered, topicInput.trim()],
            }));
            setTopicInput('');
        }
    }, [topicInput]);
    // Complete form handlers
    const handleCompleteChange = (0, react_1.useCallback)((field, value) => {
        setCompleteForm((prev) => ({ ...prev, [field]: value }));
    }, []);
    const addIntelligenceItem = (0, react_1.useCallback)(() => {
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
    const updateIntelligenceItem = (0, react_1.useCallback)((index, field, value) => {
        setCompleteForm((prev) => ({
            ...prev,
            intelligenceItems: prev.intelligenceItems.map((item, i) => i === index ? { ...item, [field]: value } : item),
        }));
    }, []);
    const removeIntelligenceItem = (0, react_1.useCallback)((index) => {
        setCompleteForm((prev) => ({
            ...prev,
            intelligenceItems: prev.intelligenceItems.filter((_, i) => i !== index),
        }));
    }, []);
    const addTasking = (0, react_1.useCallback)(() => {
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
    const updateTasking = (0, react_1.useCallback)((index, field, value) => {
        setCompleteForm((prev) => ({
            ...prev,
            taskings: prev.taskings.map((item, i) => i === index ? { ...item, [field]: value } : item),
        }));
    }, []);
    const handleSecurityAssessmentChange = (0, react_1.useCallback)((field, value) => {
        setCompleteForm((prev) => ({
            ...prev,
            securityAssessment: { ...prev.securityAssessment, [field]: value },
        }));
    }, []);
    // Navigation
    const goToStep = (0, react_1.useCallback)((step) => {
        setCurrentStep(step);
    }, []);
    // Submit handlers
    const handleSubmit = (0, react_1.useCallback)(async () => {
        let data;
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
            };
        }
        else if (mode === 'conduct') {
            data = {
                topicsCovered: conductForm.topicsCovered,
                rawNotes: conductForm.rawNotes,
                sourceDemeanor: conductForm.sourceDemeanor,
                credibilityObservations: conductForm.credibilityObservations,
            };
        }
        else {
            data = {
                endedAt: new Date(),
                processedNotes: completeForm.processedNotes,
                intelligenceItems: completeForm.intelligenceItems.filter((i) => i.topic && i.content),
                taskings: completeForm.taskings.filter((t) => t.description),
                securityAssessment: completeForm.securityAssessment,
            };
        }
        await onSubmit(data);
    }, [mode, sourceId, scheduleForm, conductForm, completeForm, onSubmit]);
    // Render different steps
    const renderScheduleStep = () => (<div className="debrief-step">
      <h3>Schedule Debrief</h3>

      <div className="form-row">
        <div className="form-field">
          <label htmlFor="debriefType">Debrief Type</label>
          <select id="debriefType" value={scheduleForm.debriefType} onChange={(e) => handleScheduleChange('debriefType', e.target.value)}>
            {Object.entries(constants_js_1.DEBRIEF_TYPES).map(([key, value]) => (<option key={key} value={value}>
                {key.replace(/_/g, ' ')}
              </option>))}
          </select>
        </div>

        <div className="form-field">
          <label htmlFor="scheduledAt">Scheduled Date/Time</label>
          <input id="scheduledAt" type="datetime-local" value={scheduleForm.scheduledAt} onChange={(e) => handleScheduleChange('scheduledAt', e.target.value)}/>
        </div>
      </div>

      <div className="form-row">
        <div className="form-field">
          <label htmlFor="locationType">Location Type</label>
          <select id="locationType" value={scheduleForm.locationType} onChange={(e) => handleScheduleChange('locationType', e.target.value)}>
            <option value="SAFE_HOUSE">Safe House</option>
            <option value="NEUTRAL">Neutral Location</option>
            <option value="VEHICLE">Vehicle</option>
            <option value="VIRTUAL">Virtual</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        <div className="form-field">
          <label htmlFor="locationId">Location Identifier</label>
          <input id="locationId" type="text" value={scheduleForm.locationId} onChange={(e) => handleScheduleChange('locationId', e.target.value)} placeholder="Location code or address"/>
        </div>
      </div>

      <div className="form-field checkbox-field">
        <label>
          <input type="checkbox" checked={scheduleForm.securityVerified} onChange={(e) => handleScheduleChange('securityVerified', e.target.checked)}/>
          Location Security Verified
        </label>
      </div>

      <div className="form-field">
        <label htmlFor="classification">Classification</label>
        <select id="classification" value={scheduleForm.classification} onChange={(e) => handleScheduleChange('classification', e.target.value)}>
          {Object.entries(constants_js_1.CLASSIFICATION_LEVELS).map(([key, value]) => (<option key={key} value={value}>
              {key.replace(/_/g, ' ')}
            </option>))}
        </select>
      </div>

      <button type="button" className="btn-secondary" onClick={() => goToStep('objectives')}>
        Next: Set Objectives
      </button>
    </div>);
    const renderObjectivesStep = () => (<div className="debrief-step">
      <h3>Debrief Objectives</h3>

      <div className="form-field">
        <label>Objectives *</label>
        <div className="objective-input">
          <input type="text" value={objectiveInput} onChange={(e) => setObjectiveInput(e.target.value)} onKeyDown={(e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addObjective();
            }
        }} placeholder="Enter objective and press Enter"/>
          <button type="button" onClick={addObjective}>
            Add
          </button>
        </div>
        <ul className="objectives-list">
          {scheduleForm.objectives.map((obj, i) => (<li key={i}>
              {obj}
              <button type="button" onClick={() => removeObjective(i)}>
                ×
              </button>
            </li>))}
        </ul>
        {validationErrors.objectives && (<span className="field-error">{validationErrors.objectives}</span>)}
      </div>

      <div className="step-navigation">
        <button type="button" className="btn-secondary" onClick={() => goToStep('schedule')}>
          Back
        </button>
        <button type="button" className="btn-primary" onClick={handleSubmit} disabled={isLoading}>
          {isLoading ? 'Scheduling...' : 'Schedule Debrief'}
        </button>
      </div>
    </div>);
    const renderNotesStep = () => (<div className="debrief-step">
      <h3>Session Notes - {sourceCryptonym}</h3>

      <div className="form-field">
        <label>Topics Covered</label>
        <div className="tag-input">
          <input type="text" value={topicInput} onChange={(e) => setTopicInput(e.target.value)} onKeyDown={(e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addTopic();
            }
        }} placeholder="Add topic"/>
          <div className="tags">
            {conductForm.topicsCovered.map((topic, i) => (<span key={i} className="tag">
                {topic}
              </span>))}
          </div>
        </div>
      </div>

      <div className="form-field">
        <label htmlFor="rawNotes">Raw Notes</label>
        <textarea id="rawNotes" value={conductForm.rawNotes} onChange={(e) => handleConductChange('rawNotes', e.target.value)} rows={10} placeholder="Document the debrief session in detail..."/>
      </div>

      <div className="form-row">
        <div className="form-field">
          <label htmlFor="sourceDemeanor">Source Demeanor</label>
          <textarea id="sourceDemeanor" value={conductForm.sourceDemeanor} onChange={(e) => handleConductChange('sourceDemeanor', e.target.value)} rows={3} placeholder="Describe source behavior, body language, emotional state..."/>
        </div>

        <div className="form-field">
          <label htmlFor="credibilityObservations">Credibility Observations</label>
          <textarea id="credibilityObservations" value={conductForm.credibilityObservations} onChange={(e) => handleConductChange('credibilityObservations', e.target.value)} rows={3} placeholder="Note any credibility concerns or confirmations..."/>
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
    </div>);
    const renderIntelligenceStep = () => (<div className="debrief-step">
      <h3>Intelligence Extraction</h3>

      <div className="form-field">
        <label htmlFor="processedNotes">Processed Notes</label>
        <textarea id="processedNotes" value={completeForm.processedNotes} onChange={(e) => handleCompleteChange('processedNotes', e.target.value)} rows={6} placeholder="Summarize and structure the raw notes..."/>
      </div>

      <div className="intelligence-items">
        <h4>Intelligence Items</h4>
        {completeForm.intelligenceItems.map((item, index) => (<div key={item.id || index} className="intelligence-item-card">
            <div className="form-row">
              <div className="form-field">
                <label>Topic</label>
                <input type="text" value={item.topic || ''} onChange={(e) => updateIntelligenceItem(index, 'topic', e.target.value)} placeholder="Intelligence topic"/>
              </div>
              <div className="form-field">
                <label>Info Rating</label>
                <select value={item.informationRating || '3'} onChange={(e) => updateIntelligenceItem(index, 'informationRating', e.target.value)}>
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
                <select value={item.actionability || 'BACKGROUND'} onChange={(e) => updateIntelligenceItem(index, 'actionability', e.target.value)}>
                  <option value="IMMEDIATE">Immediate</option>
                  <option value="SHORT_TERM">Short Term</option>
                  <option value="LONG_TERM">Long Term</option>
                  <option value="BACKGROUND">Background</option>
                </select>
              </div>
            </div>
            <div className="form-field">
              <label>Content</label>
              <textarea value={item.content || ''} onChange={(e) => updateIntelligenceItem(index, 'content', e.target.value)} rows={3} placeholder="Detailed intelligence content..."/>
            </div>
            <button type="button" className="remove-btn" onClick={() => removeIntelligenceItem(index)}>
              Remove
            </button>
          </div>))}
        <button type="button" className="add-btn" onClick={addIntelligenceItem}>
          + Add Intelligence Item
        </button>
      </div>

      <div className="taskings">
        <h4>Follow-up Taskings</h4>
        {completeForm.taskings.map((tasking, index) => (<div key={tasking.id || index} className="tasking-row">
            <input type="text" value={tasking.description || ''} onChange={(e) => updateTasking(index, 'description', e.target.value)} placeholder="Tasking description"/>
            <select value={tasking.priority || 'MEDIUM'} onChange={(e) => updateTasking(index, 'priority', e.target.value)}>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>))}
        <button type="button" className="add-btn" onClick={addTasking}>
          + Add Tasking
        </button>
      </div>

      <div className="step-navigation">
        <button type="button" className="btn-secondary" onClick={() => goToStep('security')}>
          Next: Security Assessment
        </button>
      </div>
    </div>);
    const renderSecurityStep = () => (<div className="debrief-step">
      <h3>Security Assessment</h3>

      <div className="form-field">
        <label htmlFor="compromiseRisk">Source Compromise Risk</label>
        <select id="compromiseRisk" value={completeForm.securityAssessment.sourceCompromiseRisk || 'NONE'} onChange={(e) => handleSecurityAssessmentChange('sourceCompromiseRisk', e.target.value)}>
          <option value="NONE">None</option>
          <option value="LOW">Low</option>
          <option value="MODERATE">Moderate</option>
          <option value="HIGH">High</option>
          <option value="CRITICAL">Critical</option>
        </select>
      </div>

      <div className="form-field">
        <label htmlFor="evaluatorNotes">Security Evaluator Notes</label>
        <textarea id="evaluatorNotes" value={completeForm.securityAssessment.evaluatorNotes || ''} onChange={(e) => handleSecurityAssessmentChange('evaluatorNotes', e.target.value)} rows={4} placeholder="Document any security concerns, CI indicators, or recommended actions..."/>
      </div>

      <div className="step-navigation">
        <button type="button" className="btn-secondary" onClick={() => goToStep('intelligence')}>
          Back
        </button>
        <button type="button" className="btn-primary" onClick={handleSubmit} disabled={isLoading}>
          {isLoading ? 'Completing...' : 'Complete Debrief'}
        </button>
      </div>
    </div>);
    return (<div className="debrief-form">
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
    </div>);
};
exports.DebriefForm = DebriefForm;
