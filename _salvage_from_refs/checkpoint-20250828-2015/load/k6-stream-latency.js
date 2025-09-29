import ws from 'k6/ws'; import { check } from 'k6';
export default function() {
  const url = 'ws://localhost:3001/graphql';
  const payload = JSON.stringify({ type:'connection_init' });
  ws.connect(url, {}, socket => {
    socket.on('open', () => {
      socket.send(payload);
      socket.send(JSON.stringify({ id:'1', type:'start', payload:{
        query:'subscription($caseId:ID!){ alertStream(caseId:$caseId){ id ts } }',
        variables:{ caseId: 'c1' }
      }}));
      // server has dev endpoint to emit; this is a sample skeleton
    });
    socket.on('message', (d) => { check(d, { 'received': x => !!x }); socket.close(); });
  });
}
