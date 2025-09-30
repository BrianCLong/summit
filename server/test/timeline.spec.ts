import { upsertTimeline, listTimeline } from '../src/store/timeline';
test('upsert/list timeline', async ()=>{
  await upsertTimeline({ id:'t1', contactId:'demo:1', kind:'summary', ts:new Date().toISOString(), payload:{ of:'thread', refId:'x', text:'ok', bullets:[], actions:[] }, source:{system:'summarizer'}});n  const { items } = await listTimeline('demo:1', { limit:10 } as any) as any;
  expect(items.find(i=>i.id==='t1')).toBeTruthy();
});