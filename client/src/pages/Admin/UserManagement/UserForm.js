"use strict";
/**
 * User Form Component
 *
 * Dialog form for creating and editing users.
 *
 * SOC 2 Controls: CC6.1
 *
 * @module pages/Admin/UserManagement/UserForm
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
exports.default = UserForm;
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
const AVAILABLE_ROLES = [
    { value: 'admin', label: 'Administrator' },
    { value: 'tenant-admin', label: 'Tenant Administrator' },
    { value: 'security-admin', label: 'Security Administrator' },
    { value: 'supervisor', label: 'Supervisor' },
    { value: 'analyst', label: 'Analyst' },
    { value: 'viewer', label: 'Viewer' },
    { value: 'developer', label: 'Developer' },
    { value: 'compliance-officer', label: 'Compliance Officer' },
];
function UserForm({ open, user, onClose, onSubmit, loading = false, }) {
    const isEditing = !!user;
    const [formData, setFormData] = (0, react_1.useState)({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        role: 'analyst',
    });
    const [showPassword, setShowPassword] = (0, react_1.useState)(false);
    const [errors, setErrors] = (0, react_1.useState)({});
    (0, react_1.useEffect)(() => {
        if (open) {
            if (user) {
                setFormData({
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role,
                });
            }
            else {
                setFormData({
                    email: '',
                    password: '',
                    firstName: '',
                    lastName: '',
                    role: 'analyst',
                });
            }
            setErrors({});
            setShowPassword(false);
        }
    }, [open, user]);
    const validateForm = () => {
        const newErrors = {};
        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
        }
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Invalid email format';
        }
        if (!isEditing && !formData.password?.trim()) {
            newErrors.password = 'Password is required for new users';
        }
        else if (!isEditing && formData.password && formData.password.length < 12) {
            newErrors.password = 'Password must be at least 12 characters';
        }
        if (!formData.firstName.trim()) {
            newErrors.firstName = 'First name is required';
        }
        if (!formData.lastName.trim()) {
            newErrors.lastName = 'Last name is required';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };
    const handleChange = (field) => (e) => {
        setFormData((prev) => ({
            ...prev,
            [field]: e.target.value,
        }));
        // Clear error when user starts typing
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: undefined }));
        }
    };
    const handleSubmit = () => {
        if (validateForm()) {
            onSubmit(formData);
        }
    };
    return (<material_1.Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <material_1.DialogTitle>
        {isEditing ? 'Edit User' : 'Create New User'}
      </material_1.DialogTitle>
      <material_1.DialogContent>
        <material_1.Stack spacing={3} sx={{ mt: 1 }}>
          <material_1.Typography variant="body2" color="textSecondary">
            {isEditing
            ? 'Update user account details and role assignment.'
            : 'Create a new user account. The user will receive a welcome email.'}
          </material_1.Typography>

          <material_1.Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <material_1.TextField label="First Name" value={formData.firstName} onChange={handleChange('firstName')} error={!!errors.firstName} helperText={errors.firstName} fullWidth required/>
            <material_1.TextField label="Last Name" value={formData.lastName} onChange={handleChange('lastName')} error={!!errors.lastName} helperText={errors.lastName} fullWidth required/>
          </material_1.Stack>

          <material_1.TextField label="Email Address" type="email" value={formData.email} onChange={handleChange('email')} error={!!errors.email} helperText={errors.email} fullWidth required/>

          {!isEditing && (<material_1.TextField label="Password" type={showPassword ? 'text' : 'password'} value={formData.password} onChange={handleChange('password')} error={!!errors.password} helperText={errors.password || 'Minimum 12 characters'} fullWidth required InputProps={{
                endAdornment: (<material_1.InputAdornment position="end">
                    <material_1.IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                      {showPassword ? <icons_material_1.VisibilityOff /> : <icons_material_1.Visibility />}
                    </material_1.IconButton>
                  </material_1.InputAdornment>),
            }}/>)}

          <material_1.FormControl fullWidth>
            <material_1.InputLabel>Role</material_1.InputLabel>
            <material_1.Select value={formData.role} label="Role" onChange={(e) => handleChange('role')(e)}>
              {AVAILABLE_ROLES.map((role) => (<material_1.MenuItem key={role.value} value={role.value}>
                  {role.label}
                </material_1.MenuItem>))}
            </material_1.Select>
          </material_1.FormControl>

          {isEditing && (<material_1.Alert severity="info">
              To reset this user's password, use the "Reset Password" option from the user actions menu.
            </material_1.Alert>)}
        </material_1.Stack>
      </material_1.DialogContent>
      <material_1.DialogActions>
        <material_1.Button onClick={onClose} disabled={loading}>
          Cancel
        </material_1.Button>
        <material_1.Button onClick={handleSubmit} variant="contained" disabled={loading}>
          {loading ? 'Saving...' : isEditing ? 'Save Changes' : 'Create User'}
        </material_1.Button>
      </material_1.DialogActions>
    </material_1.Dialog>);
}
