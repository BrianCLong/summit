import { buildWallet, disclose, verifyDisclosure } from '../src/wallet';
import { StepCommit } from '../src/types';
import { generateKeyPairSync } from 'crypto';

test('selective disclosure proofs verify', () => {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const steps: StepCommit[] = Array.from({length:5}, (_,i)=>({
    id:`s${i}`, tool:'graph.query', startedAt:new Date().toISOString(), endedAt:new Date().toISOString(),
    inputHash:'i'+i, outputHash:'o'+i, policyHash:'p'+i, modelHash:'m'+i
  }));
  const { manifest, steps: S, leaves } = buildWallet('run1','case1',steps, privateKey.export({type:'pkcs1',format:'pem'}).toString());
  const bundle = disclose(['s1','s3'], manifest, S, leaves);
  const ok = verifyDisclosure(bundle, publicKey.export({type:'pkcs1',format:'pem'}).toString());
  expect(ok).toBe(true);
});