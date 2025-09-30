import { useEffect, useState } from 'react';
import { Box, Card, CardHeader, CardContent, List, ListItem, ListItemText, Chip, Typography, LinearProgress, Stack } from '@mui/material';
import { fetchTimeline } from '../../lib/timeline/adapter';

function SentimentChip({ s }) {
  if (!s) return null;
  const color = s.label==='pos' ? 'success' : s.label==='neg' ? 'error' : 'default';
  const label = s.label.toUpperCase() + (s.score ? ` ${Math.round(s.score*100)/100}` : '');
  return <Chip size="small" color={color} label={label} />;
}

function Item({ ev }){
  const secondary = ev.kind.startsWith('email') ? ev.payload?.subject
                   : ev.kind==='meeting' ? `${ev.payload?.title} ${ev.payload?.start} → ${ev.payload?.end}`
                   : ev.kind==='call.transcript.chunk' ? ev.payload?.chunk?.text
                   : ev.kind==='slides.presented' ? `${ev.payload?.title} (${ev.payload?.slideCount})`
                   : ev.kind==='summary' ? ev.payload?.text
                   : JSON.stringify(ev.payload).slice(0,180);
  return (
    <ListItem alignItems="flex-start" dense>
      <ListItemText primary={<Stack direction="row" spacing={1}><Typography variant="body2">{ev.kind}</Typography><SentimentChip s={ev.sentiment} /></Stack>}
                    secondary={secondary} />
    </ListItem>
  );
}

export default function Timeline({ contactId }){
  const [state, setState] = useState({ loading:true, items:[] });
  useEffect(()=>{n    let on=true;
    setState({ loading:true, items:[] });
    (async ()=>{n      const data = await fetchTimeline(contactId, { limit:200 });
      if(on) setState({ loading:false, items:data.items||[] });
    })().catch(()=> setState({ loading:false, items:[] }));
    return ()=>{ on=false; };
  },[contactId]);

  return (
    <Card className="rounded-2xl">
      <CardHeader title="Activity Timeline" />
      <CardContent>
        {state.loading && <LinearProgress />}
        <List dense>
          {state.items.map(ev => <Item key={ev.id} ev={ev} />)}
        </List>
      </CardContent>
    </Card>
  );
}