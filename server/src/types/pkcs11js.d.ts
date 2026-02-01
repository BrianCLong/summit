declare module 'pkcs11js' {
    export class PKCS11 {
        load(path: string): void;
        C_Initialize(): void;
        C_Finalize(): void;
        C_GetSlotList(tokenPresent: boolean): Buffer[];
        C_GetSlotInfo(slot: Buffer): any;
        C_GetTokenInfo(slot: Buffer): any;
        C_GetMechanismList(slot: Buffer): number[];
        C_GetMechanismInfo(slot: Buffer, type: number): any;
        C_OpenSession(slot: Buffer, flags: number): Buffer;
        C_CloseSession(session: Buffer): void;
        C_GenerateRandom(session: Buffer, length: number): Buffer;
        C_GenerateKey(session: Buffer, mechanism: any, template: any[]): Buffer;
        C_EncryptInit(session: Buffer, mechanism: any, key: Buffer): void;
        C_EncryptUpdate(session: Buffer, data: Buffer): Buffer;
        C_EncryptFinal(session: Buffer): Buffer;
        C_DecryptInit(session: Buffer, mechanism: any, key: Buffer): void;
        C_DecryptUpdate(session: Buffer, data: Buffer): Buffer;
        C_DecryptFinal(session: Buffer): Buffer;
        C_SignInit(session: Buffer, mechanism: any, key: Buffer): void;
        C_Sign(session: Buffer, data: Buffer): Buffer;
        C_VerifyInit(session: Buffer, mechanism: any, key: Buffer): void;
        C_Verify(session: Buffer, data: Buffer, signature: Buffer): void;
        C_FindObjectsInit(session: Buffer, template: any[]): void;
        C_FindObjects(session: Buffer, maxObjectCount: number): Buffer[];
        C_FindObjectsFinal(session: Buffer): void;
        C_DigestInit(session: Buffer, mechanism: any): void;
        C_Digest(session: Buffer, data: Buffer): Buffer;
        C_DestroyObject(session: Buffer, handle: Buffer): void;
        close(): void;
    }

    export const CKF_SERIAL_SESSION: number;
    export const CKF_RW_SESSION: number;
    export const CKA_CLASS: number;
    export const CKA_KEY_TYPE: number;
    export const CKA_VALUE_LEN: number;
    export const CKA_ENCRYPT: number;
    export const CKA_DECRYPT: number;
    export const CKA_TOKEN: number;
    export const CKA_LABEL: number;
    export const CKO_SECRET_KEY: number;
    export const CKO_PRIVATE_KEY: number;
    export const CKK_AES: number;
    export const CKK_EC: number;
}
