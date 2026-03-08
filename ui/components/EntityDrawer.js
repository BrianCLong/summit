"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = EntityDrawer;
const react_1 = __importDefault(require("react"));
const client_1 = require("@apollo/client");
const material_1 = require("@mui/material");
const react_router_dom_1 = require("react-router-dom");
const SIMILAR_QUERY = (0, client_1.gql) `
  query SimilarEntities($entityId: ID!, $topK: Int!) {
    similarEntities(entityId: $entityId, topK: $topK) {
      id
      score
    }
  }
`;
function EntityDrawer({ entityId, open, onClose, topK = 20, }) {
    const navigate = (0, react_router_dom_1.useNavigate)();
    const { data, loading } = (0, client_1.useQuery)(SIMILAR_QUERY, {
        variables: { entityId: entityId, topK },
        skip: !open || !entityId,
    });
    return (<material_1.Drawer anchor="right" open={open} onClose={onClose}>
      <material_1.List sx={{ width: 360, p: 2 }}>
        <material_1.ListItem>
          <material_1.ListItemText primary="Similar Entities"/>
        </material_1.ListItem>
        {loading && (<material_1.ListItem>
            <material_1.ListItemText primary="Loading..."/>
          </material_1.ListItem>)}
        {data?.similarEntities?.map((n) => (<material_1.ListItem key={n.id} button onClick={() => {
                navigate(`/entities/${n.id}`);
                onClose();
            }}>
            <material_1.ListItemText primary={n.id} secondary={`${(n.score * 100).toFixed(1)}%`}/>
          </material_1.ListItem>))}
      </material_1.List>
    </material_1.Drawer>);
}
