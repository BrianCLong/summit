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

import React, { useEffect, useMemo, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormGroup,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  Alert,
} from "@mui/material";
import { ExpandMore as ExpandMoreIcon } from "@mui/icons-material";
import { Role, Permission } from "../../../services/admin-api";

interface RoleEditorProps {
  open: boolean;
  role: Role | null;
  permissions: Permission[];
  permissionCategories: string[];
  availableRoles: Role[];
  onClose: () => void;
  onSubmit: (data: RoleFormData) => void;
  loading?: boolean;
}

interface RoleFormData {
  name: string;
  displayName: string;
  description?: string;
  permissions: string[];
  inherits?: string[];
  scope?: "full" | "restricted" | "readonly";
}

export default function RoleEditor({
  open,
  role,
  permissions,
  permissionCategories,
  availableRoles,
  onClose,
  onSubmit,
  loading = false,
}: RoleEditorProps) {
  const isEditing = !!role;

  const [formData, setFormData] = useState<RoleFormData>({
    name: "",
    displayName: "",
    description: "",
    permissions: [],
    inherits: [],
    scope: "restricted",
  });

  const [errors, setErrors] = useState<Partial<Record<keyof RoleFormData, string>>>({});
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  // Group permissions by category
  const permissionsByCategory = useMemo(() => {
    const grouped: Record<string, Permission[]> = {};
    permissions.forEach((perm) => {
      if (!grouped[perm.category]) {
        grouped[perm.category] = [];
      }
      grouped[perm.category].push(perm);
    });
    return grouped;
  }, [permissions]);

  // Calculate inherited permissions
  const inheritedPermissions = useMemo(() => {
    const inherited = new Set<string>();
    formData.inherits?.forEach((roleId) => {
      const parentRole = availableRoles.find((r) => r.id === roleId);
      if (parentRole) {
        parentRole.effectivePermissions.forEach((perm) => inherited.add(perm));
      }
    });
    return inherited;
  }, [formData.inherits, availableRoles]);

  useEffect(() => {
    if (open) {
      if (role) {
        setFormData({
          name: role.name,
          displayName: role.displayName,
          description: role.description || "",
          permissions: role.permissions,
          inherits: role.inherits,
          scope: role.scope,
        });
      } else {
        setFormData({
          name: "",
          displayName: "",
          description: "",
          permissions: [],
          inherits: [],
          scope: "restricted",
        });
      }
      setErrors({});
      setExpandedCategories([]);
    }
  }, [open, role]);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof RoleFormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    } else if (!/^[a-z0-9-]+$/.test(formData.name)) {
      newErrors.name = "Name must be lowercase alphanumeric with hyphens only";
    }

    if (!formData.displayName.trim()) {
      newErrors.displayName = "Display name is required";
    }

    if (formData.permissions.length === 0 && (formData.inherits?.length || 0) === 0) {
      newErrors.permissions = "At least one permission or inherited role is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange =
    (field: keyof RoleFormData) =>
    (
      e:
        | React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
        | { target: { value: string | string[] } }
    ) => {
      const value = e.target.value;
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    };

  const handlePermissionToggle = (permissionId: string) => {
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

  const handleCategoryToggle = (category: string) => {
    const categoryPerms = permissionsByCategory[category]?.map((p) => p.id) || [];
    const allSelected = categoryPerms.every((p) => formData.permissions.includes(p));

    setFormData((prev) => ({
      ...prev,
      permissions: allSelected
        ? prev.permissions.filter((p) => !categoryPerms.includes(p))
        : [...new Set([...prev.permissions, ...categoryPerms])],
    }));
  };

  const handleAccordionChange = (category: string) => {
    setExpandedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const isPermissionSelected = (permissionId: string) => {
    return formData.permissions.includes(permissionId) || inheritedPermissions.has(permissionId);
  };

  const isCategoryFullySelected = (category: string) => {
    const categoryPerms = permissionsByCategory[category]?.map((p) => p.id) || [];
    return categoryPerms.every((p) => isPermissionSelected(p));
  };

  const isCategoryPartiallySelected = (category: string) => {
    const categoryPerms = permissionsByCategory[category]?.map((p) => p.id) || [];
    const selectedCount = categoryPerms.filter((p) => isPermissionSelected(p)).length;
    return selectedCount > 0 && selectedCount < categoryPerms.length;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{isEditing ? "Edit Role" : "Create Custom Role"}</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <Typography variant="body2" color="textSecondary">
            {isEditing
              ? "Update role details and permissions."
              : "Create a new custom role with specific permissions."}
          </Typography>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              label="Role Name"
              value={formData.name}
              onChange={handleChange("name")}
              error={!!errors.name}
              helperText={errors.name || "Lowercase, alphanumeric, hyphens only"}
              fullWidth
              required
              disabled={isEditing}
            />
            <TextField
              label="Display Name"
              value={formData.displayName}
              onChange={handleChange("displayName")}
              error={!!errors.displayName}
              helperText={errors.displayName}
              fullWidth
              required
            />
          </Stack>

          <TextField
            label="Description"
            value={formData.description}
            onChange={handleChange("description")}
            multiline
            rows={2}
            fullWidth
          />

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <FormControl fullWidth>
              <InputLabel>Scope</InputLabel>
              <Select
                value={formData.scope}
                label="Scope"
                onChange={(e) => handleChange("scope")(e as { target: { value: string } })}
              >
                <MenuItem value="full">Full Access</MenuItem>
                <MenuItem value="restricted">Restricted</MenuItem>
                <MenuItem value="readonly">Read Only</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Inherits From</InputLabel>
              <Select
                multiple
                value={formData.inherits || []}
                label="Inherits From"
                onChange={(e) => handleChange("inherits")(e as { target: { value: string[] } })}
                renderValue={(selected) => (
                  <Stack direction="row" spacing={0.5} flexWrap="wrap">
                    {(selected as string[]).map((roleId) => {
                      const parentRole = availableRoles.find((r) => r.id === roleId);
                      return (
                        <Chip key={roleId} label={parentRole?.displayName || roleId} size="small" />
                      );
                    })}
                  </Stack>
                )}
              >
                {availableRoles.map((r) => (
                  <MenuItem key={r.id} value={r.id}>
                    {r.displayName}
                    {r.isBuiltIn && <Chip label="Built-in" size="small" sx={{ ml: 1 }} />}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          {inheritedPermissions.size > 0 && (
            <Alert severity="info">
              {inheritedPermissions.size} permissions inherited from parent roles
            </Alert>
          )}

          {/* Permissions Selection */}
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Permissions{" "}
              {errors.permissions && (
                <Typography component="span" color="error" variant="caption">
                  - {errors.permissions}
                </Typography>
              )}
            </Typography>
            <Box sx={{ maxHeight: 400, overflow: "auto" }}>
              {permissionCategories.map((category) => {
                const categoryPerms = permissionsByCategory[category] || [];
                const isFullySelected = isCategoryFullySelected(category);
                const isPartiallySelected = isCategoryPartiallySelected(category);

                return (
                  <Accordion
                    key={category}
                    expanded={expandedCategories.includes(category)}
                    onChange={() => handleAccordionChange(category)}
                    disableGutters
                    elevation={0}
                    sx={{ border: "1px solid", borderColor: "divider", mb: 1 }}
                  >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <FormControlLabel
                        onClick={(e) => e.stopPropagation()}
                        control={
                          <Checkbox
                            checked={isFullySelected}
                            indeterminate={isPartiallySelected}
                            onChange={() => handleCategoryToggle(category)}
                          />
                        }
                        label={
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="body2" fontWeight={500}>
                              {category.charAt(0).toUpperCase() + category.slice(1)}
                            </Typography>
                            <Chip
                              label={`${categoryPerms.filter((p) => isPermissionSelected(p.id)).length}/${categoryPerms.length}`}
                              size="small"
                              variant="outlined"
                            />
                          </Stack>
                        }
                      />
                    </AccordionSummary>
                    <AccordionDetails>
                      <FormGroup>
                        {categoryPerms.map((perm) => {
                          const isInherited = inheritedPermissions.has(perm.id);
                          const isSelected = formData.permissions.includes(perm.id);

                          return (
                            <FormControlLabel
                              key={perm.id}
                              control={
                                <Checkbox
                                  checked={isSelected || isInherited}
                                  onChange={() => handlePermissionToggle(perm.id)}
                                  disabled={isInherited}
                                />
                              }
                              label={
                                <Box>
                                  <Typography variant="body2">
                                    {perm.displayName}
                                    {isInherited && (
                                      <Chip
                                        label="Inherited"
                                        size="small"
                                        color="secondary"
                                        variant="outlined"
                                        sx={{ ml: 1 }}
                                      />
                                    )}
                                  </Typography>
                                  <Typography variant="caption" color="textSecondary">
                                    {perm.description}
                                  </Typography>
                                </Box>
                              }
                              sx={{ alignItems: "flex-start", mb: 1 }}
                            />
                          );
                        })}
                      </FormGroup>
                    </AccordionDetails>
                  </Accordion>
                );
              })}
            </Box>
          </Box>

          {/* Selected Permissions Summary */}
          <Box sx={{ bgcolor: "action.hover", p: 2, borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              Selected Permissions Summary
            </Typography>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
              {formData.permissions.map((permId) => {
                const perm = permissions.find((p) => p.id === permId);
                return (
                  <Chip
                    key={permId}
                    label={perm?.displayName || permId}
                    size="small"
                    onDelete={() => handlePermissionToggle(permId)}
                  />
                );
              })}
              {formData.permissions.length === 0 && (
                <Typography variant="caption" color="textSecondary">
                  No permissions directly selected
                </Typography>
              )}
            </Stack>
            {inheritedPermissions.size > 0 && (
              <Box mt={1}>
                <Typography variant="caption" color="textSecondary" gutterBottom>
                  + {inheritedPermissions.size} inherited permissions
                </Typography>
              </Box>
            )}
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading}>
          {loading ? "Saving..." : isEditing ? "Save Changes" : "Create Role"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
