"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dataloader_1 = __importDefault(require("dataloader"));
test('dataloader batches requests', async () => {
    let calls = 0;
    const loader = new dataloader_1.default(async (keys) => {
        calls++;
        return keys;
    });
    const tasks = Array.from({ length: 100 }, (_, i) => loader.load(String(i)));
    await Promise.all(tasks);
    expect(calls).toBe(1);
});
