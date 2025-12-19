declare module 'pkcs11js' {
    export class PKCS11 {
        load(path: string): void;
        C_Initialize(): void;
        C_Finalize(): void;
        C_GetSlotList(tokenPresent: boolean): Buffer[];
        C_GetTokenInfo(slot: Buffer): any;
        C_OpenSession(slot: Buffer, flags: number): Buffer;
        C_Login(session: Buffer, userType: number, pin: string): void;
        C_FindObjectsInit(session: Buffer, template: any[]): void;
        C_FindObjects(session: Buffer, maxObjectCount: number): Buffer[];
        C_FindObjectsFinal(session: Buffer): void;
        C_DigestInit(session: Buffer, mechanism: any): void;
        C_Digest(session: Buffer, data: Buffer, output: Buffer): Buffer;
        C_SignInit(session: Buffer, mechanism: any, key: Buffer): void;
        C_Sign(session: Buffer, data: Buffer, output: Buffer): Buffer;
        C_CloseSession(session: Buffer): void;
        close(): void;
    }
}
