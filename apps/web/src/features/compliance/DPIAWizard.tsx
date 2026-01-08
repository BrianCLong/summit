import React from 'react'

export default function DPIAWizard() {
  const [step, setStep] = React.useState(1)

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-lg w-full max-w-2xl shadow-xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-slate-100">
              Data Protection Impact Assessment (DPIA)
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Required for high-risk data processing operations.
            </p>
          </div>
          <div className="text-sm text-slate-500">Step {step} of 4</div>
        </div>

        {/* Body */}
        <div className="p-6 flex-1 overflow-y-auto">
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-slate-200">
                1. Purpose & Necessity
              </h3>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-400">
                  What is the primary purpose of this investigation?
                </label>
                <textarea
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 text-sm focus:border-indigo-500 outline-none"
                  rows={4}
                  placeholder="e.g. Investigating potential fraud related to..."
                />
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-slate-200">
                2. Lawful Basis
              </h3>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-400">
                  Select the lawful basis for processing:
                </label>
                <select className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 text-sm">
                  <option>Legitimate Interest</option>
                  <option>Public Interest</option>
                  <option>Legal Obligation</option>
                  <option>Consent</option>
                </select>
              </div>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-slate-200">
                3. Data Categories (PII)
              </h3>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-400">
                  Select sensitive data classes involved:
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    'Financial',
                    'Health',
                    'Criminal Records',
                    'Biometrics',
                    'Location',
                    'Communications',
                  ].map(c => (
                    <label
                      key={c}
                      className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded cursor-pointer hover:bg-slate-700 border border-transparent has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-500/10"
                    >
                      <input type="checkbox" className="accent-indigo-500" />
                      <span className="text-sm text-slate-300">{c}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
          {step === 4 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-slate-200">
                4. Review & Sign-off
              </h3>
              <div className="bg-amber-900/20 border border-amber-900/50 p-4 rounded text-amber-200 text-sm">
                By submitting this assessment, you certify that the processing
                is necessary and proportionate.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50 rounded-b-lg flex justify-end gap-3">
          {step > 1 && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="px-4 py-2 text-slate-400 hover:text-white transition"
            >
              Back
            </button>
          )}
          {step < 4 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-medium transition"
            >
              Next
            </button>
          ) : (
            <button className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded font-medium transition">
              Submit Assessment
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
