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
exports.VirtualizedListTable = VirtualizedListTable;
const react_1 = __importStar(require("react"));
const react_window_1 = require("react-window");
function RowRenderer({ index, style, data }) {
    const item = data.items[index];
    const rowId = data.getRowId?.(item, index) ?? index;
    return (<div role="row" tabIndex={0} data-row-index={index} style={{ ...style, display: 'grid', gridTemplateColumns: data.gridTemplate }} className="border-b border-gray-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 bg-white" aria-rowindex={index + 1} key={rowId}>
      {data.columns.map((column) => (<div role="cell" key={column.key} className="px-3 py-2 text-sm text-gray-900 truncate" style={{ minWidth: 0 }}>
          {column.render(item)}
        </div>))}
    </div>);
}
function VirtualizedListTable({ items, columns, height, rowHeight, virtualizationEnabled, overscan = 6, getRowId, ariaLabel, emptyMessage = 'No rows', }) {
    const gridTemplate = (0, react_1.useMemo)(() => columns.map((col) => col.width || '1fr').join(' '), [columns]);
    const itemData = (0, react_1.useMemo)(() => ({ items, columns, gridTemplate, getRowId }), [items, columns, gridTemplate, getRowId]);
    const renderStaticRows = (0, react_1.useCallback)(() => items.map((item, index) => {
        const rowId = getRowId?.(item, index) ?? index;
        return (<div role="row" tabIndex={0} data-row-index={index} key={rowId} style={{ display: 'grid', gridTemplateColumns: gridTemplate }} className="border-b border-gray-200 bg-white" aria-rowindex={index + 1}>
            {columns.map((column) => (<div role="cell" key={column.key} className="px-3 py-2 text-sm text-gray-900 truncate" style={{ minWidth: 0 }}>
                {column.render(item)}
              </div>))}
          </div>);
    }), [items, columns, gridTemplate, getRowId]);
    return (<div role="table" aria-label={ariaLabel} className="w-full border border-gray-200 rounded-md overflow-hidden">
      <div role="rowgroup" className="bg-gray-50 border-b border-gray-200">
        <div role="row" className="grid text-left text-xs font-semibold uppercase tracking-wide text-gray-600" style={{ gridTemplateColumns: gridTemplate }}>
          {columns.map((column) => (<div key={column.key} role="columnheader" className="px-3 py-2 whitespace-nowrap" style={{ minWidth: 0 }}>
              {column.label}
            </div>))}
        </div>
      </div>

      {items.length === 0 ? (<div className="p-3 text-sm text-gray-500" role="rowgroup">
          {emptyMessage}
        </div>) : virtualizationEnabled ? (<react_window_1.FixedSizeList height={height} itemCount={items.length} itemSize={rowHeight} itemData={itemData} overscanCount={overscan}>
          {RowRenderer}
        </react_window_1.FixedSizeList>) : (<div role="rowgroup">{renderStaticRows()}</div>)}
    </div>);
}
exports.default = VirtualizedListTable;
