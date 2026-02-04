export default function FactMarkets() {
  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-4xl font-bold">FactMarkets</h1>
      <p className="text-xl mt-4">
        Financial Fraud Detection & Market Manipulation
      </p>

      <div className="mt-8">
        <h2 className="text-2xl font-semibold">Features</h2>
        <ul className="mt-4 space-y-2">
          <li>✓ Market manipulation detection</li>
          <li>✓ Earnings guidance verification</li>
          <li>✓ ESG claims auditing</li>
        </ul>
      </div>

      <div className="mt-8">
        <h2 className="text-2xl font-semibold">Pricing</h2>
        <p className="mt-2">Contact for enterprise pricing</p>
      </div>

      <div className="mt-8">
        <a
          href="mailto:you@summit.ai?subject=FactMarkets Demo Request"
          className="bg-blue-600 text-white px-6 py-3 rounded"
        >
          Request Demo
        </a>
      </div>
    </div>
  )
}
