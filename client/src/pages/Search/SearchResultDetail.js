"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SearchResultDetail;
const react_1 = __importDefault(require("react"));
const material_1 = require("@mui/material");
const react_router_dom_1 = require("react-router-dom");
const useSafeQuery_1 = require("../../hooks/useSafeQuery");
const icons_material_1 = require("@mui/icons-material");
function SearchResultDetail() {
    const { id } = (0, react_router_dom_1.useParams)();
    const navigate = (0, react_router_dom_1.useNavigate)();
    const { data } = (0, useSafeQuery_1.useSafeQuery)({
        queryKey: `search_result_${id}`,
        mock: {
            id: id || 'result1',
            title: 'Sample Search Result',
            type: 'entity',
            snippet: 'This is a sample search result snippet...',
            score: 0.95,
            timestamp: new Date().toISOString(),
        },
        deps: [id],
    });
    return (<material_1.Box sx={{ p: 2 }}>
      <material_1.Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
        <material_1.IconButton onClick={() => navigate('/search')}>
          <icons_material_1.ArrowBack />
        </material_1.IconButton>
        <material_1.Typography variant="h5">Search Result</material_1.Typography>
      </material_1.Stack>
      <material_1.Card sx={{ borderRadius: 3 }}>
        <material_1.CardContent>
          <material_1.Typography variant="h6" gutterBottom>
            {data?.title}
          </material_1.Typography>
          <material_1.Typography variant="body2" color="text.secondary" gutterBottom>
            Type: {data?.type}
          </material_1.Typography>
          <material_1.Typography variant="body1" sx={{ my: 2 }}>
            {data?.snippet}
          </material_1.Typography>
          <material_1.Typography variant="body2" color="text.secondary">
            Relevance Score: {((data?.score || 0) * 100).toFixed(1)}%
          </material_1.Typography>
          <material_1.Typography variant="body2" color="text.secondary">
            Found: {data?.timestamp ? new Date(data.timestamp).toLocaleString() : 'N/A'}
          </material_1.Typography>
        </material_1.CardContent>
      </material_1.Card>
    </material_1.Box>);
}
