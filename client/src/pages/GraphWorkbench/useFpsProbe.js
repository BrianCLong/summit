"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useFpsProbe = useFpsProbe;
const react_1 = require("react");
function useFpsProbe(enabled = import.meta.env.DEV) {
    const lastFrameRef = (0, react_1.useRef)(performance.now());
    const [fps, setFps] = (0, react_1.useState)(0);
    const [fpsHistory, setFpsHistory] = (0, react_1.useState)([]);
    const rafRef = (0, react_1.useRef)(0);
    (0, react_1.useEffect)(() => {
        if (!enabled)
            return;
        const loop = (timestamp) => {
            const delta = timestamp - lastFrameRef.current;
            lastFrameRef.current = timestamp;
            const currentFps = 1000 / delta;
            setFps(Math.round(currentFps));
            // Keep rolling history of 60 samples
            setFpsHistory((prev) => {
                const newHistory = [...prev, currentFps].slice(-60);
                return newHistory;
            });
            rafRef.current = requestAnimationFrame(loop);
        };
        rafRef.current = requestAnimationFrame(loop);
        return () => {
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
            }
        };
    }, [enabled]);
    const averageFps = fpsHistory.length > 0
        ? Math.round(fpsHistory.reduce((a, b) => a + b, 0) / fpsHistory.length)
        : 0;
    const minFps = fpsHistory.length > 0 ? Math.round(Math.min(...fpsHistory)) : 0;
    return {
        current: fps,
        average: averageFps,
        minimum: minFps,
        samples: fpsHistory.length,
        isHealthy: averageFps >= 55, // Target 55+ FPS average
    };
}
