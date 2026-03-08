"use strict";
/**
 * HuntQueryBuilder
 * Visual query builder for creating custom threat hunting queries
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HuntQueryBuilder = void 0;
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const Grid_1 = __importDefault(require("@mui/material/Grid"));
const icons_material_1 = require("@mui/icons-material");
const TEMPLATE_CATEGORIES = [
    { id: 'lateral_movement', label: 'Lateral Movement' },
    { id: 'credential_access', label: 'Credential Access' },
    { id: 'data_exfiltration', label: 'Data Exfiltration' },
    { id: 'persistence', label: 'Persistence' },
    { id: 'command_and_control', label: 'Command & Control' },
    { id: 'insider_threat', label: 'Insider Threat' },
    { id: 'ioc_hunting', label: 'IOC Hunting' },
];
const MITRE_TECHNIQUES = [
    { id: 'T1021.001', name: 'Remote Desktop Protocol', tactic: 'Lateral Movement' },
    { id: 'T1021.002', name: 'SMB/Windows Admin Shares', tactic: 'Lateral Movement' },
    { id: 'T1110.001', name: 'Password Guessing', tactic: 'Credential Access' },
    { id: 'T1110.003', name: 'Password Spraying', tactic: 'Credential Access' },
    { id: 'T1078', name: 'Valid Accounts', tactic: 'Defense Evasion' },
    { id: 'T1071.001', name: 'Web Protocols', tactic: 'Command and Control' },
    { id: 'T1053.005', name: 'Scheduled Task', tactic: 'Persistence' },
    { id: 'T1048', name: 'Exfiltration Over Alternative Protocol', tactic: 'Exfiltration' },
];
const SAMPLE_TEMPLATES = [
    {
        id: 'lateral_movement_chain',
        name: 'Lateral Movement Chain Detection',
        category: 'lateral_movement',
        description: 'Detects multi-hop lateral movement patterns through the network',
        query: `MATCH path = (source:Entity {id: $start_entity})-[:CONNECTED_TO|ACCESSED*1..$max_hops]->(target:Entity)
WHERE source <> target
  AND ALL(r IN relationships(path) WHERE r.timestamp > datetime() - duration({hours: $time_window_hours}))
RETURN source, target, length(path) as hops
LIMIT 100`,
        parameters: [
            { name: 'start_entity', type: 'string', value: '', description: 'Starting entity ID' },
            { name: 'max_hops', type: 'number', value: 3, description: 'Maximum hops to traverse' },
            { name: 'time_window_hours', type: 'number', value: 24, description: 'Time window in hours' },
        ],
    },
    {
        id: 'credential_spray',
        name: 'Credential Spraying Detection',
        category: 'credential_access',
        description: 'Identifies potential credential spraying attacks',
        query: `MATCH (actor:Entity)-[auth:AUTHENTICATED]->(target:Entity)
WHERE auth.timestamp > datetime() - duration({minutes: $time_window_minutes})
  AND auth.status = 'FAILED'
WITH actor, count(DISTINCT target) as unique_targets, count(*) as total_attempts
WHERE total_attempts >= $threshold_failures
  AND unique_targets >= $unique_target_threshold
RETURN actor, unique_targets, total_attempts
LIMIT 50`,
        parameters: [
            { name: 'time_window_minutes', type: 'number', value: 30, description: 'Time window in minutes' },
            { name: 'threshold_failures', type: 'number', value: 10, description: 'Minimum failed attempts' },
            { name: 'unique_target_threshold', type: 'number', value: 5, description: 'Minimum unique targets' },
        ],
    },
    {
        id: 'beaconing_detection',
        name: 'C2 Beaconing Pattern Detection',
        category: 'command_and_control',
        description: 'Identifies C2 beaconing patterns through network traffic analysis',
        query: `MATCH (internal:Entity)-[conn:CONNECTED_TO]->(external:Entity {is_external: true})
WHERE conn.timestamp > datetime() - duration({hours: $time_window_hours})
WITH internal, external, count(*) as connection_count
WHERE connection_count >= $min_beacon_count
RETURN internal, external, connection_count
ORDER BY connection_count DESC
LIMIT 50`,
        parameters: [
            { name: 'time_window_hours', type: 'number', value: 24, description: 'Time window in hours' },
            { name: 'min_beacon_count', type: 'number', value: 100, description: 'Minimum beacon count' },
        ],
    },
];
const HuntQueryBuilder = () => {
    const [activeTab, setActiveTab] = (0, react_1.useState)(0);
    const [selectedTemplate, setSelectedTemplate] = (0, react_1.useState)(null);
    const [parameters, setParameters] = (0, react_1.useState)([]);
    const [customQuery, setCustomQuery] = (0, react_1.useState)('');
    const [hypothesis, setHypothesis] = (0, react_1.useState)({
        statement: '',
        techniques: [],
        expectedIndicators: [],
    });
    const [newIndicator, setNewIndicator] = (0, react_1.useState)('');
    const [queryResult, setQueryResult] = (0, react_1.useState)(null);
    const [isRunning, setIsRunning] = (0, react_1.useState)(false);
    const handleTemplateSelect = (0, react_1.useCallback)((template) => {
        setSelectedTemplate(template);
        setParameters([...template.parameters]);
        setCustomQuery(template.query);
    }, []);
    const handleParameterChange = (0, react_1.useCallback)((index, value) => {
        setParameters((prev) => {
            const updated = [...prev];
            updated[index] = { ...updated[index], value };
            return updated;
        });
    }, []);
    const handleAddIndicator = (0, react_1.useCallback)(() => {
        if (newIndicator.trim()) {
            setHypothesis((prev) => ({
                ...prev,
                expectedIndicators: [...prev.expectedIndicators, newIndicator.trim()],
            }));
            setNewIndicator('');
        }
    }, [newIndicator]);
    const handleRemoveIndicator = (0, react_1.useCallback)((index) => {
        setHypothesis((prev) => ({
            ...prev,
            expectedIndicators: prev.expectedIndicators.filter((_, i) => i !== index),
        }));
    }, []);
    const buildFinalQuery = (0, react_1.useCallback)(() => {
        let query = customQuery;
        // Replace parameters with values
        for (const param of parameters) {
            const placeholder = `$${param.name}`;
            let value;
            if (param.type === 'string') {
                value = `'${param.value}'`;
            }
            else if (param.type === 'array') {
                value = JSON.stringify(param.value);
            }
            else {
                value = String(param.value);
            }
            query = query.replace(new RegExp(`\\${placeholder}\\b`, 'g'), value);
        }
        return query;
    }, [customQuery, parameters]);
    const handleRunQuery = (0, react_1.useCallback)(async () => {
        setIsRunning(true);
        setQueryResult(null);
        try {
            const finalQuery = buildFinalQuery();
            // In production, this would call the actual API
            const response = await fetch('/api/v1/hunt/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: finalQuery,
                    hypothesis: hypothesis.statement ? hypothesis : undefined,
                }),
            });
            if (response.ok) {
                const result = await response.json();
                setQueryResult(JSON.stringify(result, null, 2));
            }
            else {
                setQueryResult(`Error: ${response.statusText}`);
            }
        }
        catch (error) {
            setQueryResult(`Error: ${error.message}`);
        }
        finally {
            setIsRunning(false);
        }
    }, [buildFinalQuery, hypothesis]);
    const handleCopyQuery = (0, react_1.useCallback)(() => {
        navigator.clipboard.writeText(buildFinalQuery());
    }, [buildFinalQuery]);
    return (<material_1.Box sx={{ p: 3 }}>
      <material_1.Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <icons_material_1.Code />
        Hunt Query Builder
      </material_1.Typography>
      <material_1.Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Build and execute custom threat hunting queries against the knowledge graph
      </material_1.Typography>

      <Grid_1.default container spacing={3}>
        {/* Left Panel - Templates & Parameters */}
        <Grid_1.default item xs={12} md={5}>
          <material_1.Card sx={{ mb: 2 }}>
            <material_1.CardContent>
              <material_1.Typography variant="h6" gutterBottom>
                Query Templates
              </material_1.Typography>

              <material_1.Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} variant="scrollable" scrollButtons="auto" sx={{ mb: 2 }}>
                {TEMPLATE_CATEGORIES.map((cat) => (<material_1.Tab key={cat.id} label={cat.label}/>))}
              </material_1.Tabs>

              <material_1.Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {SAMPLE_TEMPLATES.filter((t) => t.category === TEMPLATE_CATEGORIES[activeTab]?.id).map((template) => (<material_1.Paper key={template.id} sx={{
                p: 2,
                cursor: 'pointer',
                border: selectedTemplate?.id === template.id ? 2 : 1,
                borderColor: selectedTemplate?.id === template.id ? 'primary.main' : 'divider',
                '&:hover': { borderColor: 'primary.light' },
            }} onClick={() => handleTemplateSelect(template)}>
                    <material_1.Typography variant="subtitle1" fontWeight="bold">
                      {template.name}
                    </material_1.Typography>
                    <material_1.Typography variant="body2" color="text.secondary">
                      {template.description}
                    </material_1.Typography>
                  </material_1.Paper>))}
              </material_1.Box>
            </material_1.CardContent>
          </material_1.Card>

          {/* Parameters */}
          {parameters.length > 0 && (<material_1.Card sx={{ mb: 2 }}>
              <material_1.CardContent>
                <material_1.Typography variant="h6" gutterBottom>
                  Parameters
                </material_1.Typography>

                <material_1.Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {parameters.map((param, index) => (<material_1.TextField key={param.name} label={param.name} type={param.type === 'number' ? 'number' : 'text'} value={param.value} onChange={(e) => handleParameterChange(index, param.type === 'number'
                    ? parseFloat(e.target.value) || 0
                    : e.target.value)} helperText={param.description} fullWidth size="small"/>))}
                </material_1.Box>
              </material_1.CardContent>
            </material_1.Card>)}

          {/* Hypothesis Builder */}
          <material_1.Card>
            <material_1.CardContent>
              <material_1.Typography variant="h6" gutterBottom>
                Hypothesis (Optional)
              </material_1.Typography>

              <material_1.Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <material_1.TextField label="Hypothesis Statement" value={hypothesis.statement} onChange={(e) => setHypothesis({ ...hypothesis, statement: e.target.value })} multiline rows={2} fullWidth placeholder="e.g., Detect lateral movement via RDP from compromised workstations"/>

                <material_1.Autocomplete multiple options={MITRE_TECHNIQUES} getOptionLabel={(option) => `${option.id}: ${option.name}`} value={MITRE_TECHNIQUES.filter((t) => hypothesis.techniques.includes(t.id))} onChange={(_, values) => setHypothesis({
            ...hypothesis,
            techniques: values.map((v) => v.id),
        })} renderInput={(params) => (<material_1.TextField {...params} label="MITRE ATT&CK Techniques"/>)} renderTags={(value, getTagProps) => value.map((option, index) => (<material_1.Chip {...getTagProps({ index })} key={option.id} label={option.id} size="small" color="primary"/>))}/>

                <material_1.Box>
                  <material_1.Typography variant="subtitle2" gutterBottom>
                    Expected Indicators
                  </material_1.Typography>
                  <material_1.Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                    <material_1.TextField value={newIndicator} onChange={(e) => setNewIndicator(e.target.value)} placeholder="Add indicator..." size="small" fullWidth onKeyPress={(e) => e.key === 'Enter' && handleAddIndicator()}/>
                    <material_1.IconButton onClick={handleAddIndicator} color="primary">
                      <icons_material_1.Add />
                    </material_1.IconButton>
                  </material_1.Box>
                  <material_1.Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {hypothesis.expectedIndicators.map((indicator, index) => (<material_1.Chip key={index} label={indicator} onDelete={() => handleRemoveIndicator(index)} size="small"/>))}
                  </material_1.Box>
                </material_1.Box>
              </material_1.Box>
            </material_1.CardContent>
          </material_1.Card>
        </Grid_1.default>

        {/* Right Panel - Query Editor & Results */}
        <Grid_1.default item xs={12} md={7}>
          <material_1.Card sx={{ mb: 2 }}>
            <material_1.CardContent>
              <material_1.Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <material_1.Typography variant="h6">Query Editor</material_1.Typography>
                <material_1.Box sx={{ display: 'flex', gap: 1 }}>
                  <material_1.Tooltip title="Copy Query">
                    <material_1.IconButton onClick={handleCopyQuery} size="small">
                      <icons_material_1.ContentCopy />
                    </material_1.IconButton>
                  </material_1.Tooltip>
                  <material_1.Tooltip title="Save Template">
                    <material_1.IconButton size="small">
                      <icons_material_1.Save />
                    </material_1.IconButton>
                  </material_1.Tooltip>
                </material_1.Box>
              </material_1.Box>

              <material_1.TextField value={customQuery} onChange={(e) => setCustomQuery(e.target.value)} multiline rows={12} fullWidth sx={{
            fontFamily: 'monospace',
            '& .MuiInputBase-input': {
                fontFamily: 'monospace',
                fontSize: '0.875rem',
            },
        }}/>

              <material_1.Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                <material_1.Button variant="contained" color="primary" startIcon={<icons_material_1.PlayArrow />} onClick={handleRunQuery} disabled={isRunning || !customQuery.trim()}>
                  {isRunning ? 'Running...' : 'Run Query'}
                </material_1.Button>
              </material_1.Box>
            </material_1.CardContent>
          </material_1.Card>

          {/* Results */}
          <material_1.Card>
            <material_1.CardContent>
              <material_1.Typography variant="h6" gutterBottom>
                Results
              </material_1.Typography>

              {queryResult ? (<material_1.Paper sx={{
                p: 2,
                bgcolor: 'grey.900',
                color: 'grey.100',
                maxHeight: 400,
                overflow: 'auto',
            }}>
                  <pre style={{ margin: 0, fontFamily: 'monospace', fontSize: '0.875rem' }}>
                    {queryResult}
                  </pre>
                </material_1.Paper>) : (<material_1.Alert severity="info">
                  Run a query to see results here
                </material_1.Alert>)}
            </material_1.CardContent>
          </material_1.Card>
        </Grid_1.default>
      </Grid_1.default>
    </material_1.Box>);
};
exports.HuntQueryBuilder = HuntQueryBuilder;
exports.default = exports.HuntQueryBuilder;
