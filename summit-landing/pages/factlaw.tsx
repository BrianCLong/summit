export default function FactLaw() {
  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-4xl font-bold">FactLaw</h1>
      <p className="text-xl mt-4">
        Deepfake Detection for Legal Evidence
      </p>

      <div className="mt-8">
        <h2 className="text-2xl font-semibold">Features</h2>
        <ul className="mt-4 space-y-2">
          <li>✓ Forensic analysis (metadata, pixel patterns)</li>
          <li>✓ AI-generation detection</li>
          <li>✓ Court-admissible reports (FRE 901 compliant)</li>
        </ul>
      </div>

      <div className="mt-8">
        <h2 className="text-2xl font-semibold">Pricing</h2>
        <p className="mt-2">$5,000-30,000/month depending on case volume</p>
      </div>

      <div className="mt-8">
        <a
          href="mailto:you@summit.ai?subject=FactLaw Demo Request"
          className="bg-blue-600 text-white px-6 py-3 rounded"
        >
          Request Demo
        </a>
      </div>
    </div>
  )
}
