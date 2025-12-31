import fs from 'fs';
import path from 'path';

const FLAG_FILE = path.join(process.cwd(), '.sunset_mode');

const enableSunset = () => {
  console.log('Enabling Sunset / Freeze Mode...');

  const status = {
    enabled: true,
    enabledAt: new Date().toISOString(),
    operator: process.env.USER || 'unknown',
    message: 'System is in Sunset Mode. Write operations are disabled.'
  };

  fs.writeFileSync(FLAG_FILE, JSON.stringify(status, null, 2));
  console.log('Sunset mode ENABLED. New writes should be rejected.');
};

enableSunset();
