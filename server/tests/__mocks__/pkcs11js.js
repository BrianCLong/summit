export default {
  PKCS11: jest.fn().mockImplementation(() => ({
    load: jest.fn(),
    C_Initialize: jest.fn(),
    C_Finalize: jest.fn(),
    C_GetInfo: jest.fn(),
    C_GetSlotList: jest.fn().mockReturnValue([]),
    C_GetSlotInfo: jest.fn(),
    C_OpenSession: jest.fn(),
    C_CloseSession: jest.fn(),
  })),
};
