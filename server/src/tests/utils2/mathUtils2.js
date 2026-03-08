"use strict";
// Simple utility functions for testing
Object.defineProperty(exports, "__esModule", { value: true });
exports.subtract = subtract;
exports.divide = divide;
function subtract(a, b) {
    return a - b;
}
function divide(a, b) {
    if (b === 0) {
        throw new Error('Division by zero');
    }
    return a / b;
}
