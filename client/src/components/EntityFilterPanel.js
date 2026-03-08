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
// @ts-nocheck - React 18/19 type compatibility
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const react_router_dom_1 = require("react-router-dom");
const AdapterDateFns_1 = __importDefault(require("@mui/lab/AdapterDateFns"));
const LocalizationProvider_1 = __importDefault(require("@mui/lab/LocalizationProvider"));
const DatePicker_1 = __importDefault(require("@mui/lab/DatePicker"));
const api_1 = require("../services/api");
const tagOptions = ['Person', 'Organization', 'Location', 'Event'];
function EntityFilterPanel() {
    const [searchParams, setSearchParams] = (0, react_router_dom_1.useSearchParams)();
    const [query, setQuery] = (0, react_1.useState)('');
    const [entityOptions, setEntityOptions] = (0, react_1.useState)([]);
    const [tags, setTags] = (0, react_1.useState)([]);
    const [confidence, setConfidence] = (0, react_1.useState)([0, 1]);
    const [startDate, setStartDate] = (0, react_1.useState)(null);
    const [endDate, setEndDate] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        const q = searchParams.get('entity');
        const tagsParam = searchParams.get('tags');
        const confParam = searchParams.get('confidence');
        const startParam = searchParams.get('startDate');
        const endParam = searchParams.get('endDate');
        if (q)
            setQuery(q);
        if (tagsParam)
            setTags(tagsParam.split(',').filter(Boolean));
        if (confParam) {
            const [min, max] = confParam.split('-').map(Number);
            if (!isNaN(min) && !isNaN(max))
                setConfidence([min, max]);
        }
        if (startParam)
            setStartDate(new Date(startParam));
        if (endParam)
            setEndDate(new Date(endParam));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    (0, react_1.useEffect)(() => {
        let active = true;
        if (!query.trim()) {
            setEntityOptions([]);
            return undefined;
        }
        const controller = new AbortController();
        (0, api_1.apiFetch)(`/api/entities/search?q=${encodeURIComponent(query)}`, {
            signal: controller.signal,
        })
            .then((data) => {
            if (!active)
                return;
            if (Array.isArray(data))
                setEntityOptions(data);
            else if (Array.isArray(data?.entities))
                setEntityOptions(data.entities);
        })
            .catch(() => { });
        return () => {
            active = false;
            controller.abort();
        };
    }, [query]);
    (0, react_1.useEffect)(() => {
        const params = new URLSearchParams();
        if (query)
            params.set('entity', query);
        if (tags.length)
            params.set('tags', tags.join(','));
        if (confidence[0] !== 0 || confidence[1] !== 1)
            params.set('confidence', `${confidence[0]}-${confidence[1]}`);
        if (startDate)
            params.set('startDate', startDate.toISOString());
        if (endDate)
            params.set('endDate', endDate.toISOString());
        setSearchParams(params, { replace: true });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query, tags, confidence, startDate, endDate]);
    const resultsLink = (0, react_1.useMemo)(() => {
        const params = new URLSearchParams();
        if (query)
            params.set('entity', query);
        if (tags.length)
            params.set('tags', tags.join(','));
        if (confidence[0] !== 0 || confidence[1] !== 1)
            params.set('confidence', `${confidence[0]}-${confidence[1]}`);
        if (startDate)
            params.set('startDate', startDate.toISOString());
        if (endDate)
            params.set('endDate', endDate.toISOString());
        params.set('page', '1');
        return `/entities?${params.toString()}`;
    }, [query, tags, confidence, startDate, endDate]);
    return (<material_1.Paper elevation={3} sx={{ p: 2 }}>
      <material_1.Typography variant="h6" gutterBottom>
        Filter Entities
      </material_1.Typography>
      <material_1.Stack spacing={2}>
        <material_1.Autocomplete freeSolo options={entityOptions.map((o) => o.label)} inputValue={query} onInputChange={(_e, v) => setQuery(v)} renderInput={(params) => <material_1.TextField {...params} label="Entity"/>}/>
        <material_1.Autocomplete multiple options={tagOptions} value={tags} onChange={(_e, v) => setTags(v)} renderTags={(value, getTagProps) => value.map((option, index) => (<material_1.Chip variant="outlined" label={option} {...getTagProps({ index })}/>))} renderInput={(params) => <material_1.TextField {...params} label="Tags"/>}/>
        <material_1.Box>
          <material_1.Typography gutterBottom>Confidence Range</material_1.Typography>
          <material_1.Slider value={confidence} onChange={(_e, v) => setConfidence(v)} valueLabelDisplay="auto" min={0} max={1} step={0.01}/>
        </material_1.Box>
        <LocalizationProvider_1.default dateAdapter={AdapterDateFns_1.default}>
          <material_1.Stack direction="row" spacing={2}>
            <DatePicker_1.default label="Start Date" value={startDate} onChange={(date) => setStartDate(date)} 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    renderInput={(params) => <material_1.TextField {...params}/>}/>
            <DatePicker_1.default label="End Date" value={endDate} onChange={(date) => setEndDate(date)} 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    renderInput={(params) => <material_1.TextField {...params}/>}/>
          </material_1.Stack>
        </LocalizationProvider_1.default>
        <material_1.Box>
          <material_1.Button variant="contained" component={react_router_dom_1.Link} to={resultsLink}>
            View Results
          </material_1.Button>
        </material_1.Box>
      </material_1.Stack>
    </material_1.Paper>);
}
exports.default = EntityFilterPanel;
