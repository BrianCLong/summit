"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const index_js_1 = require("./index.js");
jest.mock('axios');
const mockedPost = axios_1.default.post;
describe('getSecret', () => {
    it('requests secret token', async () => {
        mockedPost.mockResolvedValueOnce({ data: { token: 'abc' } });
        const result = await (0, index_js_1.getSecret)({ path: 'db/creds' });
        expect(mockedPost).toHaveBeenCalledWith('/secrets/get', {
            path: 'db/creds',
        });
        expect(result).toEqual({ token: 'abc' });
    });
});
