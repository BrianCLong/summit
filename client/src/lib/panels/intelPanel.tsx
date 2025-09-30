import { Dialog, DialogTitle, DialogContent, TextField, List, ListItem, ListItemText } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';

let _open: (v?:boolean)=>void = ()=>{};
export function openIntelPanel(){ _open(true); }

export default function IntelPanel(){
  const [open,setOpen]=useState(false); _open=setOpen;
  const [q,setQ]=useState(''); const [items,setItems]=useState<any[]>([]);

  useEffect(()=>{n    let abort = new AbortController();
    fetch(`/v1/intel?q=${encodeURIComponent(q)}`,{signal:abort.signal})
      .then(r=>r.json()).then(d=>setItems(d.items||[])).catch(()=>{});
    return ()=>abort.abort();
  },[q]);

  return (
    <Dialog open={open} onClose={()=>setOpen(false)} maxWidth="md" fullWidth>
      <DialogTitle>Market Intelligence</DialogTitle>
      <DialogContent>
        <TextField autoFocus fullWidth placeholder="Search competitors, tickers, topics…" value={q} onChange={e=>setQ(e.target.value)} sx={{mb:2}}/>
        <List dense>
          {items.map(i=>(
            <ListItem key={i.id} button component="a" href={i.url} target="_blank">
              <ListItemText primary={`${i.title} ${i.ticker?`• ${i.ticker}`:''}`} secondary={`${i.source} • ${i.company??''} • s=${i.sentiment??'–'}`} />
            </ListItem>
          ))}
        </List>
      </DialogContent>
    </Dialog>
  );
}