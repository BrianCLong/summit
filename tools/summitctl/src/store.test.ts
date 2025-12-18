import { Store } from './store';
import fs from 'fs';
import { DateTime } from 'luxon';

jest.mock('fs');
jest.mock('luxon');

describe('Store', () => {
  let store: Store;
  const mockTasks = {
    tasks: [],
    velocity: {}
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockTasks));
    (fs.writeFileSync as jest.Mock).mockImplementation(() => {});
    store = new Store();
  });

  test('addTask adds a new task', () => {
    const mockDate = '2023-01-01T00:00:00.000Z';
    (DateTime.utc as any).mockReturnValue({
      toISO: () => mockDate
    });

    // We need to mock Store.load behavior because it reads file
    // But Store.load calls fs.readFileSync, which we mocked.
    // However, yaml parse on mocked string "{"tasks":[],"velocity":{}}" works if we use JSON.stringify?
    // Store uses YAML.parse. JSON is valid YAML.

    const task = store.addTask('New Task');
    expect(task.title).toBe('New Task');
    expect(task.status).toBe('active');
    expect(fs.writeFileSync).toHaveBeenCalled();
  });
});
