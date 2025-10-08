import { jsx as _jsx } from "react/jsx-runtime";
export const Alert = ({ className = '', children }) => {
    return (_jsx("div", { className: `border-l-4 p-4 mb-4 ${className}`, role: "alert", children: children }));
};
export const AlertDescription = ({ children }) => {
    return _jsx("div", { className: "text-sm", children: children });
};
