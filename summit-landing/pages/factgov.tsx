export default function FactGov() {
  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-4xl font-bold">FactGov</h1>
      <p className="text-xl mt-4">
        Government Verification Marketplace
      </p>

      <div className="mt-8">
        <h2 className="text-2xl font-semibold">Features</h2>
        <ul className="mt-4 space-y-2">
          <li>✓ Pre-vetted AI vendors</li>
          <li>✓ Independent vendor verification</li>
          <li>✓ Fraud prevention</li>
        </ul>
      </div>

      <div className="mt-8">
        <h2 className="text-2xl font-semibold">Pricing</h2>
        <p className="mt-2">4% commission on contracts (via Cooperatives)</p>
      </div>

      <div className="mt-8">
        <a
          href="mailto:you@summit.ai?subject=FactGov Demo Request"
          className="bg-blue-600 text-white px-6 py-3 rounded"
        >
          Request Demo
        </a>
      </div>
    </div>
  )
}
