import http from 'http';
import { evaluateOPA } from '../src/osint/opa';

describe('OPA denial', () => {
  test('returns allow=false with reason from OPA', async () => {
    const server = http.createServer((req, res) => {
      let body = '';
      req.on('data', (chunk)=> body += chunk);
      req.on('end', ()=>{
        res.setHeader('Content-Type','application/json');
        res.end(JSON.stringify({ result: { allow: false, reason: 'purpose not allowed' } }));
      });
    });
    await new Promise<void>(resolve => server.listen(0, resolve));
    const addr = server.address() as any; const port = addr.port;
    process.env.OPA_URL = `http://127.0.0.1:${port}`;
    const decision = await evaluateOPA('osint.query', { user: { id: 'u1' }, purpose: 'export' });
    expect(decision.allow).toBe(false);
    expect(decision.reason).toBe('purpose not allowed');
    server.close();
  });
});

