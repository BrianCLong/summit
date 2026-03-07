import React from 'react'
import $ from 'jquery'
export default function App() {
  React.useEffect(() => {
    $('#next').on('click', () => $('#status').text('mapping…'))
  }, [])
  return (
    <div>
      <button id="next">Next</button>
      <div id="status">ready</div>
    </div>
  )
}
