import React, { useRef, useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Toolbar,
  Typography,
  TextField,
  Button,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  FormControlLabel,
  Switch,
  Select,
  MenuItem,
} from '@mui/material';
import { VisionAPI } from '../../services/api';

export default function VisionPanel() {
  const [imageUrl, setImageUrl] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const imgRef = useRef(null);
  const [imgDims, setImgDims] = useState({ w: 0, h: 0 });
  const [showObjects, setShowObjects] = useState(true);
  const [showEmotions, setShowEmotions] = useState(true);
  const [boxScheme, setBoxScheme] = useState('red'); // red, green, blue

  const toBase64 = (file) =>
    new Promise((resolve, reject) => {
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

  const schemeColor = (scheme) => {
    switch (scheme) {
      case 'green':
        return '#2e7d32';
      case 'blue':
        return '#1976d2';
      default:
        return '#f44336';
    }
  };

  const downloadJSON = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vision-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const el = imgRef.current;
    if (!el) return;
    const onLoad = () => setImgDims({ w: el.clientWidth, h: el.clientHeight });
    el.addEventListener('load', onLoad);
    const ro = new ResizeObserver(() => setImgDims({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => {
      el.removeEventListener('load', onLoad);
      ro.disconnect();
    };
  }, [imageUrl, file]);

  return (
    <Box>
      <Toolbar sx={{ pl: 0 }}>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Vision Analysis
        </Typography>
      </Toolbar>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Image URL"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://..."
            />
            <Box sx={{ mt: 2 }}>
              <Button variant="outlined" component="label">
                Upload File
                <input
                  hidden
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </Button>
              <Typography variant="caption" sx={{ ml: 2 }}>
                {file ? file.name : 'No file selected'}
              </Typography>
            </Box>
            <Box sx={{ mt: 2 }}>
              <Button
                variant="contained"
                onClick={analyze}
                disabled={loading || (!imageUrl && !file)}
                sx={{ mr: 1 }}
              >
                Analyze
              </Button>
              <Button variant="outlined" onClick={downloadJSON} disabled={!result}>
                Download JSON
              </Button>
            </Box>
            {loading && (
              <Box sx={{ mt: 2 }}>
                <LinearProgress />
              </Box>
            )}
            <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={showObjects}
                    onChange={(e) => setShowObjects(e.target.checked)}
                  />
                }
                label="Objects"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={showEmotions}
                    onChange={(e) => setShowEmotions(e.target.checked)}
                  />
                }
                label="Microexpressions"
              />
              <Select size="small" value={boxScheme} onChange={(e) => setBoxScheme(e.target.value)}>
                <MenuItem value="red">Red</MenuItem>
                <MenuItem value="green">Green</MenuItem>
                <MenuItem value="blue">Blue</MenuItem>
              </Select>
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box
              sx={{
                position: 'relative',
                minHeight: 240,
                border: '1px solid #eee',
                borderRadius: 1,
                p: 1,
              }}
            >
              {(imageUrl || file) && (
                <img
                  ref={imgRef}
                  alt="preview"
                  src={file ? URL.createObjectURL(file) : imageUrl}
                  style={{ maxWidth: '100%', maxHeight: 360, display: 'block' }}
                />
              )}
              {showObjects &&
                result?.boxes &&
                imgDims.w > 0 &&
                imgDims.h > 0 &&
                result.boxes.map((b, i) => (
                  <Box
                    key={i}
                    sx={{
                      position: 'absolute',
                      border: `2px solid ${schemeColor(boxScheme)}`,
                      pointerEvents: 'none',
                      left: `${b.x * imgDims.w}px`,
                      top: `${b.y * imgDims.h}px`,
                      width: `${b.w * imgDims.w}px`,
                      height: `${b.h * imgDims.h}px`,
                    }}
                  >
                    <Box
                      sx={{
                        position: 'absolute',
                        top: -18,
                        left: 0,
                        background: schemeColor(boxScheme),
                        color: '#fff',
                        fontSize: 10,
                        px: 0.5,
                        borderRadius: '2px',
                      }}
                    >
                      {b.label} {Math.round((b.confidence || 0) * 100)}%
                    </Box>
                  </Box>
                ))}
            </Box>
            {result && (
              <Box sx={{ mt: 2 }}>
                {result.error && <Typography color="error">{result.error}</Typography>}
                {showObjects && result.objects && (
                  <Card sx={{ mb: 2 }}>
                    <CardContent>
                      <Typography variant="subtitle1">Detected Objects</Typography>
                      {result.objects.map((o, i) => (
                        <Box
                          key={i}
                          sx={{ display: 'flex', alignItems: 'center', gap: 1, my: 0.5 }}
                        >
                          <Typography sx={{ width: 120 }}>{o.label}</Typography>
                          <LinearProgress
                            variant="determinate"
                            value={Math.round((o.confidence || 0) * 100)}
                            sx={{ flex: 1 }}
                          />
                          <Typography sx={{ width: 48, textAlign: 'right' }}>
                            {Math.round((o.confidence || 0) * 100)}%
                          </Typography>
                        </Box>
                      ))}
                    </CardContent>
                  </Card>
                )}
                {showEmotions && result.emotions && (
                  <Card>
                    <CardContent>
                      <Typography variant="subtitle1">Microexpressions</Typography>
                      {Object.entries(result.emotions).map(([k, v]) => (
                        <Box
                          key={k}
                          sx={{ display: 'flex', alignItems: 'center', gap: 1, my: 0.5 }}
                        >
                          <Typography sx={{ width: 120 }}>{k}</Typography>
                          <LinearProgress
                            variant="determinate"
                            value={Math.round((v || 0) * 100)}
                            sx={{ flex: 1 }}
                          />
                          <Typography sx={{ width: 48, textAlign: 'right' }}>
                            {Math.round((v || 0) * 100)}%
                          </Typography>
                        </Box>
                      ))}
                      {result.dominant && (
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          Dominant: <b>{result.dominant}</b>
                        </Typography>
                      )}
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
