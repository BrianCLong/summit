"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const material_1 = require("@mui/material");
const react_router_dom_1 = require("react-router-dom");
const RelationshipMatrix = ({ data }) => {
    const navigate = (0, react_router_dom_1.useNavigate)();
    const types = Array.from(new Set(data.flatMap((d) => [d.fromType, d.toType]))).sort();
    const maxCount = Math.max(...data.map((d) => d.count), 1);
    const getCount = (from, to) => {
        return data.find((d) => d.fromType === from && d.toType === to)?.count || 0;
    };
    const handleCellClick = (from, to) => {
        navigate(`/relationships?fromType=${from}&toType=${to}`);
    };
    return (<material_1.Box sx={{
            display: 'grid',
            gridTemplateColumns: `100px repeat(${types.length}, 1fr)`,
            gridAutoRows: 40,
            gap: 1,
        }}>
      <material_1.Box />
      {types.map((type) => (<material_1.Box key={`col-${type}`} sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 500,
            }}>
          {type}
        </material_1.Box>))}
      {types.map((row) => (<react_1.default.Fragment key={row}>
          <material_1.Box sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                pr: 1,
                fontWeight: 500,
            }}>
            {row}
          </material_1.Box>
          {types.map((col) => {
                const count = getCount(row, col);
                const intensity = count / maxCount;
                const backgroundColor = `rgba(25, 118, 210, ${intensity})`;
                return (<material_1.Tooltip key={`${row}-${col}`} title={`${count} relationships between ${row} and ${col}`}>
                <material_1.Box onClick={() => handleCellClick(row, col)} sx={{
                        backgroundColor,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: intensity > 0.6 ? 'common.white' : 'text.primary',
                        borderRadius: 1,
                    }}>
                  <material_1.Typography variant="caption">{count}</material_1.Typography>
                </material_1.Box>
              </material_1.Tooltip>);
            })}
        </react_1.default.Fragment>))}
    </material_1.Box>);
};
exports.default = RelationshipMatrix;
