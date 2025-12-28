// =============================================
// Maestro DLQ & Replay Management
// =============================================
import React from 'react'
import GatedSurfaceNotice from '@/components/maestro/GatedSurfaceNotice'

export default function DLQReplay() {
  return (
    <div className="p-6">
      <GatedSurfaceNotice
        title="DLQ & Replay"
        summary="Dead letter queue and replay management is gated for MVP-3-GA to protect production pipelines."
      />
    </div>
  )
}
