"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signMessage = signMessage;
exports.verifyMessage = verifyMessage;
const crypto_1 = __importDefault(require("crypto"));
function signMessage(msg, privateKey) {
    const data = `${msg.message_id}:${msg.nonce}:${JSON.stringify(msg.payload)}`;
    const sign = crypto_1.default.createSign('SHA256');
    sign.update(data);
    sign.end();
    return sign.sign(privateKey, 'hex');
}
function verifyMessage(msg, publicKey) {
    if (!msg.signature)
        return false;
    const data = `${msg.message_id}:${msg.nonce}:${JSON.stringify(msg.payload)}`;
    const verify = crypto_1.default.createVerify('SHA256');
    verify.update(data);
    verify.end();
    return verify.verify(publicKey, msg.signature, 'hex');
}
