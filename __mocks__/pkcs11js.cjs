class PKCS11 {
  load() {}
  C_Initialize() {}
  C_GetSlotList() {
    return [];
  }
  C_GetSlotInfo() {
    return {};
  }
  C_GetTokenInfo() {
    return { flags: 0 };
  }
  C_GetMechanismList() {
    return [];
  }
  C_OpenSession() {
    return {};
  }
  C_CloseSession() {}
  C_Finalize() {}
  C_GenerateRandom() {
    return Buffer.alloc(0);
  }
  C_GenerateKey() {
    return {};
  }
  C_EncryptInit() {}
  C_EncryptUpdate() {
    return Buffer.alloc(0);
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

module.exports = {
  PKCS11,
  CKF_SERIAL_SESSION: 0x00000004,
  CKF_RW_SESSION: 0x00000002,
};
