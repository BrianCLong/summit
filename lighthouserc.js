module.exports = {
  ci: {
    collect: {
      staticDistDir: 'docs-site/build',
      url: ['/', '/reference/', '/tutorials/first-ingest'],
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'first-contentful-paint': ['error', { maxNumericValue: 2000 }],
        'total-byte-weight': ['warn', { maxNumericValue: 600000 }],
      },
    },
    upload: { target: 'temporary-public-storage' },
  },
};
