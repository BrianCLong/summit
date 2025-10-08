import { jsx as _jsx } from "react/jsx-runtime";
export const OpaDecisionBadge = ({ decision }) => {
    const style = {
        padding: '4px 8px',
        borderRadius: '12px',
        color: 'white',
        backgroundColor: decision.allow ? 'green' : 'red',
    };
    return (_jsx("span", { style: style, title: decision.reason || (decision.allow ? 'Allowed' : 'Denied'), children: decision.allow ? 'Allowed' : 'Denied' }));
};
