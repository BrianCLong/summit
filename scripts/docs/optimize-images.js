const fs = require('fs');
const path = require('path');
const imagemin = require('imagemin');
const mozjpeg = require('imagemin-mozjpeg');
const pngquant = require('imagemin-pngquant');
(async () => {
  const files = await imagemin(['docs/**/*.{jpg,jpeg,png}'], {
    destination: 'docs',
    plugins: [mozjpeg({ quality: 82 }), pngquant({ quality: [0.7, 0.85] })],
  });
  console.log('Optimized', files.length, 'images');
})();
