// @ts-nocheck
import type { Meta, StoryObj } from '@storybook/react'
import React from 'react'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '../Tabs'
import { Card, CardContent, CardHeader, CardTitle } from '../Card'
import { tokenVar } from '@/theme/tokens'

const meta: Meta<typeof Tabs> = {
  title: 'Design System/Tabs',
  component: Tabs,
}

export default meta
type Story = StoryObj<typeof Tabs>

export const DefaultTabs: Story = {
  render: () => (
    <Tabs defaultValue="overview">
      <TabsList className="grid w-[360px] grid-cols-3">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="signals">Signals</TabsTrigger>
        <TabsTrigger value="audit">Audit</TabsTrigger>
      </TabsList>
      <TabsContent value="overview">
        <Card style={{ marginTop: tokenVar('ds-space-sm') }}>
          <CardHeader>
            <CardTitle>Activity summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Analysts completed 12 reviews in the last hour.
            </p>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="signals">
        <Card style={{ marginTop: tokenVar('ds-space-sm') }}>
          <CardHeader>
            <CardTitle>Signals</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-4 text-sm text-muted-foreground">
              <li>3 anomalous login attempts</li>
              <li>1 data egress spike</li>
              <li>2 geo-fence violations</li>
            </ul>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="audit">
        <Card style={{ marginTop: tokenVar('ds-space-sm') }}>
          <CardHeader>
            <CardTitle>Audit trail</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Audit events stream to the governance ledger automatically.
            </p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  ),
}
