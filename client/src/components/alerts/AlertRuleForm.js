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
// client/src/components/alerts/AlertRuleForm.tsx
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const AlertRuleForm = ({ rule, onSubmit }) => {
    const [formData, setFormData] = (0, react_1.useState)(rule || {
        name: '',
        metric: '',
        threshold: 0,
        operator: '>',
        durationSeconds: 60,
        severity: 'warning',
        notificationChannelId: '',
    });
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };
    const handleSelectChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };
    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
    };
    return (<material_1.Box component="form" onSubmit={handleSubmit} sx={{ '& .MuiTextField-root': { m: 1, width: '25ch' } }}>
      <material_1.Typography variant="h6">{rule ? 'Edit' : 'Create'} Alert Rule</material_1.Typography>
      <div>
        <material_1.TextField label="Name" name="name" value={formData.name} onChange={handleChange} required/>
        <material_1.TextField label="Metric" name="metric" value={formData.metric} onChange={handleChange} required/>
      </div>
      <div>
        <material_1.TextField label="Threshold" name="threshold" type="number" value={formData.threshold} onChange={handleChange} required/>
        <material_1.FormControl sx={{ m: 1, minWidth: 120 }}>
          <material_1.InputLabel>Operator</material_1.InputLabel>
          <material_1.Select name="operator" value={formData.operator} onChange={handleSelectChange}>
            <material_1.MenuItem value=">">&gt;</material_1.MenuItem>
            <material_1.MenuItem value="<">&lt;</material_1.MenuItem>
            <material_1.MenuItem value="=">=</material_1.MenuItem>
          </material_1.Select>
        </material_1.FormControl>
      </div>
      <div>
        <material_1.TextField label="Duration (seconds)" name="durationSeconds" type="number" value={formData.durationSeconds} onChange={handleChange} required/>
        <material_1.FormControl sx={{ m: 1, minWidth: 120 }}>
          <material_1.InputLabel>Severity</material_1.InputLabel>
          <material_1.Select name="severity" value={formData.severity} onChange={handleSelectChange}>
            <material_1.MenuItem value="info">Info</material_1.MenuItem>
            <material_1.MenuItem value="warning">Warning</material_1.MenuItem>
            <material_1.MenuItem value="critical">Critical</material_1.MenuItem>
          </material_1.Select>
        </material_1.FormControl>
      </div>
      <div>
        <material_1.TextField label="Notification Channel ID" name="notificationChannelId" value={formData.notificationChannelId} onChange={handleChange} required/>
      </div>
      <material_1.Button type="submit" variant="contained" sx={{ m: 1 }}>
        {rule ? 'Save Changes' : 'Create Rule'}
      </material_1.Button>
    </material_1.Box>);
};
exports.default = AlertRuleForm;
