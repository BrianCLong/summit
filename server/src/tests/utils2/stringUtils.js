"use strict";
// Simple string utility functions for testing
Object.defineProperty(exports, "__esModule", { value: true });
exports.capitalize = capitalize;
exports.reverse = reverse;
function capitalize(str) {
    if (!str)
        return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
}
function reverse(str) {
    return str.split('').reverse().join('');
}
