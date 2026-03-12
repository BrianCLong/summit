import React, { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { LogIn, Eye, EyeOff } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/contexts/AuthContext'
import { trackGoldenPathStep } from '@/telemetry/metrics'
import { markStepComplete } from '@/lib/activation'

export default function SignInPage() {
  const { login, isAuthenticated, loading } = useAuth()
  const [email, setEmail] = useState('sarah.chen@intelgraph.com')
  const [password, setPassword] = useState('password')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [emailFieldError, setEmailFieldError] = useState('')
  const [passwordFieldError, setPasswordFieldError] = useState('')

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous error messages (including the global error)
    setError('');
    setEmailFieldError('');
    setPasswordFieldError('');

    setIsLoading(true);

    // Client-side validation
    let hasErrors = false;

    if (!email) {
      setEmailFieldError('Email is required');
      hasErrors = true;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailFieldError('Please enter a valid email address');
      hasErrors = true;
    }

    if (!password) {
      setPasswordFieldError('Password is required');
      hasErrors = true;
    } else if (password.length < 8) {
      setPasswordFieldError('Password must be at least 8 characters');
      hasErrors = true;
    }

    if (hasErrors) {
      setIsLoading(false);
      return;
    }

    try {
      await login(email, password);
      // Track signup/signin as the first step
      trackGoldenPathStep('signup');
      markStepComplete('signup');
    } catch (err) {
      // When login fails, clear field errors but keep the global error
      setEmailFieldError('');
      setPasswordFieldError('');
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <main
      role="main"
      aria-label="Operational Access"
      className="min-h-screen flex items-center justify-center bg-background p-4 font-sans"
    >
      <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-300">
        <div className="text-center mb-12">
          <div className="h-14 w-14 bg-primary rounded-sm flex items-center justify-center mx-auto mb-6 shadow-2xl">
            <span className="text-primary-foreground font-black text-xl tracking-tighter">
              IG
            </span>
          </div>
          <h1 className="text-sm font-black uppercase tracking-[0.4em] text-foreground">Summit Intelligence</h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mt-2">Operational Access Terminal</p>
        </div>

        <Card className="rounded-sm border-border bg-card shadow-2xl overflow-hidden">
          <CardHeader className="border-b border-border bg-background/50 p-6">
            <CardTitle className="text-xs font-black uppercase tracking-[0.2em]">Credential Verification</CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">
              Enter clearance identifiers to initiate session
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground"
                >
                  Operator Identifier (Email)
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailFieldError('');
                  }}
                  className="w-full h-11 px-4 bg-background border border-border rounded-none text-xs font-bold uppercase tracking-wider placeholder:text-muted-foreground/30 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                  placeholder="ID_SECURE_INPUT"
                  required
                  aria-describedby="email-error"
                  aria-invalid={!!emailFieldError}
                />
                {emailFieldError && (
                  <div id="email-error" className="text-[9px] font-black uppercase tracking-tighter text-destructive mt-1">
                    {emailFieldError}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground"
                >
                  Access Key (Password)
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setPasswordFieldError('');
                    }}
                    className="w-full h-11 px-4 pr-12 bg-background border border-border rounded-none text-xs font-bold tracking-wider placeholder:text-muted-foreground/30 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                    placeholder="••••••••"
                    required
                    minLength={8}
                    aria-describedby="password-error"
                    aria-invalid={!!passwordFieldError}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-muted-foreground hover:text-primary transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-3 w-3" />
                    ) : (
                      <Eye className="h-3 w-3" />
                    )}
                  </button>
                </div>
                {passwordFieldError && (
                  <div id="password-error" className="text-[9px] font-black uppercase tracking-tighter text-destructive mt-1">
                    {passwordFieldError}
                  </div>
                )}
              </div>

              {error && (
                <div className="text-destructive text-[10px] font-black uppercase tracking-widest bg-destructive/10 border border-destructive/20 p-4 rounded-sm animate-in shake-1">
                  Access Denied: {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-12 text-[10px] font-black uppercase tracking-[0.3em] transition-all"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary-foreground mr-3"></div>
                    Verifying...
                  </>
                ) : (
                  <>
                    <LogIn className="h-3 w-3 mr-3" />
                    Initialize Session
                  </>
                )}
              </Button>
            </form>

            <div className="mt-10 p-4 border border-dashed border-border bg-muted/20">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-3 border-b border-border/50 pb-2">Guest clearance artifacts:</p>
              <div className="text-[10px] mono-data font-bold space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ID:</span>
                  <span>sarah.chen@intelgraph.com</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">KEY:</span>
                  <span>password</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
           <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground opacity-50">
             Substrate Connection: Secure // Node: US-EAST-01
           </p>
        </div>
      </div>
    </main>
  )
}
