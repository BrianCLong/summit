export function groupAlerts(alerts) {
    const byKey = new Map();
    for (const a of alerts) {
        const key = a.dedupeKey || a.id;
        if (!byKey.has(key))
            byKey.set(key, []);
        byKey.get(key).push(a);
    }
    return Array.from(byKey.values());
}
//# sourceMappingURL=AutoGrouping.js.map