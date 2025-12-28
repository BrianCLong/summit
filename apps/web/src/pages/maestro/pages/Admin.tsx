// =============================================
// Maestro Admin Interface
// =============================================
import React from 'react'
import GatedSurfaceNotice from '@/components/maestro/GatedSurfaceNotice'

export default function Admin() {
  return (
    <div className="p-6">
      <GatedSurfaceNotice
        title="Admin"
        summary="User and tenant management is gated for MVP-3-GA and handled by platform administrators."
      />
    </div>
  )
}
