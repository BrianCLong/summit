"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
// Mock the db module
globals_1.jest.mock('../../db.js', () => ({
    db: {
        query: globals_1.jest.fn(),
    },
}));
const warRoomService_js_1 = require("../../collaboration/warRoomService.js");
const db_js_1 = require("../../db.js");
(0, globals_1.describe)('WarRoomService', () => {
    afterEach(() => {
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.describe)('createWarRoom', () => {
        (0, globals_1.it)('should create a new war room and return it', async () => {
            const mockWarRoom = { id: 1, name: 'Test War Room', created_by: 1 };
            db_js_1.db.query.mockResolvedValue({ rows: [mockWarRoom] });
            const newWarRoom = await warRoomService_js_1.warRoomService.createWarRoom('Test War Room', 1);
            (0, globals_1.expect)(db_js_1.db.query).toHaveBeenCalledWith('INSERT INTO war_rooms (name, created_by) VALUES ($1, $2) RETURNING *', ['Test War Room', 1]);
            (0, globals_1.expect)(newWarRoom).toEqual(mockWarRoom);
        });
    });
});
