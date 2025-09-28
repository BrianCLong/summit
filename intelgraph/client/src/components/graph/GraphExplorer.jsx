import React, { useRef, useEffect, useState } from 'react'
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Tooltip,
  Fab,
  Button,
  Alert,
} from '@mui/material'
import {
  ZoomIn,
  ZoomOut,
  CenterFocusStrong,
  Add,
  Refresh,
} from '@mui/icons-material'
import { useParams } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { setGraphData, addNode, addEdge } from '../../store/slices/graphSlice'

function GraphExplorer() {
  const { id } = useParams()
  const dispatch = useDispatch()
  const canvasRef = useRef(null)
  const { nodes, edges } = useSelector((state) => state.graph)
  const [loading, setLoading] = useState(false)

  const sampleNodes = [
    { id: '1', label: 'John Doe', type: 'PERSON', x: 100, y: 100 },
    { id: '2', label: 'Acme Corp', type: 'ORGANIZATION', x: 300, y: 150 },
    { id: '3', label: 'New York', type: 'LOCATION', x: 200, y: 250 },
    { id: '4', label: 'Document A', type: 'DOCUMENT', x: 400, y: 200 },
  ]

  const sampleEdges = [
    { id: 'e1', source: '1', target: '2', label: 'WORKS_FOR' },
    { id: 'e2', source: '1', target: '3', label: 'LOCATED_AT' },
    { id: 'e3', source: '2', target: '4', label: 'OWNS' },
  ]

  useEffect(() => {
    dispatch(setGraphData({ nodes: sampleNodes, edges: sampleEdges }))
  }, [dispatch])

  useEffect(() => {
    if (canvasRef.current && nodes.length > 0) {
      drawGraph()
    }
  }, [nodes, edges])

  const drawGraph = () => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    ctx.strokeStyle = '#999'
    ctx.lineWidth = 2
    edges.forEach((edge) => {
      const sourceNode = nodes.find((node) => node.id === edge.source)
      const targetNode = nodes.find((node) => node.id === edge.target)

      if (sourceNode && targetNode) {
        ctx.beginPath()
        ctx.moveTo(sourceNode.x, sourceNode.y)
        ctx.lineTo(targetNode.x, targetNode.y)
        ctx.stroke()

        const midX = (sourceNode.x + targetNode.x) / 2
        const midY = (sourceNode.y + targetNode.y) / 2
        ctx.fillStyle = '#666'
        ctx.font = '12px Arial'
        ctx.textAlign = 'center'
        ctx.fillText(edge.label, midX, midY - 8)
      }
    })

    nodes.forEach((node) => {
      ctx.beginPath()
      ctx.arc(node.x, node.y, 28, 0, Math.PI * 2)
      ctx.fillStyle = '#1976d2'
      ctx.fill()
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 3
      ctx.stroke()
      ctx.fillStyle = '#fff'
      ctx.font = '12px Arial'
      ctx.textAlign = 'center'
      ctx.fillText(node.label, node.x, node.y + 4)
    })
  }

  const handleAddNode = () => {
    const newId = (nodes.length + 1).toString()
    dispatch(
      addNode({
        id: newId,
        label: `Entity ${newId}`,
        type: 'GENERATED',
        x: 120 + nodes.length * 40,
        y: 160 + nodes.length * 30,
      }),
    )
    if (nodes.length > 0) {
      dispatch(
        addEdge({
          id: `e${edges.length + 1}`,
          source: newId,
          target: nodes[0].id,
          label: 'LINKED_TO',
        }),
      )
    }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Graph Explorer
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Investigation Context: {id || 'Ad-hoc Exploration'}
          </Typography>
        </Box>
        <Button variant="outlined" startIcon={<Refresh />} onClick={() => setLoading(true)}>
          Refresh Data
        </Button>
      </Box>

      <Alert severity="info" sx={{ mb: 2 }}>
        This is a basic graph visualization. Click "Add Node" to add entities, or use the zoom controls.
      </Alert>

      <Paper
        sx={{
          flexGrow: 1,
          position: 'relative',
          overflow: 'hidden',
          minHeight: 500,
        }}
        elevation={2}
      >
        <canvas
          ref={canvasRef}
          width={800}
          height={500}
          style={{
            width: '100%',
            height: '100%',
            background: '#fafafa',
          }}
        />

        <Box
          sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
          }}
        >
          <Tooltip title="Zoom In">
            <IconButton size="small" sx={{ bgcolor: 'white' }}>
              <ZoomIn />
            </IconButton>
          </Tooltip>
          <Tooltip title="Zoom Out">
            <IconButton size="small" sx={{ bgcolor: 'white' }}>
              <ZoomOut />
            </IconButton>
          </Tooltip>
          <Tooltip title="Center Graph">
            <IconButton size="small" sx={{ bgcolor: 'white' }}>
              <CenterFocusStrong />
            </IconButton>
          </Tooltip>
        </Box>

        <Fab color="primary" sx={{ position: 'absolute', bottom: 16, right: 16 }} onClick={handleAddNode}>
          <Add />
        </Fab>
      </Paper>

      <Box sx={{ mt: 2, display: 'flex', gap: 4 }}>
        <Typography variant="body2" color="text.secondary">
          Nodes: {nodes.length}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Edges: {edges.length}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Status: {loading ? 'Refreshing…' : 'Ready'}
        </Typography>
      </Box>
    </Box>
  )
}

export default GraphExplorer
