"use strict";
/**
 * Team Pulse - Shows team members' current status and assignments
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeamPulse = void 0;
const react_1 = __importDefault(require("react"));
const material_1 = require("@mui/material");
const TeamPulse = ({ members, isLoading = false, }) => {
    const theme = (0, material_1.useTheme)();
    const getInitials = (name) => {
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };
    if (isLoading) {
        return (<material_1.Paper elevation={0} sx={{ p: 2, border: `1px solid ${theme.palette.divider}` }}>
        <material_1.Skeleton variant="text" width="30%" height={24}/>
        {[1, 2, 3].map((i) => (<material_1.Box key={i} display="flex" alignItems="center" gap={2} mt={2}>
            <material_1.Skeleton variant="circular" width={32} height={32}/>
            <material_1.Skeleton variant="text" width="60%"/>
          </material_1.Box>))}
      </material_1.Paper>);
    }
    return (<material_1.Paper elevation={0} sx={{
            p: 2,
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 2,
        }}>
      <material_1.Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <material_1.Typography variant="h6" fontWeight={600}>
          👥 Team Pulse
        </material_1.Typography>
        <material_1.Typography variant="body2" color="primary" sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}>
          View All
        </material_1.Typography>
      </material_1.Box>

      <material_1.Box display="flex" flexDirection="column" gap={1.5}>
        {members.map((member) => (<material_1.Box key={member.user.id} display="flex" alignItems="center" gap={1.5} sx={{
                p: 1,
                borderRadius: 1,
                '&:hover': {
                    bgcolor: theme.palette.action.hover,
                },
            }}>
            {/* Avatar with status indicator */}
            <material_1.Box position="relative">
              <material_1.Avatar src={member.user.avatarUrl} sx={{ width: 32, height: 32, fontSize: 14 }}>
                {getInitials(member.user.name)}
              </material_1.Avatar>
              <material_1.Box sx={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: 10,
                height: 10,
                borderRadius: '50%',
                bgcolor: member.status.availableForAssignment
                    ? theme.palette.success.main
                    : member.status.online
                        ? theme.palette.warning.main
                        : theme.palette.grey[400],
                border: `2px solid ${theme.palette.background.paper}`,
            }}/>
            </material_1.Box>

            {/* Name and status */}
            <material_1.Box flex={1} minWidth={0}>
              <material_1.Typography variant="body2" fontWeight={500} noWrap>
                @{member.user.name.split(' ')[0].toLowerCase()}
              </material_1.Typography>
              <material_1.Typography variant="caption" color="textSecondary" noWrap>
                {member.status.availableForAssignment
                ? 'Available'
                : member.currentAssignment
                    ? `Working on: ${member.currentAssignment}`
                    : member.status.statusMessage || 'Busy'}
              </material_1.Typography>
            </material_1.Box>

            {/* Situation count badge */}
            {member.activeSituationsCount > 0 && (<material_1.Chip size="small" label={member.activeSituationsCount} sx={{
                    height: 20,
                    minWidth: 20,
                    bgcolor: theme.palette.warning.light,
                    color: theme.palette.warning.dark,
                    fontWeight: 600,
                }}/>)}
          </material_1.Box>))}
      </material_1.Box>

      <material_1.Box mt={2}>
        <material_1.Typography variant="body2" color="primary" sx={{
            cursor: 'pointer',
            '&:hover': { textDecoration: 'underline' },
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
        }}>
          + Update Status
        </material_1.Typography>
      </material_1.Box>
    </material_1.Paper>);
};
exports.TeamPulse = TeamPulse;
exports.default = exports.TeamPulse;
