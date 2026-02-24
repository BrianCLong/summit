console.log(JSON.stringify({
  id: "SBOM-001",
  subject: {
    name: "application",
    sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  },
  spdxVersion: "SPDX-2.3",
  generatedAt: new Date().toISOString()
}, null, 2));
