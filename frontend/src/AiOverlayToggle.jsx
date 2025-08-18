import React from 'react'
import { useDispatch, useSelector } from 'react-redux'

export default function AiOverlayToggle() {
  const dispatch = useDispatch()
  const enabled = useSelector((s) => s.aiOverlay)

  const toggle = async () => {
    const next = !enabled
    dispatch({ type: 'AI_TOGGLE', payload: next })
    const headers = { 'Content-Type': 'application/json' }
    await fetch('/xai/overlay', {
      method: 'POST',
      headers,
      body: JSON.stringify({ state: next ? 'on' : 'off' })
    })
    if (next) {
      const res = await fetch('/xai/insights/session1')
      const data = await res.json()
      dispatch({ type: 'INSIGHT_NODES', payload: data.nodes })
    } else {
      dispatch({ type: 'INSIGHT_NODES', payload: [] })
    }
  }

  return (
    <button onClick={toggle} data-testid="ai-toggle">
      {enabled ? 'Hide AI Insights' : 'Show AI Insights'}
    </button>
  )
}
