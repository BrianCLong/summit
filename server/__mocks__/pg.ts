export const mockQuery = jest.fn();
export const mockRelease = jest.fn();
export const mockConnect = jest.fn();
export const mockEnd = jest.fn();

const mockClient = {
  query: mockQuery,
  release: mockRelease,
};

mockConnect.mockResolvedValue(mockClient);

export class Pool {
  connect = mockConnect;
  end = mockEnd;
  on = jest.fn();
}

// For default export compatibility
export default { Pool };
