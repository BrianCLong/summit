// =============================================
// Summit Intelligence Solutions: FactMarkets
// =============================================
import React from 'react'
import { ShieldCheck, BarChart3, Globe, ArrowRight, Zap, Coins } from 'lucide-react'

export default function FactMarkets() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#fafafa] font-sans selection:bg-[#fafafa] selection:text-[#0a0a0a]">
      {/* Structural Header */}
      <div className="h-1 bg-[#262626] w-full" />
      <nav className="border-b border-[#262626] h-16 flex items-center px-8 justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-[#fafafa] flex items-center justify-center rounded-sm">
            <span className="text-[#0a0a0a] font-black text-xs text-center">IG</span>
          </div>
          <span className="text-sm font-bold uppercase tracking-[0.2em]">Summit // FactMarkets</span>
        </div>
        <div className="flex items-center gap-8">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#a3a3a3]">Sector: Financial Intelligence</span>
          <div className="h-4 w-px bg-[#262626]" />
          <button className="text-[10px] font-bold uppercase tracking-[0.2em] border border-[#262626] px-4 py-2 hover:bg-[#fafafa] hover:text-[#0a0a0a] transition-all">
            Terminal Access
          </button>
        </div>
      </nav>

      <main className="max-w-[1400px] mx-auto px-8 py-20 lg:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div className="space-y-10">
            <div className="inline-flex items-center gap-2 px-2 py-1 border border-[#262626] bg-[#121212]">
              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#a3a3a3]">Market State: High Volatility</span>
            </div>

            <h1 className="text-6xl lg:text-8xl font-black uppercase tracking-tighter leading-[0.9]">
              Alpha through <br/>
              <span className="text-[#fafafa]">Information</span> <br/>
              <span className="text-muted-foreground opacity-50">Sovereignty.</span>
            </h1>

            <p className="text-xl text-[#a3a3a3] max-w-lg font-medium leading-relaxed italic">
              "Real-time market sentiment, rumor attribution, and financial signal extraction for elite trading desks."
            </p>

            <div className="flex items-center gap-4">
              <button className="h-14 px-8 bg-[#fafafa] text-[#0a0a0a] text-xs font-bold uppercase tracking-[0.2em] hover:bg-[#a3a3a3] transition-colors flex items-center gap-3">
                Request Alpha Brief
                <ArrowRight className="h-4 w-4" />
              </button>
              <button className="h-14 px-8 border border-[#262626] text-xs font-bold uppercase tracking-[0.2em] hover:bg-[#121212] transition-colors">
                Terminal Specs
              </button>
            </div>
          </div>

          {/* Visual Panel */}
          <div className="relative aspect-square border border-[#262626] bg-[#121212] overflow-hidden group shadow-2xl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.05),transparent_70%)]" />
            <div className="absolute inset-0 p-12 flex flex-col justify-between font-mono">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="text-[10px] font-black text-[#a3a3a3]">MARKET_FEED // TICKER_ACTIVE</div>
                  <div className="text-2xl font-bold uppercase tracking-widest">Signal Matrix</div>
                </div>
                <div className="h-10 w-10 border border-[#262626] flex items-center justify-center">
                  <Coins className="h-5 w-5 text-primary" />
                </div>
              </div>

              <div className="space-y-2">
                {[
                  { sym: 'AAPL', sig: '+0.84', conf: 'HIGH' },
                  { sym: 'TSLA', sig: '-1.22', conf: 'MED' },
                  { sym: 'BTC', sig: '+4.92', conf: 'CRIT' },
                  { sym: 'XAU', sig: '+0.12', conf: 'HIGH' }
                ].map((item, i) => (
                  <div key={i} className="h-12 border border-[#262626] bg-[#0a0a0a]/50 p-4 flex items-center justify-between group-hover:border-primary/20 transition-colors">
                    <span className="text-[11px] font-black">{item.sym}</span>
                    <span className={item.sig.startsWith('+') ? 'text-green-500' : 'text-destructive'}>{item.sig}</span>
                    <span className="text-[9px] px-1 border border-border text-[#a3a3a3]">{item.conf}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <section className="mt-32 pt-20 border-t border-[#262626] grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="space-y-4">
            <BarChart3 className="h-6 w-6 text-primary" />
            <h3 className="text-lg font-bold uppercase tracking-widest">Signal Attribution</h3>
            <p className="text-sm text-[#a3a3a3] leading-relaxed">
              Trace every market-moving rumor back to its primary source with bitemporal precision.
            </p>
          </div>
          <div className="space-y-4">
            <Globe className="h-6 w-6 text-primary" />
            <h3 className="text-lg font-bold uppercase tracking-widest">Macro-Graph Analysis</h3>
            <p className="text-sm text-[#a3a3a3] leading-relaxed">
              Visualize the hidden relational dependencies between global events and asset volatility.
            </p>
          </div>
          <div className="space-y-4">
            <Zap className="h-6 w-6 text-primary" />
            <h3 className="text-lg font-bold uppercase tracking-widest">Latency Neutralization</h3>
            <p className="text-sm text-[#a3a3a3] leading-relaxed">
              Inference at the edge ensures you see the truth before the market reacts.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#262626] py-12 px-8">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#a3a3a3]">© 2026 Summit // The Definitive Intelligence OS</span>
          <div className="flex gap-8 text-[10px] font-bold uppercase tracking-widest text-[#a3a3a3]">
            <a href="#" className="hover:text-[#fafafa]">Compliance</a>
            <a href="#" className="hover:text-[#fafafa]">Risk</a>
            <a href="#" className="hover:text-[#fafafa]">Performance</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
