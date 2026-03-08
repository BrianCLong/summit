"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const golden = fs_1.default.readFileSync(path_1.default.join(__dirname, '..', 'auth.golden.graphql'), 'utf8');
test('auth golden has login and me', () => {
    expect(golden).toContain('login');
    expect(golden).toContain('me: TokenInfo!');
});
