import { useState } from 'react';
import { Box, Button, Card, CardContent, Chip, Divider, Stack, TextField, Typography } from '@mui/material';
import { useRagStream } from '../hooks/useRagStream';
import AnswerConsole from './AnswerConsole';

export default function RagAnswerPanel(){
  const [q, setQ] = useState('');
  const { answer, citations, running, start, stop } = useRagStream({
    'x-roles': 'Exec,Presenter',
    'x-user-id': 'me',
    'x-tenant': 'default'
  });

  return (
    <Card sx={{ maxWidth: 900 }}>
      <CardContent>
        <Typography variant="h6">Ask (RAG)</Typography>
        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
          <TextField fullWidth size="small" placeholder="Ask a question…" value={q} onChange={e=>setQ(e.target.value)}/>
          {running
            ? <Button color="warning" onClick={stop}>Stop</Button>
            : <Button variant="contained" onClick={()=>start(q)} disabled={!q.trim()}>Ask</Button>}
        </Stack>
        <Divider sx={{ my: 2 }}/>
        <Typography variant="subtitle2">Citations</Typography>
        <Stack direction="row" spacing={1} sx={{ my: 1, flexWrap:'wrap' }}>
          {citations.map((c:any)=><Chip key={c.id||c.n} size="small" label={`[${c.n}] ${c.id||''}`} />)}
        </Stack>
        <AnswerConsole query={q} />
      </CardContent>
    </Card>
  );
}