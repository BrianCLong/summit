 
const fs = require('fs');
console.log(fs.existsSync('yarn.lock') ? 'Using Yarn' : 'Using npm');