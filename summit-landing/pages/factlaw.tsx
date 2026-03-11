// =============================================
// Summit Intelligence Solutions: FactLaw
// =============================================
import React from 'react'
import { ShieldCheck, Gavel, FileSearch, ArrowRight, BookOpen, Scale } from 'lucide-react'

export default function FactLaw() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#fafafa] font-sans selection:bg-[#fafafa] selection:text-[#0a0a0a]">
      {/* Structural Header */}
      <div className="h-1 bg-[#262626] w-full" />
      <nav className="border-b border-[#262626] h-16 flex items-center px-8 justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-[#fafafa] flex items-center justify-center rounded-sm">
            <span className="text-[#0a0a0a] font-black text-xs text-center">IG</span>
          </div>
          <span className="text-sm font-bold uppercase tracking-[0.2em]">Summit // FactLaw</span>
        </div>
        <div className="flex items-center gap-8">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#a3a3a3]">Sector: Legal Discovery</span>
          <div className="h-4 w-px bg-[#262626]" />
          <button className="text-[10px] font-bold uppercase tracking-[0.2em] border border-[#262626] px-4 py-2 hover:bg-[#fafafa] hover:text-[#0a0a0a] transition-all">
            Secure Portal
          </button>
        </div>
      </nav>

      <main className="max-w-[1400px] mx-auto px-8 py-20 lg:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div className="space-y-10">
            <div className="inline-flex items-center gap-2 px-2 py-1 border border-[#262626] bg-[#121212]">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#a3a3a3]">Substrate: Legal Graph</span>
            </div>
            
            <h1 className="text-6xl lg:text-8xl font-black uppercase tracking-tighter leading-[0.9]">
              Precision <br/>
              <span className="text-[#fafafa]">Discovery &</span> <br/>
              <span className="text-muted-foreground opacity-50">Litigation.</span>
            </h1>
            
            <p className="text-xl text-[#a3a3a3] max-w-lg font-medium leading-relaxed italic">
              "Hyper-scale legal discovery and evidentiary triangulation for top-tier firms and forensic investigators."
            </p>

            <div className="flex items-center gap-4">
              <button className="h-14 px-8 bg-[#fafafa] text-[#0a0a0a] text-xs font-bold uppercase tracking-[0.2em] hover:bg-[#a3a3a3] transition-colors flex items-center gap-3">
                Request Case Evaluation
                <ArrowRight className="h-4 w-4" />
              </button>
              <button className="h-14 px-8 border border-[#262626] text-xs font-bold uppercase tracking-[0.2em] hover:bg-[#121212] transition-colors">
                Integration Guide
              </button>
            </div>
          </div>

          {/* Visual Panel */}
          <div className="relative aspect-square border border-[#262626] bg-[#121212] overflow-hidden group shadow-2xl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.05),transparent_70%)]" />
            <div className="absolute inset-0 p-12 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="text-[10px] font-black mono-data text-[#a3a3a3]">DISCOVERY_FLOW // ACTIVE</div>
                  <div className="text-2xl font-bold uppercase tracking-widest">Evidence Mapping</div>
                </div>
                <div className="h-10 w-10 border border-[#262626] flex items-center justify-center">
                  <Gavel className="h-5 w-5 text-primary" />
                </div>
              </div>
              
              <div className="space-y-4">
                {[1, 2].map(i => (
                  <div key={i} className="border border-[#262626] bg-[#0a0a0a]/50 backdrop-blur-md p-6 group-hover:border-[#fafafa]/20 transition-colors">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[9px] mono-data font-black px-1.5 py-0.5 border border-[#262626] text-[#a3a3a3]">EXHIBIT_PRIME_{i}</span>
                      <ShieldCheck className="h-3 w-3 text-green-500" />
                    </div>
                    <div className="h-2 bg-[#262626] w-full rounded-full overflow-hidden mb-2">
                      <div className="h-full bg-primary w-2/3" />
                    </div>
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-tighter">
                      <span className="text-[#a3a3a3]">Fidelity Match</span>
                      <span>84.2%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <section className="mt-32 pt-20 border-t border-[#262626] grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="space-y-4">
            <FileSearch className="h-6 w-6 text-primary" />
            <h3 className="text-lg font-bold uppercase tracking-widest">Evidentiary Triangulation</h3>
            <p className="text-sm text-[#a3a3a3] leading-relaxed">
              Automatically link disparate data sources into a unified, court-ready timeline of events.
            </p>
          </div>
          <div className="space-y-4">
            <BookOpen className="h-6 w-6 text-primary" />
            <h3 className="text-lg font-bold uppercase tracking-widest">Precedent Synthesis</h3>
            <p className="text-sm text-[#a3a3a3] leading-relaxed">
              Cross-reference millions of case-law artifacts against active discovery in seconds.
            </p>
          </div>
          <div className="space-y-4">
            <Scale className="h-6 w-6 text-primary" />
            <h3 className="text-lg font-bold uppercase tracking-widest">Chain of Custody</h3>
            <p className="text-sm text-[#a3a3a3] leading-relaxed">
              Bitemporal provenance for every single insight, ensuring absolute auditability.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#262626] py-12 px-8">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#a3a3a3]">© 2026 Summit // The Definitive Intelligence OS</span>
          <div className="flex gap-8 text-[10px] font-bold uppercase tracking-widest text-[#a3a3a3]">
            <a href="#" className="hover:text-[#fafafa]">Litigation Support</a>
            <a href="#" className="hover:text-[#fafafa]">Ethics</a>
            <a href="#" className="hover:text-[#fafafa]">Protocol</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
