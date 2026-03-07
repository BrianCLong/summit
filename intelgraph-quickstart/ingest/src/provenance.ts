import SHA256 from "crypto-js/sha256";
export const hashRow = (row: any) => SHA256(JSON.stringify(row)).toString();
