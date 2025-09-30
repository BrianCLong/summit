import { Dialog, DialogTitle, DialogContent, TextField, List, ListItem, ListItemText, Chip, Stack, IconButton, Tooltip } from '@mui/material';
import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import { useEffect, useMemo, useState } from 'react';

let _open: (v?:boolean)=>void = ()=>{};
export function openSearchPanel(){ _open(true); }

function usePinned(){
  const [pinned, setPinned] = useState<string[]>(()=>{
    try { return JSON.parse(localStorage.getItem('search:pins')||'[]'); } catch { return []; }
  });
  useEffect(()=>{ localStorage.setItem('search:pins', JSON.stringify(pinned)); }, [pinned]);
  return { pinned, toggle: (id:string)=> setPinned(p => p.includes(id) ? p.filter(x=>x!==id) : [...p,id]) };
}

export default function SearchPanel(){
  const [open,setOpen]=useState(false); _open=setOpen;
  const [q,setQ]=useState(''); const [rows,setRows]=useState<any[]>([]);
  const [type,setType]=useState<string>(''); const [ticker,setTicker]=useState<string>(''); const [company,setCompany]=useState<string>('');
  const { pinned, toggle } = usePinned();

  const query = useMemo(()=>{
    const bits = [q];
    if (type) bits.push(`type:${type}`);
    if (ticker) bits.push(`ticker:${ticker}`);
    if (company) bits.push(`company:${company.replace(/\s+/g,'_')}`);
    return bits.filter(Boolean).join(' ').trim();
  }, [q,type,ticker,company]);

  useEffect(()=>{n    if(!query) return setRows([]);
    let a = new AbortController();
    fetch(`/v1/search?q=${encodeURIComponent(query)}`, {
      signal:a.signal, headers:{'x-roles':'Exec,Presenter','x-pinned': pinned.join(',')}
    }).then(r=>r.json()).then(d=>setRows(d.results||[])).catch(()=>{});
    return ()=>a.abort();
  },[query, pinned]);

  const types = ['email','calendar','crm','deck','timeline','intel','funding'];

  return (
    <Dialog open={open} onClose={()=>setOpen(false)} maxWidth="md" fullWidth>
      <DialogTitle>Search everything</DialogTitle>
      <DialogContent>
        <TextField autoFocus fullWidth placeholder="People, emails, decks, intel…" value={q} onChange={e=>setQ(e.target.value)} sx={{mb:1}}/>
        <Stack direction="row" spacing={1} sx={{mb:2}}>
          <Chip label={type || 'type:*'} onClick={()=>setType('')} />
          {types.map(t => (
            <Chip key={t} label={t} variant={t===type?'filled':'outlined'} onClick={()=>setType(t)}/>
          ))}
          <TextField size="small" placeholder="ticker: AAPL" value={ticker} onChange={e=>setTicker(e.target.value)} sx={{width:140}}/>
          <TextField size="small" placeholder="company: Acme" value={company} onChange={e=>setCompany(e.target.value)} sx={{width:220}}/>
        </Stack>
        <List dense>
          {rows.map(r=>{
            const id = `${r.type}:${r.id}`;
            const isPinned = pinned.includes(id);
            return (
              <ListItem key={id} secondaryAction={
                <Tooltip title={isPinned?"Unpin":"Pin"}>
                  <IconButton edge="end" onClick={()=>toggle(id)}>
                    {isPinned ? <PushPinIcon/> : <PushPinOutlinedIcon/>}
                  </IconButton>
                </Tooltip>
              } button component="a" href={r.url} target="_blank">
                <Chip size="small" label={r.type} sx={{mr:1}}/>
                <ListItemText primary={r.title} secondary={r.snippet} />
              </ListItem>
            );
          })}
        </List>
      </DialogContent>
    </Dialog>
  );
}