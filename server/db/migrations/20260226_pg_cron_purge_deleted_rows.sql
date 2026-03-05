-- Run nightly; adjust retention as needed (e.g., 30 days)
SELECT cron.schedule(
  'purge_old_deletions',
  '0 3 * * *',
  $$SELECT reconcile.purge_old_deletions(30);$$
);
