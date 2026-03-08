"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Select = Select;
exports.SelectTrigger = SelectTrigger;
exports.SelectValue = SelectValue;
exports.SelectContent = SelectContent;
exports.SelectItem = SelectItem;
const react_1 = __importDefault(require("react"));
const SelectContext = react_1.default.createContext({});
function Select({ value, onValueChange, children }) {
    return (<SelectContext.Provider value={{ value, onValueChange }}>
      <div>{children}</div>
    </SelectContext.Provider>);
}
function SelectTrigger({ children, className = '' }) {
    return <div className={className}>{children}</div>;
}
function SelectValue({ placeholder }) {
    const { value } = react_1.default.useContext(SelectContext);
    return <span>{value ?? placeholder ?? 'Select'}</span>;
}
function SelectContent({ children, className = '' }) {
    return <div className={className}>{children}</div>;
}
function SelectItem({ value, children, className = '' }) {
    const { onValueChange } = react_1.default.useContext(SelectContext);
    return (<button type="button" className={className} onClick={() => onValueChange?.(value)}>
      {children}
    </button>);
}
