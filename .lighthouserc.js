module.exports = {
  ci: {
    collect: { url: [process.env.PREVIEW_URL || 'http://localhost:3000'] },
    assert: {
      assertions: {
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-byte-weight': ['warn', { maxNumericValue: 900000 }],
      },
    },
  },
};
