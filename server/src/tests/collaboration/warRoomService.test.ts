// @ts-nocheck
// Mock the db module
jest.mock('../../db', () => ({
  db: {
    query: jest.fn(),
  },
}));

import { warRoomService } from '../../collaboration/warRoomService';
import { db } from '../../db';

describe('WarRoomService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createWarRoom', () => {
    it('should create a new war room and return it', async () => {
      const mockWarRoom = { id: 1, name: 'Test War Room', created_by: 1 };
      (db.query as jest.Mock).mockResolvedValue({ rows: [mockWarRoom] });

      const newWarRoom = await warRoomService.createWarRoom('Test War Room', 1);

      expect(db.query).toHaveBeenCalledWith(
        'INSERT INTO war_rooms (name, created_by) VALUES ($1, $2) RETURNING *',
        ['Test War Room', 1]
      );
      expect(newWarRoom).toEqual(mockWarRoom);
    });
  });
});
