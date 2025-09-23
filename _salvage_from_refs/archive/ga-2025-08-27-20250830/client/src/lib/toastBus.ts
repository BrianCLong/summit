import $ from 'jquery';

export function installToastBus() {
  const id = 'ig-toast-container';
  if (!document.getElementById(id)) {
    const d = document.createElement('div');
    d.id = id;
    d.style.position = 'fixed';
    d.style.bottom = '16px';
    d.style.right = '16px';
    d.style.zIndex = '9999';
    document.body.appendChild(d);
  }
  $(document).on('intelgraph:toast', (_e, msg: string) => {
    const el = document.createElement('div');
    el.className = 'shadow rounded-xl px-3 py-2 mb-2 bg-black text-white';
    el.style.opacity = '0.9';
    el.textContent = msg;
    document.getElementById('ig-toast-container')!.appendChild(el);
    setTimeout(() => el.remove(), 4000);
  });
}

