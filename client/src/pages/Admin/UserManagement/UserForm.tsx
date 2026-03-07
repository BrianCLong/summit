/**
 * User Form Component
 *
 * Dialog form for creating and editing users.
 *
 * SOC 2 Controls: CC6.1
 *
 * @module pages/Admin/UserManagement/UserForm
 */

import React, { useEffect, useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { ManagedUser } from "../../../services/admin-api";

interface UserFormProps {
  open: boolean;
  user: ManagedUser | null;
  onClose: () => void;
  onSubmit: (data: UserFormData) => void;
  loading?: boolean;
}

interface UserFormData {
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  role?: string;
}

const AVAILABLE_ROLES = [
  { value: "admin", label: "Administrator" },
  { value: "tenant-admin", label: "Tenant Administrator" },
  { value: "security-admin", label: "Security Administrator" },
  { value: "supervisor", label: "Supervisor" },
  { value: "analyst", label: "Analyst" },
  { value: "viewer", label: "Viewer" },
  { value: "developer", label: "Developer" },
  { value: "compliance-officer", label: "Compliance Officer" },
];

export default function UserForm({
  open,
  user,
  onClose,
  onSubmit,
  loading = false,
}: UserFormProps) {
  const isEditing = !!user;

  const [formData, setFormData] = useState<UserFormData>({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    role: "analyst",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof UserFormData, string>>>({});

  useEffect(() => {
    if (open) {
      if (user) {
        setFormData({
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        });
      } else {
        setFormData({
          email: "",
          password: "",
          firstName: "",
          lastName: "",
          role: "analyst",
        });
      }
      setErrors({});
      setShowPassword(false);
    }
  }, [open, user]);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof UserFormData, string>> = {};

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    if (!isEditing && !formData.password?.trim()) {
      newErrors.password = "Password is required for new users";
    } else if (!isEditing && formData.password && formData.password.length < 12) {
      newErrors.password = "Password must be at least 12 characters";
    }

    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required";
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange =
    (field: keyof UserFormData) =>
    (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { value: string } }
    ) => {
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

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEditing ? "Edit User" : "Create New User"}</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <Typography variant="body2" color="textSecondary">
            {isEditing
              ? "Update user account details and role assignment."
              : "Create a new user account. The user will receive a welcome email."}
          </Typography>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              label="First Name"
              value={formData.firstName}
              onChange={handleChange("firstName")}
              error={!!errors.firstName}
              helperText={errors.firstName}
              fullWidth
              required
            />
            <TextField
              label="Last Name"
              value={formData.lastName}
              onChange={handleChange("lastName")}
              error={!!errors.lastName}
              helperText={errors.lastName}
              fullWidth
              required
            />
          </Stack>

          <TextField
            label="Email Address"
            type="email"
            value={formData.email}
            onChange={handleChange("email")}
            error={!!errors.email}
            helperText={errors.email}
            fullWidth
            required
          />

          {!isEditing && (
            <TextField
              label="Password"
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={handleChange("password")}
              error={!!errors.password}
              helperText={errors.password || "Minimum 12 characters"}
              fullWidth
              required
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          )}

          <FormControl fullWidth>
            <InputLabel>Role</InputLabel>
            <Select
              value={formData.role}
              label="Role"
              onChange={(e) => handleChange("role")(e as { target: { value: string } })}
            >
              {AVAILABLE_ROLES.map((role) => (
                <MenuItem key={role.value} value={role.value}>
                  {role.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {isEditing && (
            <Alert severity="info">
              To reset this user's password, use the "Reset Password" option from the user actions
              menu.
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading}>
          {loading ? "Saving..." : isEditing ? "Save Changes" : "Create User"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
