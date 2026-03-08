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
exports.RadioGroupItem = exports.RadioGroup = void 0;
const React = __importStar(require("react"));
const utils_1 = require("@/lib/utils");
const RadioGroupContext = React.createContext({});
exports.RadioGroup = React.forwardRef(({ className, value, onValueChange, name, children, ...props }, ref) => {
    return (<RadioGroupContext.Provider value={{ value, onValueChange, name }}>
        <div ref={ref} role="radiogroup" className={(0, utils_1.cn)('grid gap-2', className)} {...props}>
          {children}
        </div>
      </RadioGroupContext.Provider>);
});
exports.RadioGroup.displayName = 'RadioGroup';
exports.RadioGroupItem = React.forwardRef(({ className, value, id, ...props }, ref) => {
    const context = React.useContext(RadioGroupContext);
    const isChecked = context.value === value;
    return (<input ref={ref} type="radio" id={id} name={context.name} value={value} checked={isChecked} onChange={() => context.onValueChange?.(value)} className={(0, utils_1.cn)('h-4 w-4 rounded-full border border-primary text-primary ring-offset-background', 'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2', 'disabled:cursor-not-allowed disabled:opacity-50', className)} {...props}/>);
});
exports.RadioGroupItem.displayName = 'RadioGroupItem';
