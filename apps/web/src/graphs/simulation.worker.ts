import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  forceRadial,
  forceY,
  forceX,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from 'd3-force'

// Define types locally since we can't easily import from the main file in a worker without complex setup
interface WorkerNode extends SimulationNodeDatum {
  id: string
  x?: number
  y?: number
  fx?: number | null
  fy?: number | null
  index?: number
}

interface WorkerLink extends SimulationLinkDatum<WorkerNode> {
  id: string
  source: string | WorkerNode
  target: string | WorkerNode
}

interface SimulationMessage {
  type: 'init' | 'update' | 'stop' | 'drag'
  nodes?: WorkerNode[]
  links?: WorkerLink[]
  width?: number
  height?: number
  layoutType?: string
  nodeId?: string
  x?: number
  y?: number
}

let simulation: any // Type: Simulation<WorkerNode, WorkerLink>

self.onmessage = (event: MessageEvent<SimulationMessage>) => {
  const { type, nodes, links, width, height, layoutType, nodeId, x, y } =
    event.data

  switch (type) {
    case 'init':
      if (simulation) simulation.stop()

      if (!nodes || !links || !width || !height) return

      // Create simulation
      switch (layoutType) {
        case 'force':
          simulation = forceSimulation(nodes)
            .force(
              'link',
              forceLink(links)
                .id((d: any) => d.id)
                .distance(100)
            )
            .force('charge', forceManyBody().strength(-300))
            .force('center', forceCenter(width / 2, height / 2))
            .force('collision', forceCollide().radius(30))
          break

        case 'radial':
          simulation = forceSimulation(nodes)
            .force(
              'link',
              forceLink(links)
                .id((d: any) => d.id)
                .distance(80)
            )
            .force('charge', forceManyBody().strength(-200))
            .force('radial', forceRadial(150, width / 2, height / 2))
          break

        case 'hierarchic':
          simulation = forceSimulation(nodes)
            .force(
              'link',
              forceLink(links)
                .id((d: any) => d.id)
                .distance(60)
            )
            .force('charge', forceManyBody().strength(-100))
            .force(
              'y',
              forceY<WorkerNode>().y(d => (d.index || 0) * 80 + 100)
            )
            .force('x', forceX(width / 2))
          break

        default:
          simulation = forceSimulation(nodes)
            .force(
              'link',
              forceLink(links).id((d: any) => d.id)
            )
            .force('charge', forceManyBody())
            .force('center', forceCenter(width / 2, height / 2))
      }

      simulation.on('tick', () => {
        // Send positions back to main thread
        // We only need to send id, x, y to minimize data transfer
        const simplifiedNodes = nodes.map(n => ({ id: n.id, x: n.x, y: n.y }))
        self.postMessage({ type: 'tick', nodes: simplifiedNodes })
      })
      break

    case 'drag':
      if (!simulation || !nodeId) return
      const node = simulation.nodes().find((n: WorkerNode) => n.id === nodeId)
      if (node) {
        node.fx = x
        node.fy = y
        simulation.alphaTarget(0.3).restart()
      }
      break

    case 'stop':
      if (simulation) simulation.stop()
      break
  }
}
