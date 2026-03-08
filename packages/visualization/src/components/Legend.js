"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Legend = Legend;
const react_1 = __importDefault(require("react"));
function Legend({ items, orientation = 'vertical', position, onItemClick, }) {
    return (<div className="visualization-legend" style={{
            display: 'flex',
            flexDirection: orientation === 'vertical' ? 'column' : 'row',
            gap: '8px',
            padding: '12px',
            fontSize: '12px',
            position: position ? 'absolute' : 'relative',
            ...(position && parseLegendPosition(position)),
        }}>
      {items.map((item, index) => (<div key={index} className="legend-item" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: onItemClick ? 'pointer' : 'default',
            }} onClick={() => onItemClick?.(item, index)}>
          {renderSymbol(item.symbol || 'circle', item.color)}
          <span>{item.label}</span>
        </div>))}
    </div>);
}
function renderSymbol(symbol, color) {
    const style = {
        width: symbol === 'line' ? '20px' : '12px',
        height: symbol === 'line' ? '2px' : '12px',
        backgroundColor: color,
        borderRadius: symbol === 'circle' ? '50%' : '0',
    };
    return <div style={style}/>;
}
function parseLegendPosition(position) {
    const positions = {
        'top': { top: '10px', left: '50%', transform: 'translateX(-50%)' },
        'right': { top: '50%', right: '10px', transform: 'translateY(-50%)' },
        'bottom': { bottom: '10px', left: '50%', transform: 'translateX(-50%)' },
        'left': { top: '50%', left: '10px', transform: 'translateY(-50%)' },
        'top-right': { top: '10px', right: '10px' },
        'top-left': { top: '10px', left: '10px' },
        'bottom-right': { bottom: '10px', right: '10px' },
        'bottom-left': { bottom: '10px', left: '10px' },
    };
    return positions[position] || {};
}
