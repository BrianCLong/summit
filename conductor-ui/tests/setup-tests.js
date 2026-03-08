"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("@testing-library/jest-dom");
require("jest-canvas-mock");
global.fetch = jest.fn(() => Promise.resolve({
    text: () => Promise.resolve('ok'),
    json: () => Promise.resolve({}),
}));
