/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export type SpinnerProps = React.SVGProps<SVGSVGElement>

export function Spinner({ className, ...props }: SpinnerProps) {
  return (
    <Loader2 className={cn('h-4 w-4 animate-spin', className)} {...props} />
  )
}
