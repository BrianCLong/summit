/**
 * Policy Editor Component
 *
 * Dialog for creating and editing governance policies.
 *
 * SOC 2 Controls: CC6.1, CC6.2, CC7.2, PI1.1
 *
 * @module pages/Policies/PolicyEditor
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Typography,
  Chip,
  IconButton,
  Grid,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  CircularProgress,
  Autocomplete,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { usePolicyOperations } from '../../hooks/usePolicies';
import {
  ManagedPolicy,
  PolicyRule,
  PolicyScope,
  CreatePolicyInput,
  UpdatePolicyInput,
} from '../../services/policy-api';

// ============================================================================
// Types
// ============================================================================

interface PolicyEditorProps {
  open: boolean;
  policy: ManagedPolicy | null;
  onClose: () => void;
  onSave: () => void;
}

interface FormData {
  name: string;
  displayName: string;
  description: string;
  category: ManagedPolicy['category'];
  priority: number;
  action: ManagedPolicy['action'];
  stages: PolicyScope['stages'];
  tenants: string[];
  rules: PolicyRule[];
  effectiveFrom: string;
  effectiveUntil: string;
  changelog: string;
}

const defaultFormData: FormData = {
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

const CATEGORIES: ManagedPolicy['category'][] = [
  'access', 'data', 'export', 'retention', 'compliance', 'operational', 'safety'
];

const ACTIONS: ManagedPolicy['action'][] = ['ALLOW', 'DENY', 'ESCALATE', 'WARN'];

const STAGES: PolicyScope['stages'][number][] = ['data', 'train', 'alignment', 'runtime'];

const OPERATORS: PolicyRule['operator'][] = ['eq', 'neq', 'lt', 'gt', 'in', 'not_in', 'contains'];

const OPERATOR_LABELS: Record<PolicyRule['operator'], string> = {
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

const generatePolicyName = (displayName: string): string => {
  return displayName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50);
};

const parseRuleValue = (value: string, operator: PolicyRule['operator']): unknown => {
  if (operator === 'in' || operator === 'not_in') {
    try {
      return JSON.parse(value);
    } catch {
      return value.split(',').map(v => v.trim());
    }
  }
  // Try to parse as number
  const num = Number(value);
  if (!isNaN(num)) return num;
  // Try to parse as boolean
  if (value === 'true') return true;
  if (value === 'false') return false;
  // Return as string
  return value;
};

const stringifyRuleValue = (value: unknown): string => {
  if (Array.isArray(value)) {
    return JSON.stringify(value);
  }
  return String(value);
};

// ============================================================================
// Component
// ============================================================================

const PolicyEditor: React.FC<PolicyEditorProps> = ({
  open,
  policy,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState<FormData>(defaultFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const operations = usePolicyOperations();

  const isEditing = Boolean(policy);

  // Initialize form data when policy changes
  useEffect(() => {
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
    } else {
      setFormData(defaultFormData);
    }
    setErrors({});
  }, [policy, open]);

  // Form field handlers
  const handleChange = useCallback((field: keyof FormData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { value: unknown } }
  ) => {
    const value = event.target.value;
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      // Auto-generate name from displayName for new policies
      if (field === 'displayName' && !isEditing) {
        updated.name = generatePolicyName(value as string);
      }
      return updated;
    });
    // Clear error when field is modified
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  }, [errors, isEditing]);

  const handleSelectChange = useCallback((field: 'category' | 'action') => (
    event: SelectChangeEvent<string>
  ) => {
    const value = event.target.value;
    setFormData((prev) => ({
      ...prev,
      [field]: field === 'category'
        ? (value as ManagedPolicy['category'])
        : (value as ManagedPolicy['action']),
    }));
  }, []);

  const handleStagesChange = useCallback((_: unknown, value: PolicyScope['stages'][number][]) => {
    setFormData((prev) => ({ ...prev, stages: value }));
  }, []);

  const handleTenantsChange = useCallback((_: unknown, value: string[]) => {
    setFormData((prev) => ({ ...prev, tenants: value.length > 0 ? value : ['*'] }));
  }, []);

  // Rule handlers
  const handleAddRule = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      rules: [...prev.rules, { field: '', operator: 'eq', value: '' }],
    }));
  }, []);

  const handleRemoveRule = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      rules: prev.rules.filter((_, i) => i !== index),
    }));
  }, []);

  const handleRuleChange = useCallback((
    index: number,
    field: keyof PolicyRule,
    value: unknown
  ) => {
    setFormData((prev) => ({
      ...prev,
      rules: prev.rules.map((rule, i) => {
        if (i !== index) return rule;
        return { ...rule, [field]: value };
      }),
    }));
  }, []);

  // Validation
  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (!/^[a-z0-9-]+$/.test(formData.name)) {
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
  const handleSubmit = useCallback(async () => {
    if (!validate()) return;

    const scope: PolicyScope = {
      stages: formData.stages,
      tenants: formData.tenants,
    };

    // Parse rule values
    const rules: PolicyRule[] = formData.rules.map((rule) => ({
      field: rule.field,
      operator: rule.operator,
      value: parseRuleValue(stringifyRuleValue(rule.value), rule.operator),
    }));

    if (isEditing && policy) {
      const input: UpdatePolicyInput = {
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
    } else {
      const input: CreatePolicyInput = {
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

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { maxHeight: '90vh' } }}
    >
      <DialogTitle>
        {isEditing ? `Edit Policy: ${policy?.displayName}` : 'Create New Policy'}
      </DialogTitle>
      <DialogContent dividers>
        {operations.error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {operations.error}
          </Alert>
        )}

        <Grid container spacing={2}>
          {/* Basic Info */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Basic Information
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Display Name"
              value={formData.displayName}
              onChange={handleChange('displayName')}
              error={Boolean(errors.displayName)}
              helperText={errors.displayName}
              required
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Policy Name (ID)"
              value={formData.name}
              onChange={handleChange('name')}
              error={Boolean(errors.name)}
              helperText={errors.name || 'Lowercase alphanumeric with hyphens'}
              disabled={isEditing}
              required
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Description"
              value={formData.description}
              onChange={handleChange('description')}
            />
          </Grid>

          {/* Classification */}
          <Grid item xs={12}>
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Classification
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={formData.category}
                onChange={handleSelectChange('category')}
                label="Category"
              >
                {CATEGORIES.map((cat) => (
                  <MenuItem key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Action</InputLabel>
              <Select
                value={formData.action}
                onChange={handleSelectChange('action')}
                label="Action"
              >
                {ACTIONS.map((action) => (
                  <MenuItem key={action} value={action}>
                    {action}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              type="number"
              label="Priority"
              value={formData.priority}
              onChange={handleChange('priority')}
              inputProps={{ min: 1, max: 1000 }}
              helperText="Lower = higher priority"
            />
          </Grid>

          {/* Scope */}
          <Grid item xs={12}>
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Scope
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Autocomplete
              multiple
              options={STAGES}
              value={formData.stages}
              onChange={handleStagesChange}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    size="small"
                    label={option}
                    {...getTagProps({ index })}
                    key={option}
                  />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Stages"
                  error={Boolean(errors.stages)}
                  helperText={errors.stages}
                />
              )}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Autocomplete
              multiple
              freeSolo
              options={['*']}
              value={formData.tenants}
              onChange={handleTenantsChange}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    size="small"
                    label={option === '*' ? 'All Tenants' : option}
                    {...getTagProps({ index })}
                    key={option}
                  />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Tenants"
                  error={Boolean(errors.tenants)}
                  helperText={errors.tenants || 'Use * for all tenants'}
                />
              )}
            />
          </Grid>

          {/* Effective Period */}
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              type="datetime-local"
              label="Effective From"
              value={formData.effectiveFrom}
              onChange={handleChange('effectiveFrom')}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              type="datetime-local"
              label="Effective Until"
              value={formData.effectiveUntil}
              onChange={handleChange('effectiveUntil')}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          {/* Rules */}
          <Grid item xs={12}>
            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Rules ({formData.rules.length})
              </Typography>
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={handleAddRule}
              >
                Add Rule
              </Button>
            </Box>
          </Grid>
          <Grid item xs={12}>
            {formData.rules.length === 0 ? (
              <Alert severity="info" sx={{ mb: 1 }}>
                No rules defined. Policy will match all requests in scope.
              </Alert>
            ) : (
              formData.rules.map((rule, index) => (
                <Accordion key={index} defaultExpanded={index === formData.rules.length - 1}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                      <Typography variant="body2" fontWeight="medium">
                        Rule {index + 1}
                      </Typography>
                      {rule.field && (
                        <Chip
                          size="small"
                          label={`${rule.field} ${rule.operator} ${stringifyRuleValue(rule.value).substring(0, 20)}`}
                        />
                      )}
                      <Box sx={{ flexGrow: 1 }} />
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveRule(index);
                        }}
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={4}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Field"
                          value={rule.field}
                          onChange={(e) => handleRuleChange(index, 'field', e.target.value)}
                          error={Boolean(errors[`rule_${index}_field`])}
                          helperText={errors[`rule_${index}_field`] || 'e.g., user.role, request.type'}
                          placeholder="payload.field.path"
                        />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Operator</InputLabel>
                          <Select
                            value={rule.operator}
                            onChange={(e) => handleRuleChange(index, 'operator', e.target.value)}
                            label="Operator"
                          >
                            {OPERATORS.map((op) => (
                              <MenuItem key={op} value={op}>
                                {OPERATOR_LABELS[op]}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Value"
                          value={stringifyRuleValue(rule.value)}
                          onChange={(e) => handleRuleChange(index, 'value', e.target.value)}
                          helperText={
                            rule.operator === 'in' || rule.operator === 'not_in'
                              ? 'JSON array: ["a","b"]'
                              : 'String, number, or boolean'
                          }
                        />
                      </Grid>
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              ))
            )}
          </Grid>

          {/* Changelog (for edits) */}
          {isEditing && (
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Changelog"
                value={formData.changelog}
                onChange={handleChange('changelog')}
                error={Boolean(errors.changelog)}
                helperText={errors.changelog || 'Describe what changed in this version'}
                required
              />
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={operations.loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={operations.loading}
        >
          {operations.loading ? (
            <CircularProgress size={20} />
          ) : isEditing ? (
            'Save Changes'
          ) : (
            'Create Policy'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PolicyEditor;
