import { jsxs as _jsxs } from "react/jsx-runtime";
export const SloHintBadge = ({ latencyMs, sloMs }) => {
    const isSlow = latencyMs > sloMs;
    const color = isSlow ? 'red' : 'green';
    return (_jsxs("span", { style: { color }, children: [latencyMs, "ms (SLO: ", sloMs, "ms)"] }));
};
