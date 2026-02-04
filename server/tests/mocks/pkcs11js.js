export class PKCS11 {
  load() {}
  C_Initialize() {}
  C_GetSlotList() {
    return [0];
  }
  C_GetSlotInfo() {
    return {};
  }
  C_GetTokenInfo() {
    return { flags: 0x00000002, label: 'MOCK' };
  }
  C_GetMechanismList() {
    return [];
  }
  C_OpenSession() {
    return {};
  }
  C_CloseSession() {}
  C_Finalize() {}
  C_GenerateRandom(_session, length) {
    return Buffer.alloc(length);
  }
  C_GenerateKey() {
    return {};
  }
  C_EncryptInit() {}
  C_EncryptUpdate(_session, data) {
    return Buffer.from(data);
  }
  C_EncryptFinal() {
    return Buffer.alloc(0);
  }
  C_DestroyObject() {}
  C_FindObjectsInit() {}
  C_FindObjects() {
    return [];
  }
  C_FindObjectsFinal() {}
  C_SignInit() {}
  C_Sign() {
    return Buffer.alloc(0);
  }
}

export const CKF_SERIAL_SESSION = 0x00000004;
export const CKF_RW_SESSION = 0x00000002;

export default {
  PKCS11,
  CKF_SERIAL_SESSION,
  CKF_RW_SESSION,
};
