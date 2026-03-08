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
const client_1 = require("@apollo/client");
const material_1 = require("@mui/material");
const lab_1 = require("@mui/lab");
const audit_gql_1 = require("../../graphql/audit.gql");
const AuditTraceViewer = ({ investigationId, }) => {
    const [filters, setFilters] = (0, react_1.useState)({
        userId: '',
        entityType: '',
        from: '',
        to: '',
    });
    const { data, loading, error, refetch } = (0, client_1.useQuery)(audit_gql_1.GET_AUDIT_TRACE, {
        variables: { investigationId },
    });
    const handleChange = (e) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
    };
    const applyFilters = () => {
        const filter = {};
        if (filters.userId)
            filter.userId = filters.userId;
        if (filters.entityType)
            filter.entityType = filters.entityType;
        if (filters.from)
            filter.from = new Date(filters.from).toISOString();
        if (filters.to)
            filter.to = new Date(filters.to).toISOString();
        refetch({ investigationId, filter });
    };
    if (loading)
        return <div>Loading...</div>;
    if (error)
        return <div>Error loading audit trace</div>;
    return (<material_1.Box>
      <material_1.Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
        <material_1.TextField label="User ID" name="userId" value={filters.userId} onChange={handleChange} size="small"/>
        <material_1.TextField label="Entity Type" name="entityType" value={filters.entityType} onChange={handleChange} size="small"/>
        <material_1.TextField label="From" name="from" type="datetime-local" value={filters.from} onChange={handleChange} InputLabelProps={{ shrink: true }} size="small"/>
        <material_1.TextField label="To" name="to" type="datetime-local" value={filters.to} onChange={handleChange} InputLabelProps={{ shrink: true }} size="small"/>
        <material_1.Button variant="contained" onClick={applyFilters}>
          Apply
        </material_1.Button>
      </material_1.Box>
      <lab_1.Timeline>
        {data?.auditTrace.map((log) => (<lab_1.TimelineItem key={log.id}>
            <lab_1.TimelineSeparator>
              <lab_1.TimelineDot />
              <lab_1.TimelineConnector />
            </lab_1.TimelineSeparator>
            <lab_1.TimelineContent>
              <material_1.Tooltip title={log.action}>
                <material_1.Typography variant="body2">
                  {new Date(log.createdAt).toLocaleString()} -{' '}
                  {log.resourceType}
                </material_1.Typography>
              </material_1.Tooltip>
            </lab_1.TimelineContent>
          </lab_1.TimelineItem>))}
      </lab_1.Timeline>
    </material_1.Box>);
};
exports.default = AuditTraceViewer;
