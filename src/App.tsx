import React from 'react'
import GameCanvas from './components/GameCanvas'
import './App.css'

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100">
      <GameCanvas />
    </div>
  )
}

export default App