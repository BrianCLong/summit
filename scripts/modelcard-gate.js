const fs = require('fs');
if (!fs.existsSync('ML/MODEL_CARD.md')) {
  console.error('Model Card required');
  process.exit(1);
}
