/**
 * Skeleton Loading Component for Tri-Pane Shell
 *
 * Provides a shimmer loading state while data is being fetched,
 * maintaining the same layout structure as the loaded state.
 */

import React from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { cn } from '@/lib/utils'

interface TriPaneSkeletonProps {
  className?: string
}

export function TriPaneSkeleton({ className }: TriPaneSkeletonProps) {
  return (
    <div
      className={cn('flex flex-col h-full gap-4', className)}
      role="status"
      aria-label="Loading tri-pane analysis"
      aria-busy="true"
    >
      {/* Header Controls Skeleton */}
      <div className="flex items-center justify-between bg-background border rounded-lg p-3 shadow-sm">
        <div className="flex items-center gap-4">
          <Skeleton className="h-6 w-48" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-20" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>

      {/* Three-pane layout Skeleton */}
      <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
        {/* Timeline Pane Skeleton */}
        <div className="col-span-3 flex flex-col min-h-0">
          <Card className="flex-1 flex flex-col min-h-0">
            <CardHeader className="pb-3 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-20" />
              </div>
            </CardHeader>
            <CardContent className="flex-1 space-y-4 overflow-hidden">
              {/* Timeline items skeleton */}
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-2 w-2 rounded-full mt-2 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <div className="flex gap-2">
                      <Skeleton className="h-5 w-16" />
                      <Skeleton className="h-5 w-20" />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Graph Pane Skeleton */}
        <div className="col-span-6 flex flex-col min-h-0">
          <Card className="flex-1 flex flex-col min-h-0">
            <CardHeader className="pb-3 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-24" />
              </div>
            </CardHeader>
            <CardContent className="flex-1 relative p-0">
              {/* Graph visualization skeleton */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative w-full h-full">
                  {/* Nodes skeleton */}
                  {Array.from({ length: 12 }).map((_, i) => {
                    const angle = (i / 12) * 2 * Math.PI
                    const radius = 30 + (i % 3) * 15
                    const x = 50 + Math.cos(angle) * radius
                    const y = 50 + Math.sin(angle) * radius
                    return (
                      <Skeleton
                        key={i}
                        className="absolute w-8 h-8 rounded-full"
                        style={{
                          left: `${x}%`,
                          top: `${y}%`,
                          transform: 'translate(-50%, -50%)',
                        }}
                      />
                    )
                  })}
                  {/* Center node */}
                  <Skeleton
                    className="absolute w-12 h-12 rounded-full"
                    style={{
                      left: '50%',
                      top: '50%',
                      transform: 'translate(-50%, -50%)',
                    }}
                  />
                </div>
              </div>
              {/* Graph info skeleton */}
              <div className="absolute top-4 right-4">
                <Skeleton className="h-20 w-24 rounded-lg" />
              </div>
              {/* Legend skeleton */}
              <div className="absolute bottom-4 left-4">
                <Skeleton className="h-24 w-32 rounded-lg" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Map Pane Skeleton */}
        <div className="col-span-3 flex flex-col min-h-0">
          <Card className="flex-1 flex flex-col min-h-0">
            <CardHeader className="pb-3 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-28" />
              </div>
            </CardHeader>
            <CardContent className="flex-1 relative p-0">
              {/* Map skeleton */}
              <div className="absolute inset-0 bg-slate-100 dark:bg-slate-800 rounded-lg">
                {/* Grid lines */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-1/2 left-0 right-0 h-px bg-slate-400" />
                  <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-400" />
                </div>
                {/* Map markers skeleton */}
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton
                    key={i}
                    className="absolute w-6 h-6 rounded-full"
                    style={{
                      left: `${20 + (i % 3) * 30}%`,
                      top: `${25 + Math.floor(i / 3) * 40}%`,
                    }}
                  />
                ))}
              </div>
              {/* Map controls skeleton */}
              <div className="absolute top-4 right-4 flex flex-col gap-2">
                <Skeleton className="h-8 w-8 rounded-md" />
                <Skeleton className="h-8 w-8 rounded-md" />
                <Skeleton className="h-8 w-8 rounded-md" />
              </div>
              {/* Legend skeleton */}
              <div className="absolute bottom-4 left-4">
                <Skeleton className="h-28 w-28 rounded-lg" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Screen reader loading text */}
      <span className="sr-only">Loading analysis data, please wait...</span>
    </div>
  )
}
