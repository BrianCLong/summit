import fc from 'fast-check';
import { forbidDangerous } from '../../services/nlq-copilot/src/guard';

test('dangerous patterns always blocked', ()=>{
  const banned = [/DETACH\s+DELETE/i, /apoc\.periodic/i, /CALL\s+db\.msql/i];
  fc.assert(fc.property(fc.string(), (s)=>{
    const hit = banned.some(rx=>rx.test(s));
    try{ forbidDangerous(s); return !hit; } catch{ return hit; }
  }));
});
