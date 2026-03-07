import React from 'react'

interface CursorProps {
  x: number
  y: number
  username?: string
  color?: string
}

const Cursor: React.FC<CursorProps> = ({ x, y, username, color = '#f00' }) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      pointerEvents: 'none',
      zIndex: 100,
      transition: 'left 0.1s linear, top 0.1s linear',
    }}
  >
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ transform: 'rotate(-15deg)' }}
    >
      <path
        d="M5.5 3.5L18.5 12.5L11.5 13.5L8.5 19.5L5.5 3.5Z"
        fill={color}
        stroke="white"
        strokeWidth="1.5"
      />
    </svg>
    {username && (
      <div
        style={{
          backgroundColor: color,
          color: 'white',
          padding: '2px 6px',
          borderRadius: '4px',
          fontSize: '12px',
          whiteSpace: 'nowrap',
          marginTop: '4px',
        }}
      >
        {username}
      </div>
    )}
  </div>
)

interface CursorsLayerProps {
  cursors: Map<string, any>
}

export const CursorsLayer: React.FC<CursorsLayerProps> = ({ cursors }) => {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      {Array.from(cursors.entries()).map(([connectionId, cursor]) => (
        <Cursor
          key={connectionId}
          x={cursor.x}
          y={cursor.y}
          username={cursor.username}
          color="#ff5722" // Could generate color based on user ID
        />
      ))}
    </div>
  )
}
