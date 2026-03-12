// =============================================
// Summit Intelligence Solutions: FactGov
// =============================================
import React from 'react'
import { ShieldCheck, Landmark, FileCheck, ArrowRight, Gavel, Scale } from 'lucide-react'

export default function FactGov() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#fafafa] font-sans selection:bg-[#fafafa] selection:text-[#0a0a0a]">
      {/* Structural Header */}
      <div className="h-1 bg-[#262626] w-full" />
      <nav className="border-b border-[#262626] h-16 flex items-center px-8 justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-[#fafafa] flex items-center justify-center rounded-sm">
            <span className="text-[#0a0a0a] font-black text-xs text-center">IG</span>
          </div>
          <span className="text-sm font-bold uppercase tracking-[0.2em]">Summit // FactGov</span>
        </div>
        <div className="flex items-center gap-8">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#a3a3a3]">Sector: Public Governance</span>
          <div className="h-4 w-px bg-[#262626]" />
          <button className="text-[10px] font-bold uppercase tracking-[0.2em] border border-[#262626] px-4 py-2 hover:bg-[#fafafa] hover:text-[#0a0a0a] transition-all">
            Portal Login
          </button>
        </div>
      </nav>

      <main className="max-w-[1400px] mx-auto px-8 py-20 lg:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div className="space-y-10">
            <div className="inline-flex items-center gap-2 px-2 py-1 border border-[#262626] bg-[#121212]">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#a3a3a3]">Trust Level: Sovereign Grade</span>
            </div>

            <h1 className="text-6xl lg:text-8xl font-black uppercase tracking-tighter leading-[0.9]">
              Institutional <br/>
              <span className="text-[#fafafa]">Integrity at</span> <br/>
              <span className="text-muted-foreground opacity-50">Scale.</span>
            </h1>

            <p className="text-xl text-[#a3a3a3] max-w-lg font-medium leading-relaxed italic">
              "Automated governance and verification platform for government agencies and democratic institutions."
            </p>

            <div className="flex items-center gap-4">
              <button className="h-14 px-8 bg-[#fafafa] text-[#0a0a0a] text-xs font-bold uppercase tracking-[0.2em] hover:bg-[#a3a3a3] transition-colors flex items-center gap-3">
                Request Governance Audit
                <ArrowRight className="h-4 w-4" />
              </button>
              <button className="h-14 px-8 border border-[#262626] text-xs font-bold uppercase tracking-[0.2em] hover:bg-[#121212] transition-colors">
                Whitepaper
              </button>
            </div>
          </div>

          {/* Visual Panel */}
          <div className="relative aspect-square border border-[#262626] bg-[#121212] overflow-hidden group shadow-2xl font-mono">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.05),transparent_70%)]" />
            <div className="absolute inset-0 p-12 flex flex-col gap-8">
              <div className="flex justify-between items-center border-b border-[#262626] pb-4">
                <div className="text-[10px] font-black uppercase tracking-widest">Verification Ledger</div>
                <div className="text-[10px] text-[#a3a3a3]">ID: GOV-882-X</div>
              </div>

              <div className="space-y-6">
                {[
                  { label: 'Policy Alignment', val: '99.8%' },
                  { label: 'Evidence Density', val: '14.2 GB/S' },
                  { label: 'Audit Velocity', val: 'REAL-TIME' }
                ].map((item, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between text-[10px] uppercase font-bold tracking-tighter">
                      <span>{item.label}</span>
                      <span className="text-primary">{item.val}</span>
                    </div>
                    <div className="h-1 bg-[#262626] w-full">
                      <div className="h-full bg-[#fafafa] opacity-50 w-3/4 animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-auto p-4 border border-dashed border-[#262626] bg-[#0a0a0a]/50">
                <div className="text-[9px] text-[#a3a3a3] mb-2 font-bold uppercase">System Reasoning Trace:</div>
                <div className="text-[10px] leading-tight text-[#fafafa]/80 italic">
                  &gt; Verifying constituent feedback against policy-v4<br/>
                  &gt; Detecting narrative drift in district-09...<br/>
                  &gt; Integrity status: NOMINAL
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <section className="mt-32 pt-20 border-t border-[#262626] grid grid-cols-1 md:grid-cols-3 gap-12 text-center md:text-left">
          <div className="space-y-4">
            <Landmark className="h-6 w-6 text-primary mx-auto md:mx-0" />
            <h3 className="text-lg font-bold uppercase tracking-widest">Policy Guardrails</h3>
            <p className="text-sm text-[#a3a3a3] leading-relaxed">
              Enforce regulatory and constitutional constraints on all information extraction and dissemination.
            </p>
          </div>
          <div className="space-y-4">
            <FileCheck className="h-6 w-6 text-primary mx-auto md:mx-0" />
            <h3 className="text-lg font-bold uppercase tracking-widest">Audit Trails</h3>
            <p className="text-sm text-[#a3a3a3] leading-relaxed">
              Immutable, bitemporal ledger of every claim, evidence source, and system decision.
            </p>
          </div>
          <div className="space-y-4">
            <Scale className="h-6 w-6 text-primary mx-auto md:mx-0" />
            <h3 className="text-lg font-bold uppercase tracking-widest">Neutrality Engine</h3>
            <p className="text-sm text-[#a3a3a3] leading-relaxed">
              Bias detection and mitigation specifically tuned for multi-partisan and sovereign contexts.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#262626] py-12 px-8">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#a3a3a3]">© 2026 Summit // The Definitive Intelligence OS</span>
          <div className="flex gap-8 text-[10px] font-bold uppercase tracking-widest text-[#a3a3a3]">
            <a href="#" className="hover:text-[#fafafa]">Privacy</a>
            <a href="#" className="hover:text-[#fafafa]">Compliance</a>
            <a href="#" className="hover:text-[#fafafa]">Transparency</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
