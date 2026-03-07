/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import React, { useState, useEffect } from 'react'
import { useQuery } from '@apollo/client/react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import {
  GET_STRATEGIC_PLANS,
  GET_STRATEGIC_PLAN_DETAILS,
} from './graphql/queries'
import StrategyWall from './components/StrategyWall'
import HealthSignals from './components/HealthSignals'
import TraceabilityGraph from './components/TraceabilityGraph'
import DecisionLog from './components/DecisionLog'
import CommitmentsRegister from './components/CommitmentsRegister'

export default function MissionControlPage() {
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState('EXEC')

  const { data: listData, loading: listLoading } = useQuery(
    GET_STRATEGIC_PLANS,
    {
      variables: { filter: { status: 'ACTIVE' } },
    }
  )

  const { data: detailData, loading: detailLoading } = useQuery(
    GET_STRATEGIC_PLAN_DETAILS,
    {
      variables: { id: selectedPlanId },
      skip: !selectedPlanId,
    }
  )

  useEffect(() => {
    if (listData?.strategicPlans?.data?.length > 0 && !selectedPlanId) {
      setSelectedPlanId(listData.strategicPlans.data[0].id)
    }
  }, [listData, selectedPlanId])

  return (
    <div className="container mx-auto p-6 space-y-8 min-h-screen bg-background">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mission Control</h1>
          <p className="text-muted-foreground">One cockpit for reality.</p>
        </div>
        <div className="flex gap-4">
          <select
            value={userRole}
            onChange={e => setUserRole(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm bg-background"
            aria-label="Select Role View"
          >
            <option value="EXEC">Exec View</option>
            <option value="PM">PM View</option>
            <option value="ENG">Eng Lead View</option>
            <option value="IC">IC View</option>
          </select>

          <select
            value={selectedPlanId || ''}
            onChange={e => setSelectedPlanId(e.target.value)}
            disabled={listLoading || !listData?.strategicPlans?.data?.length}
            className="w-[200px] px-3 py-2 border rounded-md text-sm bg-background"
            aria-label="Select Strategic Plan"
          >
            {!selectedPlanId && <option value="">Select Plan</option>}
            {listData?.strategicPlans?.data?.map((plan: any) => (
              <option key={plan.id} value={plan.id}>
                {plan.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <HealthSignals
        progress={detailData?.planProgress}
        kpis={detailData?.strategicPlan?.kpis}
      />

      <Tabs defaultValue="strategy" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="strategy">Strategy Wall</TabsTrigger>
          <TabsTrigger value="commitments">Commitments</TabsTrigger>
          <TabsTrigger value="traceability">Traceability</TabsTrigger>
          <TabsTrigger value="decisions">Decisions</TabsTrigger>
          <TabsTrigger value="health">Deep Health</TabsTrigger>
        </TabsList>

        <TabsContent value="strategy" className="mt-6">
          <StrategyWall
            plan={detailData?.strategicPlan}
            loading={detailLoading}
          />
        </TabsContent>

        <TabsContent value="commitments" className="mt-6">
          <CommitmentsRegister plan={detailData?.strategicPlan} />
        </TabsContent>

        <TabsContent value="traceability" className="mt-6">
          <TraceabilityGraph />
        </TabsContent>

        <TabsContent value="decisions" className="mt-6">
          <DecisionLog plan={detailData?.strategicPlan} />
        </TabsContent>

        <TabsContent value="health" className="mt-6">
          <HealthSignals
            progress={detailData?.planProgress}
            kpis={detailData?.strategicPlan?.kpis}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
