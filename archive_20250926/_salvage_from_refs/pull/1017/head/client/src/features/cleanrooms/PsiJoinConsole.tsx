import React, { useState } from 'react'

export const PsiJoinConsole: React.FC = () => {
  const [session, setSession] = useState<any>(null)
  return (
    <div>
      <button onClick={() => setSession({ id: 'sess', epsilon: 1 })}>Start Session</button>
      {session && <div>ε {session.epsilon}</div>}
    </div>
  )
}

export default PsiJoinConsole
