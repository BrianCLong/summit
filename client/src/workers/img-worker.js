// Fetch -> blob -> createImageBitmap -> transfer back as blobURL
self.onmessage = async (e) => {
  const { url } = e.data || {};
  try {
    const res = await fetch(url, { credentials: 'include' });
    const blob = await res.blob();
    // CreateImageBitmap decodes off main thread
    const bmp = await createImageBitmap(blob);
    // Draw to OffscreenCanvas to re-encode and allow blobURL usage
    const canvas = new OffscreenCanvas(bmp.width, bmp.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bmp, 0, 0);
    const out = await canvas.convertToBlob({ type: 'image/png' });
    const buf = await out.arrayBuffer();
    // transfer as bytes; main thread can make Blob + objectURL
    postMessage({ ok: true, bytes: buf }, [buf]);
  } catch (err) {
    postMessage({ ok: false, error: String(err) });
  }
};