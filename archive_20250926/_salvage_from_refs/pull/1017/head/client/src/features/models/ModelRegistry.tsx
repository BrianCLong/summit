import React, { useState } from 'react'

export const ModelRegistry: React.FC = () => {
  const [items, setItems] = useState<any[]>([])
  return (
    <div>
      <button onClick={() => setItems([...items, { id: items.length }])}>Register</button>
      <ul>{items.map((i) => <li key={i.id}>Model {i.id}</li>)}</ul>
    </div>
  )
}

export default ModelRegistry
