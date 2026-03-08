"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const store_1 = require("./store");
const fs_1 = __importDefault(require("fs"));
const luxon_1 = require("luxon");
jest.mock('fs');
jest.mock('luxon');
describe('Store', () => {
    let store;
    const mockTasks = {
        tasks: [],
        velocity: {}
    };
    beforeEach(() => {
        jest.clearAllMocks();
        fs_1.default.existsSync.mockReturnValue(true);
        fs_1.default.readFileSync.mockReturnValue(JSON.stringify(mockTasks));
        fs_1.default.writeFileSync.mockImplementation(() => { });
        store = new store_1.Store();
    });
    test('addTask adds a new task', () => {
        const mockDate = '2023-01-01T00:00:00.000Z';
        luxon_1.DateTime.utc.mockReturnValue({
            toISO: () => mockDate
        });
        // We need to mock Store.load behavior because it reads file
        // But Store.load calls fs.readFileSync, which we mocked.
        // However, yaml parse on mocked string "{"tasks":[],"velocity":{}}" works if we use JSON.stringify?
        // Store uses YAML.parse. JSON is valid YAML.
        const task = store.addTask('New Task');
        expect(task.title).toBe('New Task');
        expect(task.status).toBe('active');
        expect(fs_1.default.writeFileSync).toHaveBeenCalled();
    });
});
