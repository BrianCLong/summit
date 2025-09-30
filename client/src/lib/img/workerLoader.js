let worker;
export async function decodeInWorker(url) {
  worker ||= new Worker(new URL('../../workers/img-worker.js', import.meta.url), { type: 'module' });
  return new Promise((resolve) => {
    const onMsg = (e) => {
      const { ok, bytes, error } = e.data || {};
      worker.removeEventListener('message', onMsg);
      if (!ok || !bytes) return resolve(null);
      const blob = new Blob([bytes], { type: 'image/png' });
      resolve(URL.createObjectURL(blob));
    };
    worker.addEventListener('message', onMsg);
    worker.postMessage({ url });
  });
}