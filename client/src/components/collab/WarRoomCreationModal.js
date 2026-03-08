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
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const client_1 = require("@apollo/client");
// In a real project, this would be in a .graphql file and imported
// after running a codegen process.
const CREATE_WAR_ROOM = (0, client_1.gql) `
  mutation CreateWarRoom($name: String!) {
    createWarRoom(name: $name) {
      id
      name
      createdAt
    }
  }
`;
const WarRoomCreationModal = ({ open, onClose, onSuccess, }) => {
    const [name, setName] = (0, react_1.useState)('');
    const [createWarRoom, { loading, error }] = (0, client_1.useMutation)(CREATE_WAR_ROOM);
    const handleCreate = async () => {
        if (name.trim()) {
            try {
                const { data } = await createWarRoom({ variables: { name: name.trim() } });
                if (data) {
                    onSuccess(data);
                    setName('');
                    onClose();
                }
            }
            catch (e) {
                // Error is already captured by the `error` object from useMutation
                console.error('Failed to create War Room:', e);
            }
        }
    };
    return (<material_1.Dialog open={open} onClose={onClose}>
      <material_1.DialogTitle>Create a New War Room</material_1.DialogTitle>
      <material_1.DialogContent>
        {error && <material_1.Alert severity="error">{error.message}</material_1.Alert>}
        <material_1.TextField autoFocus margin="dense" label="War Room Name" type="text" fullWidth variant="standard" value={name} onChange={(e) => setName(e.target.value)} disabled={loading}/>
      </material_1.DialogContent>
      <material_1.DialogActions>
        <material_1.Button onClick={onClose} disabled={loading}>
          Cancel
        </material_1.Button>
        <material_1.Button onClick={handleCreate} disabled={!name.trim() || loading}>
          {loading ? <material_1.CircularProgress size={24}/> : 'Create'}
        </material_1.Button>
      </material_1.DialogActions>
    </material_1.Dialog>);
};
exports.default = WarRoomCreationModal;
