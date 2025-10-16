app.post('/dsar/export', requireReason(['/dsar/export']), async (req, res) => {
  /* stream zip of user data */
});
app.post(
  '/dsar/purge',
  requireReason(['/dsar/purge']),
  requireStepUp(2),
  async (req, res) => {
    /* create deletion_requests row; wait for approval */
  },
);
