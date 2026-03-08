"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const forecasting_js_1 = require("../forecasting.js");
(0, globals_1.describe)('Forecasting', () => {
    const linearData = [1, 2, 3, 4, 5];
    const constantData = [10, 10, 10, 10, 10];
    (0, globals_1.it)('calculates simple moving average', () => {
        const result = (0, forecasting_js_1.simpleMovingAverage)(linearData, 3);
        // Window 3:
        // [1,2,3] -> 2
        // [2,3,4] -> 3
        // [3,4,5] -> 4
        (0, globals_1.expect)(result).toEqual([2, 3, 4]);
    });
    (0, globals_1.it)('calculates exponential smoothing', () => {
        const result = (0, forecasting_js_1.exponentialSmoothing)(constantData, 0.5);
        // Should stay close to 10
        (0, globals_1.expect)(result[result.length - 1]).toBeCloseTo(10);
    });
    (0, globals_1.it)('projects linear trend', () => {
        const forecast = (0, forecasting_js_1.linearTrendForecast)(linearData, 2);
        // Should be 6, 7
        (0, globals_1.expect)(forecast[0]).toBeCloseTo(6);
        (0, globals_1.expect)(forecast[1]).toBeCloseTo(7);
    });
});
