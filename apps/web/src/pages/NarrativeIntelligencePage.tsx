/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import React, { useState, useEffect } from 'react'
import { Card, Title, Text, Metric, Flex, Grid, Badge } from '@tremor/react'

interface NarrativeIntelligencePageProps {}

export const NarrativeIntelligencePage: React.FC<
  NarrativeIntelligencePageProps
> = () => {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<Record<string, unknown> | null>(null)

  useEffect(() => {
    // In a real app, fetch from API
    // fetch('/api/influence-operations/detect/camp-1').then(...)
    setTimeout(() => {
      setData({
        cib: {
          precisionScore: 0.89,
          identifiedBotClusters: [
            { clusterId: 'c1', size: 145, confidence: 0.92 },
            { clusterId: 'c2', size: 56, confidence: 0.85 },
          ],
          anomalies: [
            {
              type: 'amplification',
              description: 'Coordinated retweet burst detected',
              severity: 'high',
            },
          ],
        },
        narrative: {
          amplificationVelocity: 45.2,
          topTopics: [
            { topic: 'election_fraud', frequency: 120 },
            { topic: 'hacked_materials', frequency: 85 },
          ],
        },
      })
      setLoading(false)
    }, 1000)
  }, [])

  if (loading)
    return <div className="p-6">Loading Narrative Intelligence...</div>

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <Title>Narrative Intelligence & Influence Operations</Title>
          <Text>Real-time monitoring of CIB and Narrative Warfare</Text>
        </div>
        <div className="flex space-x-2">
          <Badge color="red">High Alert</Badge>
          <Badge color="blue">Monitoring Active</Badge>
        </div>
      </div>

      <Grid numItems={3} className="gap-6">
        <Card decoration="top" decorationColor="red">
          <Text>CIB Detection Precision</Text>
          <Metric>{(data.cib.precisionScore * 100).toFixed(1)}%</Metric>
          <Text className="mt-2">Benchmark: &gt;85%</Text>
        </Card>
        <Card decoration="top" decorationColor="orange">
          <Text>Identified Bot Clusters</Text>
          <Metric>{data.cib.identifiedBotClusters.length}</Metric>
          <Text className="mt-2">
            Total Bots:{' '}
            {data.cib.identifiedBotClusters.reduce(
              (acc: number, c: any) => acc + c.size,
              0
            )}
          </Text>
        </Card>
        <Card decoration="top" decorationColor="yellow">
          <Text>Amplification Velocity</Text>
          <Metric>{data.narrative.amplificationVelocity}</Metric>
          <Text className="mt-2">Events / Hour</Text>
        </Card>
      </Grid>

      <Grid numItems={2} className="gap-6">
        <Card>
          <Title>Bot Network Clusters</Title>
          <div className="mt-4 space-y-2">
            {data.cib.identifiedBotClusters.map((cluster: any) => (
              <Flex key={cluster.clusterId} className="border-b pb-2">
                <Text>Cluster {cluster.clusterId}</Text>
                <div className="text-right">
                  <Text>{cluster.size} Accounts</Text>
                  <Badge size="xs" color="red">
                    {(cluster.confidence * 100).toFixed(0)}% Conf.
                  </Badge>
                </div>
              </Flex>
            ))}
          </div>
        </Card>

        <Card>
          <Title>Top Narrative Topics</Title>
          <div className="mt-4 space-y-2">
            {data.narrative.topTopics.map((topic: any) => (
              <Flex key={topic.topic} className="border-b pb-2">
                <Text>#{topic.topic}</Text>
                <Text>{topic.frequency} mentions</Text>
              </Flex>
            ))}
          </div>
        </Card>
      </Grid>

      <Card>
        <Title>Recent Anomalies</Title>
        <div className="mt-4">
          {data.cib.anomalies.map((anomaly: any, idx: number) => (
            <div
              key={idx}
              className="p-3 bg-red-50 border border-red-100 rounded mb-2"
            >
              <Flex>
                <Text className="font-bold text-red-800 uppercase">
                  {anomaly.type}
                </Text>
                <Badge color="red">{anomaly.severity}</Badge>
              </Flex>
              <Text className="text-red-700 mt-1">{anomaly.description}</Text>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

export default NarrativeIntelligencePage
