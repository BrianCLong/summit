console.log(JSON.stringify({
  id: "ATT-001",
  subject: {
    name: "build.tgz",
    sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  },
  predicateType: "https://slsa.dev/provenance/v0.2",
  generatedAt: new Date().toISOString()
}, null, 2));
