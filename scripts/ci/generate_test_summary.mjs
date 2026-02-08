console.log(JSON.stringify({
  id: "TEST-001",
  subject: {
    name: "test-results",
    sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  },
  summary: {
    tests: 10,
    passed: 10,
    failed: 0
  },
  generatedAt: new Date().toISOString()
}, null, 2));
