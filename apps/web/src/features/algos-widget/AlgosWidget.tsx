/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import React from 'react'
import { Box, Button } from '@mui/material'
import $ from 'jquery'
import { pagerank } from '@intelgraph/graph-algos-js'
import type cytoscape from 'cytoscape'

interface Props {
  cy: cytoscape.Core
  serviceUrl: string
}

interface CytoscapeEvent {
  type: string
}

const AlgosWidget: React.FC<Props> = ({ cy, serviceUrl }) => {
  React.useEffect(() => {
    const handler = (evt: CytoscapeEvent) => console.log('cy event', evt.type)
    $(cy.container()).on('tap', handler)
    return () => {
      $(cy.container()).off('tap', handler)
    }
  }, [cy])

  const runPagerank = async () => {
    const nodes = cy.nodes().map(n => n.id())
    const edges = cy.edges().map(e => [e.source().id(), e.target().id()])
    await pagerank(serviceUrl, { nodes, edges })
  }

  return (
    <Box>
      <Button variant="contained" onClick={runPagerank}>
        Run PageRank
      </Button>
    </Box>
  )
}

export default AlgosWidget
