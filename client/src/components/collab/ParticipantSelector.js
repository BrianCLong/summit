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
// Mock user data for demonstration
const mockUsers = [
    { id: '1', name: 'Alice' },
    { id: '2', name: 'Bob' },
    { id: '3', name: 'Charlie' },
    { id: '4', name: 'Diana' },
];
const ParticipantSelector = ({ onParticipantsChange, }) => {
    const [selectedParticipants, setSelectedParticipants] = (0, react_1.useState)([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleSelectionChange = (event, newValue) => {
        setSelectedParticipants(newValue);
        onParticipantsChange(newValue);
    };
    return (<material_1.Autocomplete multiple options={mockUsers} getOptionLabel={(option) => option.name} value={selectedParticipants} onChange={handleSelectionChange} renderInput={(params) => (<material_1.TextField {...params} variant="standard" label="Add Participants" placeholder="Search for users..."/>)} renderTags={(value, getTagProps) => value.map((option, index) => (<material_1.Chip variant="outlined" label={option.name} {...getTagProps({ index })}/>))}/>);
};
exports.default = ParticipantSelector;
