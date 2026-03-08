"use strict";
// @ts-nocheck
/**
 * Source Registration Form
 *
 * Form component for registering new HUMINT sources.
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
exports.SourceRegistrationForm = void 0;
const react_1 = __importStar(require("react"));
const constants_js_1 = require("../constants.js");
const initialFormState = {
    cryptonym: '',
    sourceType: 'ASSET',
    handlerId: '',
    alternateHandlerId: '',
    credibilityRating: 'F',
    riskLevel: 'MODERATE',
    areaOfOperation: [],
    topicalAccess: [],
    recruitmentDate: new Date().toISOString().split('T')[0],
    languages: [],
    motivationFactors: [],
    classification: 'SECRET',
    legalBasis: '',
    compensationType: 'NONE',
    compensationAmount: '',
    compensationCurrency: 'USD',
    notes: '',
};
const SourceRegistrationForm = ({ onSubmit, onCancel, handlers, isLoading = false, error = null, }) => {
    const [form, setForm] = (0, react_1.useState)(initialFormState);
    const [contactMethods, setContactMethods] = (0, react_1.useState)([
        { type: 'IN_PERSON', identifier: '', protocol: 'standard', isActive: true },
    ]);
    const [areaInput, setAreaInput] = (0, react_1.useState)('');
    const [topicInput, setTopicInput] = (0, react_1.useState)('');
    const [languageInput, setLanguageInput] = (0, react_1.useState)('');
    const [motivationInput, setMotivationInput] = (0, react_1.useState)('');
    const [validationErrors, setValidationErrors] = (0, react_1.useState)({});
    const handleChange = (0, react_1.useCallback)((field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        setValidationErrors((prev) => ({ ...prev, [field]: '' }));
    }, []);
    const addArrayItem = (0, react_1.useCallback)((field, value) => {
        if (value.trim()) {
            setForm((prev) => ({
                ...prev,
                [field]: [...prev[field], value.trim()],
            }));
        }
    }, []);
    const removeArrayItem = (0, react_1.useCallback)((field, index) => {
        setForm((prev) => ({
            ...prev,
            [field]: prev[field].filter((_, i) => i !== index),
        }));
    }, []);
    const addContactMethod = (0, react_1.useCallback)(() => {
        setContactMethods((prev) => [
            ...prev,
            { type: 'IN_PERSON', identifier: '', protocol: 'standard', isActive: true },
        ]);
    }, []);
    const updateContactMethod = (0, react_1.useCallback)((index, field, value) => {
        setContactMethods((prev) => prev.map((cm, i) => (i === index ? { ...cm, [field]: value } : cm)));
    }, []);
    const removeContactMethod = (0, react_1.useCallback)((index) => {
        setContactMethods((prev) => prev.filter((_, i) => i !== index));
    }, []);
    const validate = (0, react_1.useCallback)(() => {
        const errors = {};
        if (!form.cryptonym || form.cryptonym.length < 3) {
            errors.cryptonym = 'Cryptonym must be at least 3 characters';
        }
        if (!/^[A-Z][A-Z0-9_-]*$/.test(form.cryptonym)) {
            errors.cryptonym = 'Cryptonym must start with letter and be uppercase';
        }
        if (!form.handlerId) {
            errors.handlerId = 'Handler is required';
        }
        if (form.areaOfOperation.length === 0) {
            errors.areaOfOperation = 'At least one area of operation required';
        }
        if (contactMethods.length === 0 || !contactMethods[0].identifier) {
            errors.contactMethods = 'At least one contact method required';
        }
        if (!form.legalBasis) {
            errors.legalBasis = 'Legal basis is required';
        }
        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    }, [form, contactMethods]);
    const handleSubmit = (0, react_1.useCallback)(async (e) => {
        e.preventDefault();
        if (!validate())
            return;
        const data = {
            cryptonym: form.cryptonym.toUpperCase(),
            sourceType: form.sourceType,
            handlerId: form.handlerId,
            alternateHandlerId: form.alternateHandlerId || undefined,
            credibilityRating: form.credibilityRating,
            riskLevel: form.riskLevel,
            areaOfOperation: form.areaOfOperation,
            topicalAccess: form.topicalAccess,
            recruitmentDate: new Date(form.recruitmentDate),
            languages: form.languages,
            motivationFactors: form.motivationFactors,
            contactMethods: contactMethods.map((cm, i) => ({
                id: `temp-${i}`,
                type: cm.type,
                identifier: cm.identifier || '',
                protocol: cm.protocol || 'standard',
                isActive: cm.isActive ?? true,
            })),
            compensation: {
                type: form.compensationType,
                amount: form.compensationAmount ? Number(form.compensationAmount) : undefined,
                currency: form.compensationCurrency || undefined,
            },
            policyLabels: {
                classification: form.classification,
                caveats: [],
                releasableTo: [],
                originatorControl: false,
                legalBasis: form.legalBasis,
                needToKnow: [],
                retentionPeriod: 365,
            },
            notes: form.notes,
        };
        await onSubmit(data);
    }, [form, contactMethods, validate, onSubmit]);
    return (<form onSubmit={handleSubmit} className="humint-source-form">
      <div className="form-header">
        <h2>Register New HUMINT Source</h2>
        <p className="form-description">
          Complete all required fields to register a new human intelligence source.
        </p>
      </div>

      {error && <div className="form-error-banner">{error}</div>}

      {/* Basic Information */}
      <fieldset className="form-section">
        <legend>Basic Information</legend>

        <div className="form-row">
          <div className="form-field">
            <label htmlFor="cryptonym">Cryptonym *</label>
            <input id="cryptonym" type="text" value={form.cryptonym} onChange={(e) => handleChange('cryptonym', e.target.value.toUpperCase())} placeholder="e.g., FALCON-7" className={validationErrors.cryptonym ? 'error' : ''}/>
            {validationErrors.cryptonym && (<span className="field-error">{validationErrors.cryptonym}</span>)}
          </div>

          <div className="form-field">
            <label htmlFor="sourceType">Source Type *</label>
            <select id="sourceType" value={form.sourceType} onChange={(e) => handleChange('sourceType', e.target.value)}>
              {Object.entries(constants_js_1.SOURCE_TYPES).map(([key, value]) => (<option key={key} value={value}>
                  {key.replace(/_/g, ' ')}
                </option>))}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-field">
            <label htmlFor="handlerId">Primary Handler *</label>
            <select id="handlerId" value={form.handlerId} onChange={(e) => handleChange('handlerId', e.target.value)} className={validationErrors.handlerId ? 'error' : ''}>
              <option value="">Select handler...</option>
              {handlers.map((h) => (<option key={h.id} value={h.id}>
                  {h.name}
                </option>))}
            </select>
            {validationErrors.handlerId && (<span className="field-error">{validationErrors.handlerId}</span>)}
          </div>

          <div className="form-field">
            <label htmlFor="alternateHandlerId">Alternate Handler</label>
            <select id="alternateHandlerId" value={form.alternateHandlerId} onChange={(e) => handleChange('alternateHandlerId', e.target.value)}>
              <option value="">Select alternate...</option>
              {handlers
            .filter((h) => h.id !== form.handlerId)
            .map((h) => (<option key={h.id} value={h.id}>
                    {h.name}
                  </option>))}
            </select>
          </div>
        </div>

        <div className="form-field">
          <label htmlFor="recruitmentDate">Recruitment Date *</label>
          <input id="recruitmentDate" type="date" value={form.recruitmentDate} onChange={(e) => handleChange('recruitmentDate', e.target.value)}/>
        </div>
      </fieldset>

      {/* Assessment */}
      <fieldset className="form-section">
        <legend>Assessment</legend>

        <div className="form-row">
          <div className="form-field">
            <label htmlFor="credibilityRating">Initial Credibility Rating</label>
            <select id="credibilityRating" value={form.credibilityRating} onChange={(e) => handleChange('credibilityRating', e.target.value)}>
              {Object.entries(constants_js_1.CREDIBILITY_RATINGS).map(([key, value]) => (<option key={key} value={key}>
                  {key} - {value.label}
                </option>))}
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="riskLevel">Risk Level</label>
            <select id="riskLevel" value={form.riskLevel} onChange={(e) => handleChange('riskLevel', e.target.value)}>
              {Object.entries(constants_js_1.RISK_LEVELS).map(([key, value]) => (<option key={key} value={key}>
                  {value.label}
                </option>))}
            </select>
          </div>
        </div>
      </fieldset>

      {/* Access & Coverage */}
      <fieldset className="form-section">
        <legend>Access & Coverage</legend>

        <div className="form-field">
          <label>Areas of Operation *</label>
          <div className="tag-input">
            <input type="text" value={areaInput} onChange={(e) => setAreaInput(e.target.value)} onKeyDown={(e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addArrayItem('areaOfOperation', areaInput);
                setAreaInput('');
            }
        }} placeholder="Add area and press Enter"/>
            <div className="tags">
              {form.areaOfOperation.map((area, i) => (<span key={i} className="tag">
                  {area}
                  <button type="button" onClick={() => removeArrayItem('areaOfOperation', i)}>
                    ×
                  </button>
                </span>))}
            </div>
          </div>
          {validationErrors.areaOfOperation && (<span className="field-error">{validationErrors.areaOfOperation}</span>)}
        </div>

        <div className="form-field">
          <label>Topical Access</label>
          <div className="tag-input">
            <input type="text" value={topicInput} onChange={(e) => setTopicInput(e.target.value)} onKeyDown={(e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addArrayItem('topicalAccess', topicInput);
                setTopicInput('');
            }
        }} placeholder="Add topic and press Enter"/>
            <div className="tags">
              {form.topicalAccess.map((topic, i) => (<span key={i} className="tag">
                  {topic}
                  <button type="button" onClick={() => removeArrayItem('topicalAccess', i)}>
                    ×
                  </button>
                </span>))}
            </div>
          </div>
        </div>

        <div className="form-field">
          <label>Languages</label>
          <div className="tag-input">
            <input type="text" value={languageInput} onChange={(e) => setLanguageInput(e.target.value)} onKeyDown={(e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addArrayItem('languages', languageInput);
                setLanguageInput('');
            }
        }} placeholder="Add language and press Enter"/>
            <div className="tags">
              {form.languages.map((lang, i) => (<span key={i} className="tag">
                  {lang}
                  <button type="button" onClick={() => removeArrayItem('languages', i)}>
                    ×
                  </button>
                </span>))}
            </div>
          </div>
        </div>
      </fieldset>

      {/* Contact Methods */}
      <fieldset className="form-section">
        <legend>Contact Methods *</legend>

        {contactMethods.map((cm, index) => (<div key={index} className="contact-method-row">
            <select value={cm.type} onChange={(e) => updateContactMethod(index, 'type', e.target.value)}>
              <option value="IN_PERSON">In Person</option>
              <option value="SECURE_PHONE">Secure Phone</option>
              <option value="SIGNAL">Signal</option>
              <option value="DEAD_DROP">Dead Drop</option>
              <option value="BRUSH_PASS">Brush Pass</option>
              <option value="VIRTUAL">Virtual</option>
              <option value="EMAIL">Email</option>
            </select>
            <input type="text" value={cm.identifier || ''} onChange={(e) => updateContactMethod(index, 'identifier', e.target.value)} placeholder="Identifier/Details"/>
            <input type="text" value={cm.protocol || ''} onChange={(e) => updateContactMethod(index, 'protocol', e.target.value)} placeholder="Protocol"/>
            {contactMethods.length > 1 && (<button type="button" className="remove-btn" onClick={() => removeContactMethod(index)}>
                Remove
              </button>)}
          </div>))}
        <button type="button" className="add-btn" onClick={addContactMethod}>
          + Add Contact Method
        </button>
        {validationErrors.contactMethods && (<span className="field-error">{validationErrors.contactMethods}</span>)}
      </fieldset>

      {/* Motivation & Compensation */}
      <fieldset className="form-section">
        <legend>Motivation & Compensation</legend>

        <div className="form-field">
          <label>Motivation Factors</label>
          <div className="tag-input">
            <input type="text" value={motivationInput} onChange={(e) => setMotivationInput(e.target.value)} onKeyDown={(e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addArrayItem('motivationFactors', motivationInput);
                setMotivationInput('');
            }
        }} placeholder="Add motivation and press Enter"/>
            <div className="tags">
              {form.motivationFactors.map((factor, i) => (<span key={i} className="tag">
                  {factor}
                  <button type="button" onClick={() => removeArrayItem('motivationFactors', i)}>
                    ×
                  </button>
                </span>))}
            </div>
          </div>
        </div>

        <div className="form-row">
          <div className="form-field">
            <label htmlFor="compensationType">Compensation Type</label>
            <select id="compensationType" value={form.compensationType} onChange={(e) => handleChange('compensationType', e.target.value)}>
              <option value="NONE">None</option>
              <option value="SALARY">Salary</option>
              <option value="STIPEND">Stipend</option>
              <option value="PER_REPORT">Per Report</option>
              <option value="EXPENSES_ONLY">Expenses Only</option>
            </select>
          </div>

          {form.compensationType !== 'NONE' && (<>
              <div className="form-field">
                <label htmlFor="compensationAmount">Amount</label>
                <input id="compensationAmount" type="number" value={form.compensationAmount} onChange={(e) => handleChange('compensationAmount', e.target.value)}/>
              </div>
              <div className="form-field">
                <label htmlFor="compensationCurrency">Currency</label>
                <select id="compensationCurrency" value={form.compensationCurrency} onChange={(e) => handleChange('compensationCurrency', e.target.value)}>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
            </>)}
        </div>
      </fieldset>

      {/* Classification */}
      <fieldset className="form-section">
        <legend>Security & Compliance</legend>

        <div className="form-row">
          <div className="form-field">
            <label htmlFor="classification">Classification *</label>
            <select id="classification" value={form.classification} onChange={(e) => handleChange('classification', e.target.value)}>
              {Object.entries(constants_js_1.CLASSIFICATION_LEVELS).map(([key, value]) => (<option key={key} value={value}>
                  {key.replace(/_/g, ' ')}
                </option>))}
            </select>
          </div>
        </div>

        <div className="form-field">
          <label htmlFor="legalBasis">Legal Basis *</label>
          <input id="legalBasis" type="text" value={form.legalBasis} onChange={(e) => handleChange('legalBasis', e.target.value)} placeholder="e.g., EO 12333, FISA, etc." className={validationErrors.legalBasis ? 'error' : ''}/>
          {validationErrors.legalBasis && (<span className="field-error">{validationErrors.legalBasis}</span>)}
        </div>
      </fieldset>

      {/* Notes */}
      <fieldset className="form-section">
        <legend>Additional Notes</legend>
        <div className="form-field">
          <textarea value={form.notes} onChange={(e) => handleChange('notes', e.target.value)} rows={4} placeholder="Any additional information about the source..."/>
        </div>
      </fieldset>

      {/* Actions */}
      <div className="form-actions">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={isLoading}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={isLoading}>
          {isLoading ? 'Registering...' : 'Register Source'}
        </button>
      </div>
    </form>);
};
exports.SourceRegistrationForm = SourceRegistrationForm;
