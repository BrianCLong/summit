"use strict";
/**
 * Policy Editor Component
 *
 * Dialog for creating and editing governance policies.
 *
 * SOC 2 Controls: CC6.1, CC6.2, CC7.2, PI1.1
 *
 * @module pages/Policies/PolicyEditor
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
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
const usePolicies_1 = require("../../hooks/usePolicies");
const defaultFormData = {
    name: '',
    displayName: '',
    description: '',
    category: 'operational',
    priority: 100,
    action: 'ALLOW',
    stages: ['runtime'],
    tenants: ['*'],
    rules: [],
    effectiveFrom: '',
    effectiveUntil: '',
    changelog: '',
};
const CATEGORIES = [
    'access', 'data', 'export', 'retention', 'compliance', 'operational', 'safety'
];
const ACTIONS = ['ALLOW', 'DENY', 'ESCALATE', 'WARN'];
const STAGES = ['data', 'train', 'alignment', 'runtime'];
const OPERATORS = ['eq', 'neq', 'lt', 'gt', 'in', 'not_in', 'contains'];
const OPERATOR_LABELS = {
    eq: 'Equals (=)',
    neq: 'Not Equals (!=)',
    lt: 'Less Than (<)',
    gt: 'Greater Than (>)',
    in: 'In List',
    not_in: 'Not In List',
    contains: 'Contains',
};
// ============================================================================
// Helper Functions
// ============================================================================
const generatePolicyName = (displayName) => {
    return displayName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 50);
};
const parseRuleValue = (value, operator) => {
    if (operator === 'in' || operator === 'not_in') {
        try {
            return JSON.parse(value);
        }
        catch {
            return value.split(',').map(v => v.trim());
        }
    }
    // Try to parse as number
    const num = Number(value);
    if (!isNaN(num))
        return num;
    // Try to parse as boolean
    if (value === 'true')
        return true;
    if (value === 'false')
        return false;
    // Return as string
    return value;
};
const stringifyRuleValue = (value) => {
    if (Array.isArray(value)) {
        return JSON.stringify(value);
    }
    return String(value);
};
// ============================================================================
// Component
// ============================================================================
const PolicyEditor = ({ open, policy, onClose, onSave, }) => {
    const [formData, setFormData] = (0, react_1.useState)(defaultFormData);
    const [errors, setErrors] = (0, react_1.useState)({});
    const operations = (0, usePolicies_1.usePolicyOperations)();
    const isEditing = Boolean(policy);
    // Initialize form data when policy changes
    (0, react_1.useEffect)(() => {
        if (policy) {
            setFormData({
                name: policy.name,
                displayName: policy.displayName,
                description: policy.description || '',
                category: policy.category,
                priority: policy.priority,
                action: policy.action,
                stages: policy.scope.stages,
                tenants: policy.scope.tenants,
                rules: policy.rules,
                effectiveFrom: policy.effectiveFrom || '',
                effectiveUntil: policy.effectiveUntil || '',
                changelog: '',
            });
        }
        else {
            setFormData(defaultFormData);
        }
        setErrors({});
    }, [policy, open]);
    // Form field handlers
    const handleChange = (0, react_1.useCallback)((field) => (event) => {
        const value = event.target.value;
        setFormData((prev) => {
            const updated = { ...prev, [field]: value };
            // Auto-generate name from displayName for new policies
            if (field === 'displayName' && !isEditing) {
                updated.name = generatePolicyName(value);
            }
            return updated;
        });
        // Clear error when field is modified
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: '' }));
        }
    }, [errors, isEditing]);
    const handleSelectChange = (0, react_1.useCallback)((field) => (event) => {
        const value = event.target.value;
        setFormData((prev) => ({
            ...prev,
            [field]: field === 'category'
                ? value
                : value,
        }));
    }, []);
    const handleStagesChange = (0, react_1.useCallback)((_, value) => {
        setFormData((prev) => ({ ...prev, stages: value }));
    }, []);
    const handleTenantsChange = (0, react_1.useCallback)((_, value) => {
        setFormData((prev) => ({ ...prev, tenants: value.length > 0 ? value : ['*'] }));
    }, []);
    // Rule handlers
    const handleAddRule = (0, react_1.useCallback)(() => {
        setFormData((prev) => ({
            ...prev,
            rules: [...prev.rules, { field: '', operator: 'eq', value: '' }],
        }));
    }, []);
    const handleRemoveRule = (0, react_1.useCallback)((index) => {
        setFormData((prev) => ({
            ...prev,
            rules: prev.rules.filter((_, i) => i !== index),
        }));
    }, []);
    const handleRuleChange = (0, react_1.useCallback)((index, field, value) => {
        setFormData((prev) => ({
            ...prev,
            rules: prev.rules.map((rule, i) => {
                if (i !== index)
                    return rule;
                return { ...rule, [field]: value };
            }),
        }));
    }, []);
    // Validation
    const validate = (0, react_1.useCallback)(() => {
        const newErrors = {};
        if (!formData.name.trim()) {
            newErrors.name = 'Name is required';
        }
        else if (!/^[a-z0-9-]+$/.test(formData.name)) {
            newErrors.name = 'Name must be lowercase alphanumeric with hyphens';
        }
        if (!formData.displayName.trim()) {
            newErrors.displayName = 'Display name is required';
        }
        if (formData.stages.length === 0) {
            newErrors.stages = 'At least one stage is required';
        }
        if (formData.tenants.length === 0) {
            newErrors.tenants = 'At least one tenant is required';
        }
        // Validate rules
        formData.rules.forEach((rule, index) => {
            if (!rule.field.trim()) {
                newErrors[`rule_${index}_field`] = 'Field is required';
            }
        });
        if (isEditing && !formData.changelog.trim()) {
            newErrors.changelog = 'Changelog is required for updates';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [formData, isEditing]);
    // Submit handler
    const handleSubmit = (0, react_1.useCallback)(async () => {
        if (!validate())
            return;
        const scope = {
            stages: formData.stages,
            tenants: formData.tenants,
        };
        // Parse rule values
        const rules = formData.rules.map((rule) => ({
            field: rule.field,
            operator: rule.operator,
            value: parseRuleValue(stringifyRuleValue(rule.value), rule.operator),
        }));
        if (isEditing && policy) {
            const input = {
                displayName: formData.displayName,
                description: formData.description || undefined,
                category: formData.category,
                priority: formData.priority,
                scope,
                rules,
                action: formData.action,
                effectiveFrom: formData.effectiveFrom || undefined,
                effectiveUntil: formData.effectiveUntil || undefined,
                changelog: formData.changelog,
            };
            const result = await operations.updatePolicy(policy.id, input);
            if (result) {
                onSave();
            }
        }
        else {
            const input = {
                name: formData.name,
                displayName: formData.displayName,
                description: formData.description || undefined,
                category: formData.category,
                priority: formData.priority,
                scope,
                rules,
                action: formData.action,
                effectiveFrom: formData.effectiveFrom || undefined,
                effectiveUntil: formData.effectiveUntil || undefined,
            };
            const result = await operations.createPolicy(input);
            if (result) {
                onSave();
            }
        }
    }, [formData, isEditing, policy, operations, validate, onSave]);
    return (<material_1.Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { maxHeight: '90vh' } }}>
      <material_1.DialogTitle>
        {isEditing ? `Edit Policy: ${policy?.displayName}` : 'Create New Policy'}
      </material_1.DialogTitle>
      <material_1.DialogContent dividers>
        {operations.error && (<material_1.Alert severity="error" sx={{ mb: 2 }}>
            {operations.error}
          </material_1.Alert>)}

        <material_1.Grid container spacing={2}>
          {/* Basic Info */}
          <material_1.Grid item xs={12}>
            <material_1.Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Basic Information
            </material_1.Typography>
          </material_1.Grid>
          <material_1.Grid item xs={12} md={6}>
            <material_1.TextField fullWidth label="Display Name" value={formData.displayName} onChange={handleChange('displayName')} error={Boolean(errors.displayName)} helperText={errors.displayName} required/>
          </material_1.Grid>
          <material_1.Grid item xs={12} md={6}>
            <material_1.TextField fullWidth label="Policy Name (ID)" value={formData.name} onChange={handleChange('name')} error={Boolean(errors.name)} helperText={errors.name || 'Lowercase alphanumeric with hyphens'} disabled={isEditing} required/>
          </material_1.Grid>
          <material_1.Grid item xs={12}>
            <material_1.TextField fullWidth multiline rows={2} label="Description" value={formData.description} onChange={handleChange('description')}/>
          </material_1.Grid>

          {/* Classification */}
          <material_1.Grid item xs={12}>
            <material_1.Divider sx={{ my: 1 }}/>
            <material_1.Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Classification
            </material_1.Typography>
          </material_1.Grid>
          <material_1.Grid item xs={12} md={4}>
            <material_1.FormControl fullWidth>
              <material_1.InputLabel>Category</material_1.InputLabel>
              <material_1.Select value={formData.category} onChange={handleSelectChange('category')} label="Category">
                {CATEGORIES.map((cat) => (<material_1.MenuItem key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </material_1.MenuItem>))}
              </material_1.Select>
            </material_1.FormControl>
          </material_1.Grid>
          <material_1.Grid item xs={12} md={4}>
            <material_1.FormControl fullWidth>
              <material_1.InputLabel>Action</material_1.InputLabel>
              <material_1.Select value={formData.action} onChange={handleSelectChange('action')} label="Action">
                {ACTIONS.map((action) => (<material_1.MenuItem key={action} value={action}>
                    {action}
                  </material_1.MenuItem>))}
              </material_1.Select>
            </material_1.FormControl>
          </material_1.Grid>
          <material_1.Grid item xs={12} md={4}>
            <material_1.TextField fullWidth type="number" label="Priority" value={formData.priority} onChange={handleChange('priority')} inputProps={{ min: 1, max: 1000 }} helperText="Lower = higher priority"/>
          </material_1.Grid>

          {/* Scope */}
          <material_1.Grid item xs={12}>
            <material_1.Divider sx={{ my: 1 }}/>
            <material_1.Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Scope
            </material_1.Typography>
          </material_1.Grid>
          <material_1.Grid item xs={12} md={6}>
            <material_1.Autocomplete multiple options={STAGES} value={formData.stages} onChange={handleStagesChange} renderTags={(value, getTagProps) => value.map((option, index) => (<material_1.Chip size="small" label={option} {...getTagProps({ index })} key={option}/>))} renderInput={(params) => (<material_1.TextField {...params} label="Stages" error={Boolean(errors.stages)} helperText={errors.stages}/>)}/>
          </material_1.Grid>
          <material_1.Grid item xs={12} md={6}>
            <material_1.Autocomplete multiple freeSolo options={['*']} value={formData.tenants} onChange={handleTenantsChange} renderTags={(value, getTagProps) => value.map((option, index) => (<material_1.Chip size="small" label={option === '*' ? 'All Tenants' : option} {...getTagProps({ index })} key={option}/>))} renderInput={(params) => (<material_1.TextField {...params} label="Tenants" error={Boolean(errors.tenants)} helperText={errors.tenants || 'Use * for all tenants'}/>)}/>
          </material_1.Grid>

          {/* Effective Period */}
          <material_1.Grid item xs={12} md={6}>
            <material_1.TextField fullWidth type="datetime-local" label="Effective From" value={formData.effectiveFrom} onChange={handleChange('effectiveFrom')} InputLabelProps={{ shrink: true }}/>
          </material_1.Grid>
          <material_1.Grid item xs={12} md={6}>
            <material_1.TextField fullWidth type="datetime-local" label="Effective Until" value={formData.effectiveUntil} onChange={handleChange('effectiveUntil')} InputLabelProps={{ shrink: true }}/>
          </material_1.Grid>

          {/* Rules */}
          <material_1.Grid item xs={12}>
            <material_1.Divider sx={{ my: 1 }}/>
            <material_1.Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <material_1.Typography variant="subtitle2" color="text.secondary">
                Rules ({formData.rules.length})
              </material_1.Typography>
              <material_1.Button size="small" startIcon={<icons_material_1.Add />} onClick={handleAddRule}>
                Add Rule
              </material_1.Button>
            </material_1.Box>
          </material_1.Grid>
          <material_1.Grid item xs={12}>
            {formData.rules.length === 0 ? (<material_1.Alert severity="info" sx={{ mb: 1 }}>
                No rules defined. Policy will match all requests in scope.
              </material_1.Alert>) : (formData.rules.map((rule, index) => (<material_1.Accordion key={index} defaultExpanded={index === formData.rules.length - 1}>
                  <material_1.AccordionSummary expandIcon={<icons_material_1.ExpandMore />}>
                    <material_1.Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                      <material_1.Typography variant="body2" fontWeight="medium">
                        Rule {index + 1}
                      </material_1.Typography>
                      {rule.field && (<material_1.Chip size="small" label={`${rule.field} ${rule.operator} ${stringifyRuleValue(rule.value).substring(0, 20)}`}/>)}
                      <material_1.Box sx={{ flexGrow: 1 }}/>
                      <material_1.IconButton size="small" onClick={(e) => {
                e.stopPropagation();
                handleRemoveRule(index);
            }} color="error">
                        <icons_material_1.Delete fontSize="small"/>
                      </material_1.IconButton>
                    </material_1.Box>
                  </material_1.AccordionSummary>
                  <material_1.AccordionDetails>
                    <material_1.Grid container spacing={2}>
                      <material_1.Grid item xs={12} md={4}>
                        <material_1.TextField fullWidth size="small" label="Field" value={rule.field} onChange={(e) => handleRuleChange(index, 'field', e.target.value)} error={Boolean(errors[`rule_${index}_field`])} helperText={errors[`rule_${index}_field`] || 'e.g., user.role, request.type'} placeholder="payload.field.path"/>
                      </material_1.Grid>
                      <material_1.Grid item xs={12} md={4}>
                        <material_1.FormControl fullWidth size="small">
                          <material_1.InputLabel>Operator</material_1.InputLabel>
                          <material_1.Select value={rule.operator} onChange={(e) => handleRuleChange(index, 'operator', e.target.value)} label="Operator">
                            {OPERATORS.map((op) => (<material_1.MenuItem key={op} value={op}>
                                {OPERATOR_LABELS[op]}
                              </material_1.MenuItem>))}
                          </material_1.Select>
                        </material_1.FormControl>
                      </material_1.Grid>
                      <material_1.Grid item xs={12} md={4}>
                        <material_1.TextField fullWidth size="small" label="Value" value={stringifyRuleValue(rule.value)} onChange={(e) => handleRuleChange(index, 'value', e.target.value)} helperText={rule.operator === 'in' || rule.operator === 'not_in'
                ? 'JSON array: ["a","b"]'
                : 'String, number, or boolean'}/>
                      </material_1.Grid>
                    </material_1.Grid>
                  </material_1.AccordionDetails>
                </material_1.Accordion>)))}
          </material_1.Grid>

          {/* Changelog (for edits) */}
          {isEditing && (<material_1.Grid item xs={12}>
              <material_1.Divider sx={{ my: 1 }}/>
              <material_1.TextField fullWidth multiline rows={2} label="Changelog" value={formData.changelog} onChange={handleChange('changelog')} error={Boolean(errors.changelog)} helperText={errors.changelog || 'Describe what changed in this version'} required/>
            </material_1.Grid>)}
        </material_1.Grid>
      </material_1.DialogContent>
      <material_1.DialogActions>
        <material_1.Button onClick={onClose} disabled={operations.loading}>
          Cancel
        </material_1.Button>
        <material_1.Button onClick={handleSubmit} variant="contained" disabled={operations.loading}>
          {operations.loading ? (<material_1.CircularProgress size={20}/>) : isEditing ? ('Save Changes') : ('Create Policy')}
        </material_1.Button>
      </material_1.DialogActions>
    </material_1.Dialog>);
};
exports.default = PolicyEditor;
