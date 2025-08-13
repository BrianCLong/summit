import React, { useRef, useState, useEffect } from 'react';
import { Box, Paper, Toolbar, Typography, TextField, Button, Grid, Card, CardContent, LinearProgress } from '@mui/material';
import { VisionAPI } from '../../services/api';

export default function VisionPanel() {
  const [imageUrl, setImageUrl] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const imgRef = useRef(null);
  const [imgDims, setImgDims] = useState({ w: 0, h: 0 });

  const toBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const analyze = async () => {
    setLoading(true);
    setResult(null);
    try {
      let payload = {};
      if (file) payload.imageBase64 = await toBase64(file);
      if (imageUrl) payload.imageUrl = imageUrl;
      const res = await VisionAPI.analyze(payload);
      setResult(res);
    } catch (e) {
      setResult({ error: e.message });
    }
    setLoading(false);
  };

  useEffect(() => {
    const el = imgRef.current;
    if (!el) return;
    const onLoad = () => setImgDims({ w: el.clientWidth, h: el.clientHeight });
    el.addEventListener('load', onLoad);
    const ro = new ResizeObserver(() => setImgDims({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => { el.removeEventListener('load', onLoad); ro.disconnect(); };
  }, [imageUrl, file]);

  return (
    <Box>
      <Toolbar sx={{ pl: 0 }}>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>Vision Analysis</Typography>
      </Toolbar>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField fullWidth label="Image URL" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />
            <Box sx={{ mt: 2 }}>
              <Button variant="outlined" component="label">
                Upload File
                <input hidden type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              </Button>
              <Typography variant="caption" sx={{ ml: 2 }}>{file ? file.name : 'No file selected'}</Typography>
            </Box>
            <Box sx={{ mt: 2 }}>
              <Button variant="contained" onClick={analyze} disabled={loading || (!imageUrl && !file)}>Analyze</Button>
            </Box>
            {loading && <Box sx={{ mt: 2 }}><LinearProgress /></Box>}
          </Grid>
          <Grid item xs={12} md={6}>
            <Box sx={{ position: 'relative', minHeight: 240, border: '1px solid #eee', borderRadius: 1, p: 1 }}>
              {(imageUrl || file) && (
                <img ref={imgRef} alt="preview" src={file ? URL.createObjectURL(file) : imageUrl} style={{ maxWidth: '100%', maxHeight: 360, display: 'block' }} />
              )}
              {result?.boxes && imgDims.w > 0 && imgDims.h > 0 && result.boxes.map((b, i) => (
                <Box key={i} sx={{ position: 'absolute', border: '2px solid #f44336', pointerEvents: 'none', left: `${b.x * imgDims.w}px`, top: `${b.y * imgDims.h}px`, width: `${b.w * imgDims.w}px`, height: `${b.h * imgDims.h}px` }}>
                  <Box sx={{ position: 'absolute', top: -18, left: 0, background: 'rgba(244,67,54,0.9)', color: '#fff', fontSize: 10, px: 0.5, borderRadius: '2px' }}>{b.label} {Math.round((b.confidence||0)*100)}%</Box>
                </Box>
              ))}
            </Box>
            {result && (
              <Box sx={{ mt: 2 }}>
                {result.error && <Typography color="error">{result.error}</Typography>}
                {result.objects && (
                  <Card sx={{ mb: 2 }}>
                    <CardContent>
                      <Typography variant="subtitle1">Detected Objects</Typography>
                      {result.objects.map((o, i) => (
                        <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, my: 0.5 }}>
                          <Typography sx={{ width: 120 }}>{o.label}</Typography>
                          <LinearProgress variant="determinate" value={Math.round((o.confidence || 0) * 100)} sx={{ flex: 1 }} />
                          <Typography sx={{ width: 48, textAlign: 'right' }}>{Math.round((o.confidence || 0) * 100)}%</Typography>
                        </Box>
                      ))}
                    </CardContent>
                  </Card>
                )}
                {result.emotions && (
                  <Card>
                    <CardContent>
                      <Typography variant="subtitle1">Microexpressions</Typography>
                      {Object.entries(result.emotions).map(([k,v]) => (
                        <Box key={k} sx={{ display: 'flex', alignItems: 'center', gap: 1, my: 0.5 }}>
                          <Typography sx={{ width: 120 }}>{k}</Typography>
                          <LinearProgress variant="determinate" value={Math.round((v || 0) * 100)} sx={{ flex: 1 }} />
                          <Typography sx={{ width: 48, textAlign: 'right' }}>{Math.round((v || 0) * 100)}%</Typography>
                        </Box>
                      ))}
                      {result.dominant && <Typography variant="body2" sx={{ mt: 1 }}>Dominant: <b>{result.dominant}</b></Typography>}
                    </CardContent>
                  </Card>
                )}
              </Box>
            )}
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
}
