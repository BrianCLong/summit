import { StepCommit, WalletManifest, SelectiveDisclosureBundle } from './types';
export declare function signManifest(m: Omit<WalletManifest, 'signature'>, privatePem: string): WalletManifest;
export declare function verifyManifest(m: WalletManifest, publicPem: string): boolean;
export declare function buildWallet(runId: string, caseId: string, steps: StepCommit[], privatePem: string, signer?: string): {
    manifest: WalletManifest;
    steps: StepCommit[];
    leaves: string[];
};
export declare function disclose(selectIds: string[], manifest: WalletManifest, steps: StepCommit[], leaves: string[]): SelectiveDisclosureBundle;
export declare function verifyDisclosure(bundle: SelectiveDisclosureBundle, publicPem: string): boolean;
//# sourceMappingURL=wallet.d.ts.map