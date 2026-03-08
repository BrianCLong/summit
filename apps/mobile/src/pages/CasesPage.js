"use strict";
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
exports.CasesPage = CasesPage;
/**
 * Cases Page
 * Shows user's assigned cases with offline support
 */
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
const react_router_dom_1 = require("react-router-dom");
const useCases_1 = require("@/hooks/useCases");
const theme_1 = require("@/theme");
// Status badge colors
const statusColors = {
    open: '#22c55e',
    in_progress: '#3b82f6',
    pending_review: '#f59e0b',
    closed: '#64748b',
};
function CaseCard({ caseData, onClick }) {
    return (<material_1.Card sx={{
            mb: 2,
            borderLeft: `4px solid ${(0, theme_1.getPriorityColor)(caseData.priority)}`,
        }}>
      <material_1.CardActionArea onClick={onClick}>
        <material_1.CardContent>
          <material_1.Box display="flex" justifyContent="space-between" alignItems="flex-start">
            <material_1.Box flex={1}>
              <material_1.Typography variant="h6" fontWeight={600} gutterBottom noWrap>
                {caseData.title}
              </material_1.Typography>
              <material_1.Box display="flex" gap={1} flexWrap="wrap" mb={1}>
                <material_1.Chip label={caseData.status.replace('_', ' ')} size="small" sx={{
            bgcolor: statusColors[caseData.status],
            color: 'white',
            fontSize: '0.7rem',
            height: 22,
        }}/>
                <material_1.Chip label={caseData.priority} size="small" variant="outlined" sx={{ fontSize: '0.7rem', height: 22 }}/>
              </material_1.Box>
            </material_1.Box>
            <icons_material_1.Folder sx={{ color: 'text.secondary' }}/>
          </material_1.Box>

          {caseData.summary && (<material_1.Typography variant="body2" color="text.secondary" sx={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                mb: 2,
            }}>
              {caseData.summary}
            </material_1.Typography>)}

          {/* Key entities preview */}
          {caseData.keyEntities && caseData.keyEntities.length > 0 && (<material_1.Box display="flex" alignItems="center" gap={1} mb={2}>
              <material_1.AvatarGroup max={4} sx={{ '& .MuiAvatar-root': { width: 28, height: 28, fontSize: '0.75rem' } }}>
                {caseData.keyEntities.map((entity) => (<material_1.Avatar key={entity.id} src={entity.thumbnailUrl} alt={entity.name}>
                    {entity.name.charAt(0)}
                  </material_1.Avatar>))}
              </material_1.AvatarGroup>
              <material_1.Typography variant="caption" color="text.secondary">
                {caseData.entityCount} entities
              </material_1.Typography>
            </material_1.Box>)}

          {/* Stats row */}
          <material_1.Box display="flex" gap={2} alignItems="center">
            <material_1.Box display="flex" alignItems="center" gap={0.5}>
              <icons_material_1.AccessTime sx={{ fontSize: 14, color: 'text.disabled' }}/>
              <material_1.Typography variant="caption" color="text.disabled">
                {new Date(caseData.lastUpdated).toLocaleDateString()}
              </material_1.Typography>
            </material_1.Box>
            {caseData.alertCount > 0 && (<material_1.Chip label={`${caseData.alertCount} alerts`} size="small" color="error" sx={{ fontSize: '0.65rem', height: 18 }}/>)}
          </material_1.Box>
        </material_1.CardContent>
      </material_1.CardActionArea>
    </material_1.Card>);
}
// Main Cases Page
function CasesPage() {
    const navigate = (0, react_router_dom_1.useNavigate)();
    const [searchQuery, setSearchQuery] = (0, react_1.useState)('');
    const { cases, isLoading, refresh } = (0, useCases_1.useCases)();
    // Filter cases by search query
    const filteredCases = cases.filter((c) => c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.summary?.toLowerCase().includes(searchQuery.toLowerCase()));
    return (<material_1.Box sx={{ pb: 8 }}>
      {/* Header */}
      <material_1.Box sx={{
            px: 2,
            py: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
        }}>
        <material_1.Typography variant="h5" fontWeight={600}>
          Cases
        </material_1.Typography>
        <material_1.IconButton onClick={refresh} disabled={isLoading}>
          <icons_material_1.Refresh />
        </material_1.IconButton>
      </material_1.Box>

      {/* Search */}
      <material_1.Box sx={{ px: 2, mb: 2 }}>
        <material_1.TextField fullWidth placeholder="Search cases..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} InputProps={{
            startAdornment: (<material_1.InputAdornment position="start">
                <icons_material_1.Search />
              </material_1.InputAdornment>),
        }} size="small"/>
      </material_1.Box>

      {/* Cases list */}
      <material_1.Box sx={{ px: 2 }}>
        {isLoading ? (Array.from({ length: 4 }).map((_, i) => (<material_1.Skeleton key={i} variant="rounded" height={160} sx={{ mb: 2, borderRadius: 2 }}/>))) : filteredCases.length === 0 ? (<material_1.Box textAlign="center" py={4}>
            <icons_material_1.Folder sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }}/>
            <material_1.Typography color="text.secondary">
              {searchQuery ? 'No cases match your search' : 'No assigned cases'}
            </material_1.Typography>
          </material_1.Box>) : (filteredCases.map((caseData) => (<CaseCard key={caseData.id} caseData={caseData} onClick={() => navigate(`/cases/${caseData.id}`)}/>)))}
      </material_1.Box>
    </material_1.Box>);
}
exports.default = CasesPage;
