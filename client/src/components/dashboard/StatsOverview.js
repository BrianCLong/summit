"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = StatsOverview;
const react_1 = __importDefault(require("react"));
const material_1 = require("@mui/material");
const graphql_1 = require("../../generated/graphql");
function StatsOverview() {
    const { data, loading, error } = (0, graphql_1.useDB_ServerStatsQuery)({
        fetchPolicy: 'cache-and-network',
    });
    const stats = data?.serverStats;
    const renderValue = (value) => loading ? (<material_1.Skeleton width={60} data-testid="skeleton"/>) : (<material_1.Typography variant="h5">{value}</material_1.Typography>);
    return (<material_1.Stack direction="row" spacing={6} role="group" aria-label="Overview stats">
      <div>
        <material_1.Typography variant="subtitle2" color="text.secondary">
          Total Entities
        </material_1.Typography>
        {renderValue((stats?.totalEntities ?? 0).toLocaleString())}
      </div>
      <div>
        <material_1.Typography variant="subtitle2" color="text.secondary">
          Total Relationships
        </material_1.Typography>
        {renderValue((stats?.totalRelationships ?? 0).toLocaleString())}
      </div>
      <div>
        <material_1.Typography variant="subtitle2" color="text.secondary">
          Investigations
        </material_1.Typography>
        {renderValue((stats?.totalInvestigations ?? 0).toLocaleString())}
      </div>
      <div>
        <material_1.Typography variant="subtitle2" color="text.secondary">
          Uptime
        </material_1.Typography>
        {renderValue(stats?.uptime || 'n/a')}
      </div>
      {error && (<material_1.Typography variant="caption" color="error">
          {error.message}
        </material_1.Typography>)}
    </material_1.Stack>);
}
