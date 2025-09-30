export async function preloadImages(urls = []) {
  const tasks = urls.filter(Boolean).map(u => new Promise((resolve) => {
    const img = new Image();
    img.onload = async () => {
      if (img.decode) { try { await img.decode(); } catch {} }
      resolve(u);
    };
    img.onerror = () => resolve(u);
    img.src = u;
  }));
  await Promise.all(tasks);
}