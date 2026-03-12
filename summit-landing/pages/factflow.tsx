// =============================================
// Summit Intelligence Solutions: FactFlow
// =============================================
import React from 'react'
import { CheckCircle2, ShieldCheck, Zap, ArrowRight, BarChart3, Globe } from 'lucide-react'

export default function FactFlow() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#fafafa] font-sans selection:bg-[#fafafa] selection:text-[#0a0a0a]">
      {/* Structural Header */}
      <div className="h-1 bg-[#262626] w-full" />
      <nav className="border-b border-[#262626] h-16 flex items-center px-8 justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-[#fafafa] flex items-center justify-center rounded-sm">
            <span className="text-[#0a0a0a] font-black text-xs text-center">IG</span>
          </div>
          <span className="text-sm font-bold uppercase tracking-[0.2em]">Summit // FactFlow</span>
        </div>
        <div className="flex items-center gap-8">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#a3a3a3]">Status: Operational</span>
          <div className="h-4 w-px bg-[#262626]" />
          <button className="text-[10px] font-bold uppercase tracking-[0.2em] border border-[#262626] px-4 py-2 hover:bg-[#fafafa] hover:text-[#0a0a0a] transition-all">
            Access Terminal
          </button>
        </div>
      </nav>

      <main className="max-w-[1400px] mx-auto px-8 py-20 lg:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div className="space-y-10">
            <div className="inline-flex items-center gap-2 px-2 py-1 border border-[#262626] bg-[#121212]">
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#a3a3a3]">Substrate: Cognitive Defense</span>
            </div>

            <h1 className="text-6xl lg:text-8xl font-black uppercase tracking-tighter leading-[0.9]">
              Truth at <br/>
              <span className="text-[#fafafa]">the Speed of</span> <br/>
              <span className="text-muted-foreground opacity-50">Information.</span>
            </h1>

            <p className="text-xl text-[#a3a3a3] max-w-lg font-medium leading-relaxed italic">
              "The first-of-its-kind live fact-checking dashboard for newsrooms and high-stakes signal environments."
            </p>

            <div className="flex items-center gap-4">
              <button className="h-14 px-8 bg-[#fafafa] text-[#0a0a0a] text-xs font-bold uppercase tracking-[0.2em] hover:bg-[#a3a3a3] transition-colors flex items-center gap-3">
                Initiate Intelligence Briefing
                <ArrowRight className="h-4 w-4" />
              </button>
              <button className="h-14 px-8 border border-[#262626] text-xs font-bold uppercase tracking-[0.2em] hover:bg-[#121212] transition-colors">
                View System Specs
              </button>
            </div>
          </div>

          {/* Visual Panel */}
          <div className="relative aspect-square border border-[#262626] bg-[#121212] overflow-hidden group shadow-2xl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.05),transparent_70%)]" />
            <div className="absolute inset-0 p-12 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="text-[10px] font-black mono-data text-[#a3a3a3]">SYS_READY // BUFFER_NOMINAL</div>
                  <div className="text-2xl font-bold uppercase tracking-widest">Live Extraction</div>
                </div>
                <div className="h-10 w-10 border border-[#262626] flex items-center justify-center">
                  <Globe className="h-5 w-5 text-primary" />
                </div>
              </div>

              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 border border-[#262626] bg-[#0a0a0a]/50 backdrop-blur-md p-4 flex items-center justify-between group-hover:border-[#fafafa]/20 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-1 h-8 bg-green-500" />
                      <div className="space-y-1">
                        <div className="text-[9px] mono-data text-[#a3a3a3]">CLAIM_ID: {4028 + i}</div>
                        <div className="text-[11px] font-bold uppercase tracking-tight">Verified Assertion // Signal 0{i}</div>
                      </div>
                    </div>
                    <div className="text-[10px] mono-data font-black text-green-500">99.4%</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <section className="mt-32 pt-20 border-t border-[#262626] grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="space-y-4">
            <Zap className="h-6 w-6 text-primary" />
            <h3 className="text-lg font-bold uppercase tracking-widest">Real-time Transcription</h3>
            <p className="text-sm text-[#a3a3a3] leading-relaxed">
              Automated claim extraction from low-latency audio/video streams using the Summit Inference Engine.
            </p>
          </div>
          <div className="space-y-4">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <h3 className="text-lg font-bold uppercase tracking-widest">Automatic Evidence</h3>
            <p className="text-sm text-[#a3a3a3] leading-relaxed">
              Cross-referencing global data substrates and local ledger artifacts to provide instant citation.
            </p>
          </div>
          <div className="space-y-4">
            <BarChart3 className="h-6 w-6 text-primary" />
            <h3 className="text-lg font-bold uppercase tracking-widest">Live Verdict Matrix</h3>
            <p className="text-sm text-[#a3a3a3] leading-relaxed">
              Definitive truth-state classification: VERIFIED, CONTESTED, or INSUFFICIENT_EVIDENCE.
            </p>
          </div>
        </section>

        {/* Procurement / Pricing Section */}
        <section className="mt-32 p-12 border border-[#262626] bg-[#121212] flex flex-col md:flex-row items-center justify-between gap-10 shadow-inner">
          <div className="space-y-2">
            <div className="text-[10px] font-black mono-data text-primary uppercase tracking-widest">Operational Deployment</div>
            <h2 className="text-3xl font-black uppercase tracking-tighter">Enterprise Procurement</h2>
            <p className="text-sm text-[#a3a3a3]">$2,500 / CYCLE // UNLIMITED EVENTS // 5 OPERATORS</p>
          </div>
          <button className="h-14 px-12 bg-[#fafafa] text-[#0a0a0a] text-xs font-black uppercase tracking-[0.3em] hover:bg-primary hover:text-white transition-all">
            Secure Implementation
          </button>
        </section>
      </main>

      <footer className="border-t border-[#262626] py-12 px-8">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#a3a3a3]">© 2026 Summit // The Definitive Intelligence OS</span>
          <div className="flex gap-8 text-[10px] font-bold uppercase tracking-widest text-[#a3a3a3]">
            <a href="#" className="hover:text-[#fafafa]">Security</a>
            <a href="#" className="hover:text-[#fafafa]">Governance</a>
            <a href="#" className="hover:text-[#fafafa]">Registry</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
