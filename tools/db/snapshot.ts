import crypto from 'crypto';
import { execSync } from 'child_process';
import fs from 'fs';
const mh = execSync(
  "git ls-files server/src/migrations | xargs cat | sha1sum | awk '{print $1}'",
  { shell: 'bash' },
)
  .toString()
  .trim();
const key = `pgdump-${mh}.tar.zst`;
fs.writeFileSync('key.txt', key);
try {
  execSync(`gh cache restore ${key}`);
  console.log('Restored DB snapshot');
} catch {
  console.log('Building DB snapshot');
  execSync(
    'docker compose -f docker-compose.ci.yml up -d pg && sleep 3 && psql -f server/src/migrations/all.sql',
  );
  execSync(`pg_dump -F t | zstd -19 -o ${key}`);
  execSync(`gh cache save ${key} -p ${key}`);
}
