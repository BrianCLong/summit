import React, { useState } from 'react'
import { Github, Rocket, Shield, Globe, Clock, CheckCircle2 } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export default function TrialSignup() {
  const [step, setStep] = useState<'start' | 'provisioning' | 'scanning' | 'ready'>('start')
  const [progress, setProgress] = useState(0)

  const handleStartTrial = () => {
    setStep('provisioning')
    // Simulate tenant provision
    let p = 0
    const interval = setInterval(() => {
      p += 5
      setProgress(p)
      if (p >= 100) {
        clearInterval(interval)
        setStep('scanning')
        startScan()
      }
    }, 100)
  }

  const startScan = () => {
    setProgress(0)
    let p = 0
    const interval = setInterval(() => {
      p += 10
      setProgress(p)
      if (p >= 100) {
        clearInterval(interval)
        setStep('ready')
      }
    }, 200)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="flex flex-col justify-center space-y-6">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Start Your Summit Trial</h1>
            <p className="text-slate-400 text-lg">
              Get full access to the intelligence graph for 7 days.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <Shield className="h-6 w-6 text-blue-500 mt-1" />
              <div>
                <h3 className="text-white font-semibold">1 Organization Limit</h3>
                <p className="text-slate-500 text-sm">Perfect for testing your core mesh.</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Clock className="h-6 w-6 text-blue-500 mt-1" />
              <div>
                <h3 className="text-white font-semibold">7 Day Duration</h3>
                <p className="text-slate-500 text-sm">Full feature access during the trial period.</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Globe className="h-6 w-6 text-blue-500 mt-1" />
              <div>
                <h3 className="text-white font-semibold">Watermarked Graphs</h3>
                <p className="text-slate-500 text-sm">Exportable insights with trial attribution.</p>
              </div>
            </div>
          </div>
        </div>

        <Card className="bg-slate-900 border-slate-800 text-white">
          <CardHeader>
            <CardTitle>Register via GitHub</CardTitle>
            <CardDescription className="text-slate-400">
              We'll use your GitHub identity to provision your trial environment.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {step === 'start' && (
              <Button
                onClick={handleStartTrial}
                className="w-full h-12 bg-white text-black hover:bg-slate-200 flex items-center justify-center space-x-2"
              >
                <Github className="h-5 w-5" />
                <span>Continue with GitHub</span>
              </Button>
            )}

            {(step === 'provisioning' || step === 'scanning') && (
              <div className="space-y-4 py-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                <div>
                  <h3 className="text-lg font-medium">
                    {step === 'provisioning' ? 'Provisioning Tenant...' : 'Org Mesh Quickstart Scan...'}
                  </h3>
                  <div className="w-full bg-slate-800 rounded-full h-2 mt-4">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            )}

            {step === 'ready' && (
              <div className="space-y-4 py-4 text-center">
                <div className="bg-green-500/10 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-10 w-10 text-green-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Your Environment is Ready!</h3>
                  <p className="text-slate-400 mt-2">
                    Your trial environment has been successfully provisioned.
                  </p>
                </div>
                <Button
                  className="w-full mt-4 bg-blue-600 hover:bg-blue-700"
                  onClick={() => window.location.href = '/'}
                >
                  <Rocket className="h-4 w-4 mr-2" />
                  Enter Workspace
                </Button>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <p className="text-xs text-slate-500 text-center w-full">
              By continuing, you agree to Summit's Trial Terms of Service.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
