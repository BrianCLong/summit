import React from 'react'
import { exposureConfig } from '@/exposure/exposureConfig'
import { cn } from '@/lib/utils'

const bannerByMode = exposureConfig.banner

export function ExposureIndicator(): React.ReactElement | null {
  if (!bannerByMode) {
    return null
  }

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] bg-amber-400 text-black text-center px-3 py-1 text-xs font-semibold tracking-wide shadow"
      role="status"
      aria-live="polite"
    >
      {bannerByMode}
    </div>
  )
}

export function ExposureBadge({ className = '' }: { className?: string }) {
  if (!exposureConfig.badge) {
    return null
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded border border-amber-300 bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900',
        className
      )}
    >
      {exposureConfig.badge}
    </span>
  )
}

export function useExposureMode(): string {
  return exposureConfig.mode
}

export default ExposureIndicator
