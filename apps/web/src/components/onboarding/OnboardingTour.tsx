import React, { useState, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronRight, ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface TourStep {
  targetId: string
  title: string
  content: string
  position?: 'top' | 'right' | 'bottom' | 'left'
}

const steps: TourStep[] = [
  {
    targetId: 'tour-data-sources',
    title: 'Connect Data',
    content: 'Start by connecting your data sources to ingest signals.',
    position: 'right',
  },
  {
    targetId: 'tour-explore',
    title: 'Explore Graph',
    content: 'Visualize relationships and uncover hidden patterns in the graph.',
    position: 'right',
  },
  {
    targetId: 'tour-alerts',
    title: 'Monitor Alerts',
    content: 'Stay on top of critical threats and automated mitigations.',
    position: 'right',
  },
]

export function OnboardingTour() {
  const [currentStep, setCurrentStep] = useState<number>(() => (typeof window !== 'undefined' && !localStorage.getItem('summit-tour-completed')) ? 0 : -1)
  const [coords, setCoords] = useState<{ top: number; left: number; height: number; width: number } | null>(null)
  const [isVisible, setIsVisible] = useState(() => (typeof window !== 'undefined' && !localStorage.getItem('summit-tour-completed')) ? true : false)



  useLayoutEffect(() => {
    if (currentStep >= 0 && currentStep < steps.length && isVisible) {
      const step = steps[currentStep]

      const updateCoords = () => {
          const element = document.getElementById(step.targetId)
          if (element) {
            const rect = element.getBoundingClientRect()
            setCoords({
              top: rect.top,
              left: rect.left,
              height: rect.height,
              width: rect.width,
            })
          }
      }

      updateCoords()

      const timer = setInterval(() => {
          const element = document.getElementById(step.targetId)
          if (element) {
              updateCoords()
              clearInterval(timer)
          }
      }, 500)

      const timeout = setTimeout(() => clearInterval(timer), 5000)

      window.addEventListener('resize', updateCoords)
      window.addEventListener('scroll', updateCoords)

      return () => {
          clearInterval(timer)
          clearTimeout(timeout)
          window.removeEventListener('resize', updateCoords)
          window.removeEventListener('scroll', updateCoords)
      }
    }
  }, [currentStep, isVisible])

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      completeTour()
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const completeTour = () => {
    localStorage.setItem('summit-tour-completed', 'true')
    setIsVisible(false)
  }

  const handleSkip = () => {
    completeTour()
  }

  if (!isVisible || currentStep < 0 || currentStep >= steps.length || !coords) {
    return null
  }

  const step = steps[currentStep]

  const tooltipStyle = {
    top: coords.top + coords.height / 2 - 60,
    left: coords.left + coords.width + 16,
  }

  return createPortal(
    <div className="fixed inset-0 z-50 pointer-events-none">
      <div
        className="absolute inset-0 bg-black/50 transition-all duration-300"
        style={{
          clipPath: `polygon(
            0% 0%,
            0% 100%,
            ${coords.left}px 100%,
            ${coords.left}px ${coords.top}px,
            ${coords.left + coords.width}px ${coords.top}px,
            ${coords.left + coords.width}px ${coords.top + coords.height}px,
            ${coords.left}px ${coords.top + coords.height}px,
            ${coords.left}px 100%,
            100% 100%,
            100% 0%
          )`
        }}
      />

      <div
        className="absolute border-2 border-primary rounded transition-all duration-300 pointer-events-none shadow-[0_0_15px_rgba(59,130,246,0.5)]"
        style={{
            top: coords.top - 4,
            left: coords.left - 4,
            width: coords.width + 8,
            height: coords.height + 8,
        }}
      />

      <div
        className="absolute bg-popover text-popover-foreground rounded-lg shadow-lg border p-4 w-80 pointer-events-auto transition-all duration-300 animate-in fade-in zoom-in-95"
        style={{
            top: tooltipStyle.top,
            left: tooltipStyle.left,
        }}
      >
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold">{step.title}</h3>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleSkip}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          {step.content}
        </p>
        <div className="flex justify-between items-center">
          <div className="flex gap-1">
             {Array.from({ length: steps.length }).map((_, i) => (
                 <div
                    key={i}
                    className={cn(
                        "h-1.5 w-1.5 rounded-full transition-colors",
                        i === currentStep ? "bg-primary" : "bg-muted"
                    )}
                 />
             ))}
          </div>
          <div className="flex gap-2">
            {currentStep > 0 && (
                <Button variant="outline" size="sm" onClick={handlePrev}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
            )}
            <Button size="sm" onClick={handleNext}>
              {currentStep === steps.length - 1 ? 'Finish' : (
                  <>
                    Next <ChevronRight className="h-4 w-4 ml-1" />
                  </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
