"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PresencePill = PresencePill;
const react_1 = __importDefault(require("react"));
const material_1 = require("@mui/material");
const mockPresence = [
    { userId: '1', displayName: 'Analyst A', status: 'active' },
    { userId: '2', displayName: 'Analyst B', status: 'reviewing' },
    { userId: '3', displayName: 'Analyst C', status: 'active' },
    { userId: '4', displayName: 'Analyst D', status: 'away' },
];
function PresencePill({ caseId, platformWide = false, }) {
    const users = platformWide || !caseId ? mockPresence : mockPresence.slice(0, 2);
    if (users.length === 0) {
        return null;
    }
    const displayUsers = users.slice(0, 3);
    const overflow = users.length - 3;
    return (<material_1.Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }} aria-live="polite">
      <material_1.AvatarGroup max={4} sx={{
            '& .MuiAvatar-root': { width: 24, height: 24, fontSize: '0.75rem' },
        }}>
        {displayUsers.map((user) => (<material_1.Tooltip key={user.userId} title={`${user.displayName} (${user.status})`}>
            <material_1.Avatar>{user.displayName.charAt(0).toUpperCase()}</material_1.Avatar>
          </material_1.Tooltip>))}
        {overflow > 0 && (<material_1.Avatar sx={{ fontSize: '0.6rem' }}>+{overflow}</material_1.Avatar>)}
      </material_1.AvatarGroup>

      <material_1.Chip size="small" label={`${users.length} active`} color="primary" variant="outlined" sx={{
            height: 20,
            '& .MuiChip-label': { px: 1, fontSize: '0.75rem' },
        }}/>
    </material_1.Box>);
}
