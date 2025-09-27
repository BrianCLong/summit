import { S3Client, HeadObjectCommand } from "@aws-sdk/client-s3";
import { Pool } from "pg";
const pg = new Pool({ connectionString: process.env.DATABASE_URL });
const s3 = new S3Client({});
function parseBuckets(){ try{ return JSON.parse(process.env.CAS_BUCKETS_JSON||"{}"); }catch{ return {}; } }

async function main(){
  const buckets = parseBuckets(); const def = process.env.CAS_BUCKET_DEFAULT;
  // digests referenced by tickets but missing in cas_objects
  const q = `
    WITH dig AS (
      SELECT DISTINCT jsonb_array_elements_text(result->'artifacts') AS digest
      FROM remote_tickets WHERE status='DONE'
    )
    SELECT d.digest
    FROM dig d
    LEFT JOIN cas_objects c ON c.digest=d.digest
    WHERE c.digest IS NULL`;
  const { rows } = await pg.query(q);
  for (const r of rows){
    const digest = r.digest as string; const key = `cas/${digest}`;
    const candidates = [...new Set([def, ...Object.values(buckets)])].filter(Boolean) as string[];
    for (const bucket of candidates){
      try{
        await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
        await pg.query(`INSERT INTO cas_objects(digest,size,storage_uri)
                        VALUES ($1, COALESCE($2,0), $3) ON CONFLICT DO NOTHING`,
                        [digest, null, `s3://${bucket}/${key}`]);
        break;
      }catch{ /* try next bucket */ }
    }
  }
  process.exit(0);
}
main().catch(e=>{ console.error(e); process.exit(1); });