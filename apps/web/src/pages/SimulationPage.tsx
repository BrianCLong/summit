import React from 'react'
import { ScenarioSimulator } from '@/components/narrative/ScenarioSimulator'

const SimulationPage: React.FC = () => {
  return (
    <div className="h-[calc(100vh-4rem)] overflow-y-auto">
      <ScenarioSimulator />
    </div>
  )
}

export default SimulationPage
