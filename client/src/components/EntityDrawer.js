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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = EntityDrawer;
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const client_1 = require("@apollo/client");
const Edit_1 = __importDefault(require("@mui/icons-material/Edit"));
const Close_1 = __importDefault(require("@mui/icons-material/Close"));
const GET_ENTITY = (0, client_1.gql) `
  query GetEntity($id: ID!) {
    entity(id: $id) {
      id
      type
      label
      description
      properties
      updatedAt
    }
  }
`;
const UPDATE_ENTITY = (0, client_1.gql) `
  mutation UpdateEntity(
    $id: ID!
    $input: UpdateEntityInput!
    $lastSeen: DateTime!
  ) {
    updateEntity(id: $id, input: $input, lastSeenTimestamp: $lastSeen) {
      id
      type
      label
      description
      properties
      updatedAt
    }
  }
`;
const ENTITY_UPDATED = (0, client_1.gql) `
  subscription EntityUpdated {
    entityUpdated {
      id
      type
      label
      description
      properties
      updatedAt
    }
  }
`;
function DiffRow({ label, oldValue, newValue, }) {
    const changed = oldValue !== newValue;
    return (<material_1.Box display="flex" gap={1} mt={1} alignItems="center">
      <material_1.Typography variant="caption" sx={{ width: 80 }}>
        {label}
      </material_1.Typography>
      <material_1.Typography variant="caption" color={changed ? 'error.main' : 'text.secondary'} sx={{ textDecoration: changed ? 'line-through' : 'none' }}>
        {oldValue || '<empty>'}
      </material_1.Typography>
      <material_1.Typography variant="caption" color={changed ? 'success.main' : 'text.secondary'}>
        {newValue || '<empty>'}
      </material_1.Typography>
    </material_1.Box>);
}
function EntityDrawer({ entityId, open, onClose, }) {
    const { data } = (0, client_1.useQuery)(GET_ENTITY, {
        variables: { id: entityId },
        skip: !entityId,
    });
    const [updateEntity] = (0, client_1.useMutation)(UPDATE_ENTITY);
    const { data: subData } = (0, client_1.useSubscription)(ENTITY_UPDATED);
    const [entity, setEntity] = (0, react_1.useState)(null);
    const [prevEntity, setPrevEntity] = (0, react_1.useState)(null);
    const [editMode, setEditMode] = (0, react_1.useState)(false);
    const [formValues, setFormValues] = (0, react_1.useState)({ label: '', description: '' });
    const [tags, setTags] = (0, react_1.useState)([]);
    const [newTag, setNewTag] = (0, react_1.useState)('');
    (0, react_1.useEffect)(() => {
        if (data?.entity) {
            setEntity(data.entity);
            setFormValues({
                label: data.entity.label,
                description: data.entity.description || '',
            });
            setTags(data.entity.properties?.tags || []);
        }
    }, [data]);
    (0, react_1.useEffect)(() => {
        const updated = subData?.entityUpdated;
        if (updated && updated.id === entityId) {
            setPrevEntity(entity || null);
            setEntity(updated);
            setFormValues({
                label: updated.label,
                description: updated.description || '',
            });
            setTags(updated.properties?.tags || []);
        }
    }, [subData, entityId, entity]);
    const handleSave = async () => {
        if (!entityId)
            return;
        const input = {
            label: formValues.label,
            description: formValues.description,
            properties: { ...entity?.properties, tags },
        };
        await updateEntity({
            variables: { id: entityId, input, lastSeen: new Date().toISOString() },
        });
    };
    const handleBlur = () => {
        if (editMode)
            handleSave();
    };
    const handleTagAdd = () => {
        const t = newTag.trim();
        if (t && !tags.includes(t)) {
            setTags([...tags, t]);
            setNewTag('');
        }
    };
    const handleTagDelete = (tag) => {
        setTags(tags.filter((t) => t !== tag));
    };
    const diffSection = prevEntity && (<material_1.Box mt={2}>
      <material_1.Typography variant="subtitle2">Last Update Diff</material_1.Typography>
      <DiffRow label="Label" oldValue={prevEntity.label} newValue={entity?.label}/>
      <DiffRow label="Description" oldValue={prevEntity.description || ''} newValue={entity?.description || ''}/>
      <DiffRow label="Tags" oldValue={(prevEntity.properties?.tags || []).join(', ')} newValue={tags.join(', ')}/>
    </material_1.Box>);
    return (<material_1.Drawer anchor="right" open={open} onClose={onClose} sx={{ '& .MuiDrawer-paper': { width: 400, p: 2 } }}>
      <material_1.Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <material_1.Typography variant="h6">Entity Details</material_1.Typography>
        <material_1.Box>
          <material_1.IconButton onClick={() => setEditMode((m) => !m)} size="small" sx={{ mr: 1 }}>
            <Edit_1.default />
          </material_1.IconButton>
          <material_1.IconButton onClick={onClose} size="small">
            <Close_1.default />
          </material_1.IconButton>
        </material_1.Box>
      </material_1.Box>
      <material_1.Stack spacing={2}>
        <material_1.TextField label="Label" value={formValues.label} onChange={(e) => setFormValues({ ...formValues, label: e.target.value })} onBlur={handleBlur} disabled={!editMode} fullWidth/>
        <material_1.TextField label="Description" value={formValues.description} multiline minRows={3} onChange={(e) => setFormValues({ ...formValues, description: e.target.value })} onBlur={handleBlur} disabled={!editMode} fullWidth/>
        <material_1.Box>
          <material_1.Typography variant="subtitle2" gutterBottom>
            Metadata Tags
          </material_1.Typography>
          <material_1.Stack direction="row" spacing={1} flexWrap="wrap" onBlur={handleBlur}>
            {tags.map((tag) => (<material_1.Chip key={tag} label={tag} onDelete={editMode ? () => handleTagDelete(tag) : undefined} sx={{ mb: 1 }}/>))}
            {editMode && (<material_1.TextField size="small" value={newTag} onChange={(e) => setNewTag(e.target.value)} onKeyDown={(e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleTagAdd();
                }
            }}/>)}
          </material_1.Stack>
        </material_1.Box>
        {editMode && (<material_1.Button variant="contained" onClick={handleSave} sx={{ alignSelf: 'flex-start' }}>
            Save
          </material_1.Button>)}
        {diffSection}
      </material_1.Stack>
    </material_1.Drawer>);
}
