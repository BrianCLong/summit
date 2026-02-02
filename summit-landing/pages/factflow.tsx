export default function FactFlow() {
  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-4xl font-bold">FactFlow</h1>
      <p className="text-xl mt-4">
        Live fact-checking dashboard for newsrooms
      </p>

      <div className="mt-8">
        <h2 className="text-2xl font-semibold">Features</h2>
        <ul className="mt-4 space-y-2">
          <li>✓ Real-time transcription + claim extraction</li>
          <li>✓ Automatic evidence retrieval</li>
          <li>✓ Live verdict display (TRUE/FALSE/UNCLEAR)</li>
        </ul>
      </div>

      <div className="mt-8">
        <h2 className="text-2xl font-semibold">Pricing</h2>
        <p className="mt-2">$2,500/month — Unlimited events, 5 users</p>
      </div>

      <div className="mt-8">
        <a
          href="mailto:you@summit.ai?subject=FactFlow Demo Request"
          className="bg-blue-600 text-white px-6 py-3 rounded"
        >
          Request Demo
        </a>
      </div>
    </div>
  )
}
