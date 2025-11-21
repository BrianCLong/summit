import React from 'react';

export interface LegendItem {
  label: string;
  color: string;
  symbol?: 'circle' | 'square' | 'line';
}

export interface LegendProps {
  items: LegendItem[];
  orientation?: 'horizontal' | 'vertical';
  position?: string;
  onItemClick?: (item: LegendItem, index: number) => void;
}

export function Legend({
  items,
  orientation = 'vertical',
  position,
  onItemClick,
}: LegendProps) {
  return (
    <div
      className="visualization-legend"
      style={{
        display: 'flex',
        flexDirection: orientation === 'vertical' ? 'column' : 'row',
        gap: '8px',
        padding: '12px',
        fontSize: '12px',
        position: position ? 'absolute' : 'relative',
        ...(position && parseLegendPosition(position)),
      }}
    >
      {items.map((item, index) => (
        <div
          key={index}
          className="legend-item"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: onItemClick ? 'pointer' : 'default',
          }}
          onClick={() => onItemClick?.(item, index)}
        >
          {renderSymbol(item.symbol || 'circle', item.color)}
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

function renderSymbol(symbol: string, color: string) {
  const style = {
    width: symbol === 'line' ? '20px' : '12px',
    height: symbol === 'line' ? '2px' : '12px',
    backgroundColor: color,
    borderRadius: symbol === 'circle' ? '50%' : '0',
  };

  return <div style={style} />;
}

function parseLegendPosition(position: string): React.CSSProperties {
  const positions: Record<string, React.CSSProperties> = {
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
