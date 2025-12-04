import { simpleMovingAverage, exponentialSmoothing, linearTrendForecast } from '../forecasting';

describe('Forecasting', () => {
    const linearData = [1, 2, 3, 4, 5];
    const constantData = [10, 10, 10, 10, 10];

    it('calculates simple moving average', () => {
        const result = simpleMovingAverage(linearData, 3);
        // Window 3:
        // [1,2,3] -> 2
        // [2,3,4] -> 3
        // [3,4,5] -> 4
        expect(result).toEqual([2, 3, 4]);
    });

    it('calculates exponential smoothing', () => {
        const result = exponentialSmoothing(constantData, 0.5);
        // Should stay close to 10
        expect(result[result.length - 1]).toBeCloseTo(10);
    });

    it('projects linear trend', () => {
        const forecast = linearTrendForecast(linearData, 2);
        // Should be 6, 7
        expect(forecast[0]).toBeCloseTo(6);
        expect(forecast[1]).toBeCloseTo(7);
    });
});
