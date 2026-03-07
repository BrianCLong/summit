/**
 * Permission Matrix Component
 *
 * Dialog displaying all permissions for a role organized by category.
 * Shows which permissions are directly assigned vs inherited.
 *
 * SOC 2 Controls: CC6.1
 *
 * @module pages/Admin/RoleManagement/PermissionMatrix
 */

import React, { useMemo } from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { Check as CheckIcon, Remove as RemoveIcon } from "@mui/icons-material";
import { Role, Permission } from "../../../services/admin-api";

interface PermissionMatrixProps {
  open: boolean;
  role: Role;
  permissions: Permission[];
  permissionCategories: string[];
  onClose: () => void;
}

export default function PermissionMatrix({
  open,
  role,
  permissions,
  permissionCategories,
  onClose,
}: PermissionMatrixProps) {
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

  // Determine which permissions are direct vs inherited
  const directPermissions = new Set(role.permissions);
  const effectivePermissions = new Set(role.effectivePermissions);
  const inheritedPermissions = new Set(
    role.effectivePermissions.filter((p) => !directPermissions.has(p))
  );

  const getPermissionStatus = (permId: string) => {
    if (directPermissions.has(permId)) return "direct";
    if (inheritedPermissions.has(permId)) return "inherited";
    return "none";
  };

  const countCategoryPermissions = (category: string) => {
    const categoryPerms = permissionsByCategory[category] || [];
    return categoryPerms.filter((p) => effectivePermissions.has(p.id)).length;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="h6">{role.displayName}</Typography>
          {role.isBuiltIn && <Chip label="Built-in" size="small" variant="outlined" />}
          <Chip label={role.scope} size="small" color="primary" />
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={3}>
          {/* Role Info */}
          <Box>
            {role.description && (
              <Typography variant="body2" color="textSecondary" gutterBottom>
                {role.description}
              </Typography>
            )}
            <Stack direction="row" spacing={3} mt={1}>
              <Typography variant="body2">
                <strong>Direct Permissions:</strong> {directPermissions.size}
              </Typography>
              <Typography variant="body2">
                <strong>Inherited:</strong> {inheritedPermissions.size}
              </Typography>
              <Typography variant="body2">
                <strong>Total Effective:</strong> {effectivePermissions.size}
              </Typography>
            </Stack>
          </Box>

          {/* Inherited Roles */}
          {role.inherits.length > 0 && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Inherits From
              </Typography>
              <Stack direction="row" spacing={1}>
                {role.inherits.map((inherited) => (
                  <Chip key={inherited} label={inherited} variant="outlined" color="secondary" />
                ))}
              </Stack>
            </Box>
          )}

          <Divider />

          {/* Legend */}
          <Stack direction="row" spacing={3}>
            <Stack direction="row" spacing={1} alignItems="center">
              <CheckIcon color="success" fontSize="small" />
              <Typography variant="caption">Direct Permission</Typography>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <CheckIcon color="secondary" fontSize="small" />
              <Typography variant="caption">Inherited Permission</Typography>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <RemoveIcon color="disabled" fontSize="small" />
              <Typography variant="caption">Not Granted</Typography>
            </Stack>
          </Stack>

          {/* Permissions by Category */}
          <Box sx={{ maxHeight: 500, overflow: "auto" }}>
            {permissionCategories.map((category) => {
              const categoryPerms = permissionsByCategory[category] || [];
              const grantedCount = countCategoryPermissions(category);

              if (categoryPerms.length === 0) return null;

              return (
                <Box key={category} mb={3}>
                  <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                    <Typography variant="subtitle2">
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </Typography>
                    <Chip
                      label={`${grantedCount}/${categoryPerms.length}`}
                      size="small"
                      color={grantedCount === categoryPerms.length ? "success" : "default"}
                    />
                  </Stack>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell width={40}>Status</TableCell>
                          <TableCell>Permission</TableCell>
                          <TableCell>Description</TableCell>
                          <TableCell width={100}>Resource</TableCell>
                          <TableCell width={80}>Action</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {categoryPerms.map((perm) => {
                          const status = getPermissionStatus(perm.id);
                          return (
                            <TableRow key={perm.id}>
                              <TableCell>
                                {status === "direct" && (
                                  <CheckIcon color="success" fontSize="small" />
                                )}
                                {status === "inherited" && (
                                  <CheckIcon color="secondary" fontSize="small" />
                                )}
                                {status === "none" && (
                                  <RemoveIcon color="disabled" fontSize="small" />
                                )}
                              </TableCell>
                              <TableCell>
                                <Typography
                                  variant="body2"
                                  fontWeight={status !== "none" ? 500 : 400}
                                  color={status === "none" ? "text.secondary" : "text.primary"}
                                >
                                  {perm.displayName}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="caption" color="textSecondary">
                                  {perm.description}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={perm.resource}
                                  size="small"
                                  variant="outlined"
                                  sx={{ fontSize: "0.7rem" }}
                                />
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={perm.action}
                                  size="small"
                                  color={
                                    perm.action === "create"
                                      ? "success"
                                      : perm.action === "update"
                                        ? "info"
                                        : perm.action === "delete"
                                          ? "error"
                                          : "default"
                                  }
                                  sx={{ fontSize: "0.7rem" }}
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              );
            })}
          </Box>

          {/* All Effective Permissions List */}
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              All Effective Permissions ({effectivePermissions.size})
            </Typography>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
              {Array.from(effectivePermissions)
                .sort()
                .map((permId) => {
                  const isDirect = directPermissions.has(permId);
                  return (
                    <Chip
                      key={permId}
                      label={permId}
                      size="small"
                      color={isDirect ? "primary" : "secondary"}
                      variant={isDirect ? "filled" : "outlined"}
                      sx={{ fontSize: "0.7rem" }}
                    />
                  );
                })}
            </Stack>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
