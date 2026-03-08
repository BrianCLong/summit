"use strict";
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
exports.default = PermissionMatrix;
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
function PermissionMatrix({ open, role, permissions, permissionCategories, onClose, }) {
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
    // Determine which permissions are direct vs inherited
    const directPermissions = new Set(role.permissions);
    const effectivePermissions = new Set(role.effectivePermissions);
    const inheritedPermissions = new Set(role.effectivePermissions.filter((p) => !directPermissions.has(p)));
    const getPermissionStatus = (permId) => {
        if (directPermissions.has(permId))
            return 'direct';
        if (inheritedPermissions.has(permId))
            return 'inherited';
        return 'none';
    };
    const countCategoryPermissions = (category) => {
        const categoryPerms = permissionsByCategory[category] || [];
        return categoryPerms.filter((p) => effectivePermissions.has(p.id)).length;
    };
    return (<material_1.Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <material_1.DialogTitle>
        <material_1.Stack direction="row" spacing={2} alignItems="center">
          <material_1.Typography variant="h6">{role.displayName}</material_1.Typography>
          {role.isBuiltIn && (<material_1.Chip label="Built-in" size="small" variant="outlined"/>)}
          <material_1.Chip label={role.scope} size="small" color="primary"/>
        </material_1.Stack>
      </material_1.DialogTitle>
      <material_1.DialogContent>
        <material_1.Stack spacing={3}>
          {/* Role Info */}
          <material_1.Box>
            {role.description && (<material_1.Typography variant="body2" color="textSecondary" gutterBottom>
                {role.description}
              </material_1.Typography>)}
            <material_1.Stack direction="row" spacing={3} mt={1}>
              <material_1.Typography variant="body2">
                <strong>Direct Permissions:</strong> {directPermissions.size}
              </material_1.Typography>
              <material_1.Typography variant="body2">
                <strong>Inherited:</strong> {inheritedPermissions.size}
              </material_1.Typography>
              <material_1.Typography variant="body2">
                <strong>Total Effective:</strong> {effectivePermissions.size}
              </material_1.Typography>
            </material_1.Stack>
          </material_1.Box>

          {/* Inherited Roles */}
          {role.inherits.length > 0 && (<material_1.Box>
              <material_1.Typography variant="subtitle2" gutterBottom>
                Inherits From
              </material_1.Typography>
              <material_1.Stack direction="row" spacing={1}>
                {role.inherits.map((inherited) => (<material_1.Chip key={inherited} label={inherited} variant="outlined" color="secondary"/>))}
              </material_1.Stack>
            </material_1.Box>)}

          <material_1.Divider />

          {/* Legend */}
          <material_1.Stack direction="row" spacing={3}>
            <material_1.Stack direction="row" spacing={1} alignItems="center">
              <icons_material_1.Check color="success" fontSize="small"/>
              <material_1.Typography variant="caption">Direct Permission</material_1.Typography>
            </material_1.Stack>
            <material_1.Stack direction="row" spacing={1} alignItems="center">
              <icons_material_1.Check color="secondary" fontSize="small"/>
              <material_1.Typography variant="caption">Inherited Permission</material_1.Typography>
            </material_1.Stack>
            <material_1.Stack direction="row" spacing={1} alignItems="center">
              <icons_material_1.Remove color="disabled" fontSize="small"/>
              <material_1.Typography variant="caption">Not Granted</material_1.Typography>
            </material_1.Stack>
          </material_1.Stack>

          {/* Permissions by Category */}
          <material_1.Box sx={{ maxHeight: 500, overflow: 'auto' }}>
            {permissionCategories.map((category) => {
            const categoryPerms = permissionsByCategory[category] || [];
            const grantedCount = countCategoryPermissions(category);
            if (categoryPerms.length === 0)
                return null;
            return (<material_1.Box key={category} mb={3}>
                  <material_1.Stack direction="row" spacing={1} alignItems="center" mb={1}>
                    <material_1.Typography variant="subtitle2">
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </material_1.Typography>
                    <material_1.Chip label={`${grantedCount}/${categoryPerms.length}`} size="small" color={grantedCount === categoryPerms.length ? 'success' : 'default'}/>
                  </material_1.Stack>
                  <material_1.TableContainer component={material_1.Paper} variant="outlined">
                    <material_1.Table size="small">
                      <material_1.TableHead>
                        <material_1.TableRow>
                          <material_1.TableCell width={40}>Status</material_1.TableCell>
                          <material_1.TableCell>Permission</material_1.TableCell>
                          <material_1.TableCell>Description</material_1.TableCell>
                          <material_1.TableCell width={100}>Resource</material_1.TableCell>
                          <material_1.TableCell width={80}>Action</material_1.TableCell>
                        </material_1.TableRow>
                      </material_1.TableHead>
                      <material_1.TableBody>
                        {categoryPerms.map((perm) => {
                    const status = getPermissionStatus(perm.id);
                    return (<material_1.TableRow key={perm.id}>
                              <material_1.TableCell>
                                {status === 'direct' && (<icons_material_1.Check color="success" fontSize="small"/>)}
                                {status === 'inherited' && (<icons_material_1.Check color="secondary" fontSize="small"/>)}
                                {status === 'none' && (<icons_material_1.Remove color="disabled" fontSize="small"/>)}
                              </material_1.TableCell>
                              <material_1.TableCell>
                                <material_1.Typography variant="body2" fontWeight={status !== 'none' ? 500 : 400} color={status === 'none' ? 'text.secondary' : 'text.primary'}>
                                  {perm.displayName}
                                </material_1.Typography>
                              </material_1.TableCell>
                              <material_1.TableCell>
                                <material_1.Typography variant="caption" color="textSecondary">
                                  {perm.description}
                                </material_1.Typography>
                              </material_1.TableCell>
                              <material_1.TableCell>
                                <material_1.Chip label={perm.resource} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }}/>
                              </material_1.TableCell>
                              <material_1.TableCell>
                                <material_1.Chip label={perm.action} size="small" color={perm.action === 'create' ? 'success' :
                            perm.action === 'update' ? 'info' :
                                perm.action === 'delete' ? 'error' :
                                    'default'} sx={{ fontSize: '0.7rem' }}/>
                              </material_1.TableCell>
                            </material_1.TableRow>);
                })}
                      </material_1.TableBody>
                    </material_1.Table>
                  </material_1.TableContainer>
                </material_1.Box>);
        })}
          </material_1.Box>

          {/* All Effective Permissions List */}
          <material_1.Box>
            <material_1.Typography variant="subtitle2" gutterBottom>
              All Effective Permissions ({effectivePermissions.size})
            </material_1.Typography>
            <material_1.Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
              {Array.from(effectivePermissions).sort().map((permId) => {
            const isDirect = directPermissions.has(permId);
            return (<material_1.Chip key={permId} label={permId} size="small" color={isDirect ? 'primary' : 'secondary'} variant={isDirect ? 'filled' : 'outlined'} sx={{ fontSize: '0.7rem' }}/>);
        })}
            </material_1.Stack>
          </material_1.Box>
        </material_1.Stack>
      </material_1.DialogContent>
      <material_1.DialogActions>
        <material_1.Button onClick={onClose}>Close</material_1.Button>
      </material_1.DialogActions>
    </material_1.Dialog>);
}
