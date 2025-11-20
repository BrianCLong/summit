export declare function sha256Hex(buf: Buffer | string): string;
export declare function leafHash(step: any): string;
export declare function buildMerkle(leavesHex: string[]): {
    root: string;
    layers: string[][];
};
export declare function proofForLeaf(index: number, layers: string[][]): {
    dir: "L" | "R";
    hash: string;
}[];
export declare function verifyProof(leaf: string, path: {
    dir: 'L' | 'R';
    hash: string;
}[], root: string): boolean;
//# sourceMappingURL=merkle.d.ts.map