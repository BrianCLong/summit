import fs from 'fs';
import path from 'path';

const FLAG_FILE = path.join(process.cwd(), '.sunset_mode');

const disableSunset = () => {
  console.log('Disabling Sunset / Freeze Mode...');

  if (fs.existsSync(FLAG_FILE)) {
    fs.unlinkSync(FLAG_FILE);
    console.log('Sunset mode DISABLED. Normal operations resumed.');
  } else {
    console.log('Sunset mode was not enabled.');
  }
};

disableSunset();
