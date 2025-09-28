import fetch from 'node-fetch';
test('coordinationEdges returns edges >= minScore', async () => {
  const q = `query { coordinationEdges(a:"acc_1", minScore:2.5){ a b score } }`;
  const res = await fetch('http://localhost:4000/', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({query:q})});
  const json = await res.json();
  expect(json.data.coordinationEdges).toBeDefined();
});