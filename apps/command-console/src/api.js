const DEFAULT_HEADERS = {};
if (import.meta.env.VITE_COMMAND_CONSOLE_TOKEN) {
    DEFAULT_HEADERS['x-internal-token'] = import.meta.env.VITE_COMMAND_CONSOLE_TOKEN;
}
export async function fetchSnapshot() {
    const res = await fetch('/api/internal/command-console/summary', {
        headers: DEFAULT_HEADERS,
    });
    if (!res.ok) {
        throw new Error(`Failed to load command console data (${res.status})`);
    }
    return res.json();
}
