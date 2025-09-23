import { Router } from "express"; import { Pool } from "pg";
const r = Router(); const pg = new Pool({ connectionString: process.env.DATABASE_URL });

r.get("/admin/notices", async (req, res) => {
  const tenant = req.user?.tenant;
  if (!tenant) return res.status(401).json({ error: "unauthenticated" });
  const { rows } = await pg.query(
    "select id, kind, message, severity, expires_at from tenant_notices where tenant_id=$1 and expires_at > now() order by created_at desc",
    [tenant]
  );
  res.json({ items: rows });
});

export default r;
