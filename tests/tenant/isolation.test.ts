it('cannot read other tenant resources', async () => {
  const a = await api('/events', { headers: { 'x-tenant-id': T1 } });
  const b = await api('/events', { headers: { 'x-tenant-id': T2 } });
  expect(a.body.items.find((x) => x.tenant_id === T2)).toBeUndefined();
});
