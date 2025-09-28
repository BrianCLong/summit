import { createHash, createSign, createVerify } from 'crypto';

export function hash(content: string) { return createHash('sha256').update(content).digest('hex'); }

export function sign(assertionHash:string, epoch:number, subjectToken:string, privatePem:string, signer='aer @intelgraph'){
  const s = createSign('RSA-SHA256'); s.update(`${assertionHash}.${epoch}.${subjectToken}`);
  return { signer, signature: s.sign(privatePem, 'base64'), algo:'RSA-SHA256' as const };
}

export function verify(aer:{assertionHash:string; epoch:number; subjectToken:string; signer:string; signature:string; algo:string}, publicPem:string){
  const v = createVerify('RSA-SHA256'); v.update(`${aer.assertionHash}.${aer.epoch}.${aer.subjectToken}`);
  return v.verify(publicPem, Buffer.from(aer.signature,'base64'));
}