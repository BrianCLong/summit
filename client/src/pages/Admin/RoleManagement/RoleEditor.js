"use strict";
/**
 * Role Editor Component
 *
 * Dialog form for creating and editing custom roles.
 * Allows selecting permissions and inheriting from other roles.
 *
 * SOC 2 Controls: CC6.1, CC7.2
 *
 * @module pages/Admin/RoleManagement/RoleEditor
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
exports.default = RoleEditor;
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
function RoleEditor({ open, role, permissions, permissionCategories, availableRoles, onClose, onSubmit, loading = false, }) {
    const isEditing = !!role;
    const [formData, setFormData] = (0, react_1.useState)({
        name: '',
        displayName: '',
        description: '',
        permissions: [],
        inherits: [],
        scope: 'restricted',
    });
    const [errors, setErrors] = (0, react_1.useState)({});
    const [expandedCategories, setExpandedCategories] = (0, react_1.useState)([]);
    // Group permissions by category
    const permissionsByCategory = (0, react_1.useMemo)(() => {
        const grouped = {};
        permissions.forEach((perm) => {
            if (!grouped[perm.category]) {
                grouped[perm.category] = [];
            }
            grouped[perm.category].push(perm);
        });
        return grouped;
    }, [permissions]);
    // Calculate inherited permissions
    const inheritedPermissions = (0, react_1.useMemo)(() => {
        const inherited = new Set();
        formData.inherits?.forEach((roleId) => {
            const parentRole = availableRoles.find((r) => r.id === roleId);
            if (parentRole) {
                parentRole.effectivePermissions.forEach((perm) => inherited.add(perm));
            }
        });
        return inherited;
    }, [formData.inherits, availableRoles]);
    (0, react_1.useEffect)(() => {
        if (open) {
            if (role) {
                setFormData({
                    name: role.name,
                    displayName: role.displayName,
                    description: role.description || '',
                    permissions: role.permissions,
                    inherits: role.inherits,
                    scope: role.scope,
                });
            }
            else {
                setFormData({
                    name: '',
                    displayName: '',
                    description: '',
                    permissions: [],
                    inherits: [],
                    scope: 'restricted',
                });
            }
            setErrors({});
            setExpandedCategories([]);
        }
    }, [open, role]);
    const validateForm = () => {
        const newErrors = {};
        if (!formData.name.trim()) {
            newErrors.name = 'Name is required';
        }
        else if (!/^[a-z0-9-]+$/.test(formData.name)) {
            newErrors.name = 'Name must be lowercase alphanumeric with hyphens only';
        }
        if (!formData.displayName.trim()) {
            newErrors.displayName = 'Display name is required';
        }
        if (formData.permissions.length === 0 && (formData.inherits?.length || 0) === 0) {
            newErrors.permissions = 'At least one permission or inherited role is required';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };
    const handleChange = (field) => (e) => {
        const value = e.target.value;
        setFormData((prev) => ({
            ...prev,
            [field]: value,
        }));
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: undefined }));
        }
    };
    const handlePermissionToggle = (permissionId) => {
        setFormData((prev) => ({
            ...prev,
            permissions: prev.permissions.includes(permissionId)
                ? prev.permissions.filter((p) => p !== permissionId)
                : [...prev.permissions, permissionId],
        }));
        if (errors.permissions) {
            setErrors((prev) => ({ ...prev, permissions: undefined }));
        }
    };
    const handleCategoryToggle = (category) => {
        const categoryPerms = permissionsByCategory[category]?.map((p) => p.id) || [];
        const allSelected = categoryPerms.every((p) => formData.permissions.includes(p));
        setFormData((prev) => ({
            ...prev,
            permissions: allSelected
                ? prev.permissions.filter((p) => !categoryPerms.includes(p))
                : [...new Set([...prev.permissions, ...categoryPerms])],
        }));
    };
    const handleAccordionChange = (category) => {
        setExpandedCategories((prev) => prev.includes(category)
            ? prev.filter((c) => c !== category)
            : [...prev, category]);
    };
    const handleSubmit = () => {
        if (validateForm()) {
            onSubmit(formData);
        }
    };
    const isPermissionSelected = (permissionId) => {
        return formData.permissions.includes(permissionId) || inheritedPermissions.has(permissionId);
    };
    const isCategoryFullySelected = (category) => {
        const categoryPerms = permissionsByCategory[category]?.map((p) => p.id) || [];
        return categoryPerms.every((p) => isPermissionSelected(p));
    };
    const isCategoryPartiallySelected = (category) => {
        const categoryPerms = permissionsByCategory[category]?.map((p) => p.id) || [];
        const selectedCount = categoryPerms.filter((p) => isPermissionSelected(p)).length;
        return selectedCount > 0 && selectedCount < categoryPerms.length;
    };
    return (<material_1.Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <material_1.DialogTitle>
        {isEditing ? 'Edit Role' : 'Create Custom Role'}
      </material_1.DialogTitle>
      <material_1.DialogContent>
        <material_1.Stack spacing={3} sx={{ mt: 1 }}>
          <material_1.Typography variant="body2" color="textSecondary">
            {isEditing
            ? 'Update role details and permissions.'
            : 'Create a new custom role with specific permissions.'}
          </material_1.Typography>

          <material_1.Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <material_1.TextField label="Role Name" value={formData.name} onChange={handleChange('name')} error={!!errors.name} helperText={errors.name || 'Lowercase, alphanumeric, hyphens only'} fullWidth required disabled={isEditing}/>
            <material_1.TextField label="Display Name" value={formData.displayName} onChange={handleChange('displayName')} error={!!errors.displayName} helperText={errors.displayName} fullWidth required/>
          </material_1.Stack>

          <material_1.TextField label="Description" value={formData.description} onChange={handleChange('description')} multiline rows={2} fullWidth/>

          <material_1.Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <material_1.FormControl fullWidth>
              <material_1.InputLabel>Scope</material_1.InputLabel>
              <material_1.Select value={formData.scope} label="Scope" onChange={(e) => handleChange('scope')(e)}>
                <material_1.MenuItem value="full">Full Access</material_1.MenuItem>
                <material_1.MenuItem value="restricted">Restricted</material_1.MenuItem>
                <material_1.MenuItem value="readonly">Read Only</material_1.MenuItem>
              </material_1.Select>
            </material_1.FormControl>

            <material_1.FormControl fullWidth>
              <material_1.InputLabel>Inherits From</material_1.InputLabel>
              <material_1.Select multiple value={formData.inherits || []} label="Inherits From" onChange={(e) => handleChange('inherits')(e)} renderValue={(selected) => (<material_1.Stack direction="row" spacing={0.5} flexWrap="wrap">
                    {selected.map((roleId) => {
                const parentRole = availableRoles.find((r) => r.id === roleId);
                return (<material_1.Chip key={roleId} label={parentRole?.displayName || roleId} size="small"/>);
            })}
                  </material_1.Stack>)}>
                {availableRoles.map((r) => (<material_1.MenuItem key={r.id} value={r.id}>
                    {r.displayName}
                    {r.isBuiltIn && (<material_1.Chip label="Built-in" size="small" sx={{ ml: 1 }}/>)}
                  </material_1.MenuItem>))}
              </material_1.Select>
            </material_1.FormControl>
          </material_1.Stack>

          {inheritedPermissions.size > 0 && (<material_1.Alert severity="info">
              {inheritedPermissions.size} permissions inherited from parent roles
            </material_1.Alert>)}

          {/* Permissions Selection */}
          <material_1.Box>
            <material_1.Typography variant="subtitle2" gutterBottom>
              Permissions {errors.permissions && (<material_1.Typography component="span" color="error" variant="caption">
                  - {errors.permissions}
                </material_1.Typography>)}
            </material_1.Typography>
            <material_1.Box sx={{ maxHeight: 400, overflow: 'auto' }}>
              {permissionCategories.map((category) => {
            const categoryPerms = permissionsByCategory[category] || [];
            const isFullySelected = isCategoryFullySelected(category);
            const isPartiallySelected = isCategoryPartiallySelected(category);
            return (<material_1.Accordion key={category} expanded={expandedCategories.includes(category)} onChange={() => handleAccordionChange(category)} disableGutters elevation={0} sx={{ border: '1px solid', borderColor: 'divider', mb: 1 }}>
                    <material_1.AccordionSummary expandIcon={<icons_material_1.ExpandMore />}>
                      <material_1.FormControlLabel onClick={(e) => e.stopPropagation()} control={<material_1.Checkbox checked={isFullySelected} indeterminate={isPartiallySelected} onChange={() => handleCategoryToggle(category)}/>} label={<material_1.Stack direction="row" spacing={1} alignItems="center">
                            <material_1.Typography variant="body2" fontWeight={500}>
                              {category.charAt(0).toUpperCase() + category.slice(1)}
                            </material_1.Typography>
                            <material_1.Chip label={`${categoryPerms.filter((p) => isPermissionSelected(p.id)).length}/${categoryPerms.length}`} size="small" variant="outlined"/>
                          </material_1.Stack>}/>
                    </material_1.AccordionSummary>
                    <material_1.AccordionDetails>
                      <material_1.FormGroup>
                        {categoryPerms.map((perm) => {
                    const isInherited = inheritedPermissions.has(perm.id);
                    const isSelected = formData.permissions.includes(perm.id);
                    return (<material_1.FormControlLabel key={perm.id} control={<material_1.Checkbox checked={isSelected || isInherited} onChange={() => handlePermissionToggle(perm.id)} disabled={isInherited}/>} label={<material_1.Box>
                                  <material_1.Typography variant="body2">
                                    {perm.displayName}
                                    {isInherited && (<material_1.Chip label="Inherited" size="small" color="secondary" variant="outlined" sx={{ ml: 1 }}/>)}
                                  </material_1.Typography>
                                  <material_1.Typography variant="caption" color="textSecondary">
                                    {perm.description}
                                  </material_1.Typography>
                                </material_1.Box>} sx={{ alignItems: 'flex-start', mb: 1 }}/>);
                })}
                      </material_1.FormGroup>
                    </material_1.AccordionDetails>
                  </material_1.Accordion>);
        })}
            </material_1.Box>
          </material_1.Box>

          {/* Selected Permissions Summary */}
          <material_1.Box sx={{ bgcolor: 'action.hover', p: 2, borderRadius: 1 }}>
            <material_1.Typography variant="subtitle2" gutterBottom>
              Selected Permissions Summary
            </material_1.Typography>
            <material_1.Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
              {formData.permissions.map((permId) => {
            const perm = permissions.find((p) => p.id === permId);
            return (<material_1.Chip key={permId} label={perm?.displayName || permId} size="small" onDelete={() => handlePermissionToggle(permId)}/>);
        })}
              {formData.permissions.length === 0 && (<material_1.Typography variant="caption" color="textSecondary">
                  No permissions directly selected
                </material_1.Typography>)}
            </material_1.Stack>
            {inheritedPermissions.size > 0 && (<material_1.Box mt={1}>
                <material_1.Typography variant="caption" color="textSecondary" gutterBottom>
                  + {inheritedPermissions.size} inherited permissions
                </material_1.Typography>
              </material_1.Box>)}
          </material_1.Box>
        </material_1.Stack>
      </material_1.DialogContent>
      <material_1.DialogActions>
        <material_1.Button onClick={onClose} disabled={loading}>
          Cancel
        </material_1.Button>
        <material_1.Button onClick={handleSubmit} variant="contained" disabled={loading}>
          {loading ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Role'}
        </material_1.Button>
      </material_1.DialogActions>
    </material_1.Dialog>);
}
