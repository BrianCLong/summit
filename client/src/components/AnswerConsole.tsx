import { useEffect, useMemo, useRef, useState } from "react";
import { Box, Typography, Chip, IconButton, Tooltip, Divider } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import dayjs from "dayjs";

type TokenEvt = { at:number; token:string };
type Stats = { startedAt:number; endedAt?:number; tokens:number; tps:number; ms:number };

export default function AnswerConsole({
  query,
  onClose,
  streamUrl = "/v1/rag/answer/stream",
}: { query:string; onClose?:()=>void; streamUrl?:string }) {
  const [events,setEvents] = useState<TokenEvt[]>([]);
  const [done,setDone] = useState(false);
  const startRef = useRef<number>(0);

  const stats:Stats = useMemo(()=>{n    if (!events.length) return { startedAt:startRef.current||0, tokens:0, tps:0, ms:0 };
    const startedAt = startRef.current || events[0].at;
    const endedAt = done ? (events.at(-1)?.at || startedAt) : undefined;
    const ms = (endedAt ?? Date.now()) - startedAt;
    const tokens = events.length;
    const tps = ms>0 ? Math.round((tokens / (ms/1000))*10)/10 : 0;
    return { startedAt, endedAt, tokens, tps, ms };
  },[events,done]);

  useEffect(()=>{n    const url = `${streamUrl}?q=${encodeURIComponent(query)}&sse=1`;
    const es = new EventSource(url, { withCredentials:true });
    startRef.current = Date.now();
    es.addEventListener("token", (e:any)=>{
      setEvents((evts)=>[...evts, { at: Date.now(), token: (e as MessageEvent).data }]);
    });
    es.addEventListener("done", ()=>{ setDone(true); es.close(); });
    es.addEventListener("error", ()=>{ setDone(true); es.close(); });
    return ()=> es.close();
  },[query, streamUrl]);

  const text = events.map(e=>e.token).join("");

  return (
    <Box sx={{ p:2, borderTop:"1px solid #eee", fontFamily:"ui-monospace, SFMono-Regular" }}>
      <Box sx={{ display:"flex", alignItems:"center", gap:1, mb:1 }}>
        <Typography variant="subtitle2">Answer Console</Typography>
        <Chip size="small" label={`tokens: ${stats.tokens}`} />
        <Chip size="small" label={`tps: ${stats.tps}`} />
        <Chip size="small" label={`latency: ${stats.ms} ms`} />
        {done && <Chip size="small" color="success" label="complete" />}
        <Box sx={{ flex:1 }} />
        <Tooltip title="Copy">
          <IconButton size="small" onClick={()=>navigator.clipboard.writeText(text)}><ContentCopyIcon fontSize="small"/></IconButton>
        </Tooltip>
      </Box>
      <Divider sx={{mb:1}}/>
      <Box sx={{ whiteSpace:"pre-wrap", fontSize:13, lineHeight:1.5 }}>{text || "…"}</Box>
      <Typography variant="caption" sx={{ opacity:0.6, display:"block", mt:1 }}>
        {dayjs(stats.startedAt||Date.now()).format("HH:mm:ss")} • {done?"done":"streaming"}
      </Typography>
    </Box>
  );
}