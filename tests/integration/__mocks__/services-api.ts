// Mock for services/api - returns consistent response format with status codes
const createClientMock = jest.fn(() => ({
  get: jest.fn(async (params?: any) => {
    // Default response for GET requests
    return { 
      status: 200, 
      data: { 
        message: 'success', 
        timestamp: new Date().toISOString(),
        method: 'GET',
        path: params?.path || '/default'
      } 
    };
  }),
  post: jest.fn(async (params?: any) => {
    // Default response for POST requests
    return { 
      status: 202, 
      data: { 
        message: 'accepted', 
        timestamp: new Date().toISOString(),
        method: 'POST',
        path: params?.path || '/default',
        body: params?.body || {}
      } 
    };
  }),
  put: jest.fn(async (params?: any) => {
    // Default response for PUT requests
    return { 
      status: 200, 
      data: { 
        message: 'updated', 
        timestamp: new Date().toISOString(),
        method: 'PUT',
        path: params?.path || '/default',
        body: params?.body || {}
      } 
    };
  }),
  delete: jest.fn(async (params?: any) => {
    // Default response for DELETE requests
    return { 
      status: 204, 
      data: { 
        message: 'deleted', 
        timestamp: new Date().toISOString(),
        method: 'DELETE',
        path: params?.path || '/default'
      } 
    };
  }),
}));

// For CommonJS compatibility
module.exports = { createClient: createClientMock };