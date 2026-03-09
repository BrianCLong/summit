import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SpinnerProps extends React.SVGProps<SVGSVGElement> {
  label?: string
}

export function Spinner({ className, label = 'Loading', ...props }: SpinnerProps) {
  return (
    <Loader2
      role="status"
      aria-label={label}
      className={cn('h-4 w-4 animate-spin', className)}
      {...props}
    />
  )
}
