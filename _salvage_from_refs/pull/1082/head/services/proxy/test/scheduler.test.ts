import { isWindowOpen, pickModel } from '../src/router/scheduler';
import { DateTime } from 'luxon';

test('window open/closed', () => {
  const w = [{ start: '09:00', end: '17:00', days: [1,2,3,4,5] }];
  expect(isWindowOpen(w, DateTime.fromISO('2025-08-29T10:00:00'))).toBe(true);
  expect(isWindowOpen(w, DateTime.fromISO('2025-08-30T10:00:00'))).toBe(false); // Saturday
});

test('pick prefers open model', () => {
  const c = [
    { name:'A', class:'hosted', rpm_cap:1, tpm_cap:1, usage_windows:[{start:'00:00',end:'00:01'}], counters:{rpm:0,tpm:0,usd_today:0,window_open:false} },
    { name:'B', class:'local', rpm_cap:100, tpm_cap:1_000_000, counters:{rpm:0,tpm:0,usd_today:0,window_open:true} }
  ];
  const { chosen } = pickModel(c as any, ['A','B']);
  expect(chosen!.name).toBe('B');
});
