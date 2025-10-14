import { replayWithSanctions } from '../src';
test('emits sanctions under stress', ()=>{
  const res = replayWithSanctions({ runId:'r1', steps:[{id:'a',tool:'web.fetch',tokens:4000,cost:0.008,start:0,end:1}], plan:{} }, { apiFailureRate:0.5, tokenCap:1000, policyStrict:true });
  expect(res.sanctions.length).toBeGreaterThan(0);
});