import React, { useState } from 'react'
import { Button } from './components/ui/button'
import { Card } from './components/ui/card'
import GameCanvas from './components/GameCanvas'
import { Play, RotateCcw, Trophy, Settings } from 'lucide-react'

function App() {
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'paused' | 'completed'>('menu')
  const [currentLevel, setCurrentLevel] = useState(1)
  const [score, setScore] = useState(0)
  const [bestTime, setBestTime] = useState<number | null>(null)

  const startGame = () => {
    setGameState('playing')
    setScore(0)
  }

  const resetGame = () => {
    setGameState('menu')
    setCurrentLevel(1)
    setScore(0)
  }

  const onGameComplete = (finalScore: number, time: number) => {
    setScore(finalScore)
    if (!bestTime || time < bestTime) {
      setBestTime(time)
    }
    setGameState('completed')
  }

  if (gameState === 'playing') {
    return (
      <div className="w-full h-screen bg-slate-900">
        <GameCanvas 
          level={currentLevel}
          onComplete={onGameComplete}
          onPause={() => setGameState('paused')}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        {/* Game Title */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-slate-800">
            Pencil <span className="text-blue-600">Escape</span>
          </h1>
          <p className="text-slate-600">
            Jump out of the hand and race through the classroom!
          </p>
        </div>

        {/* Main Menu Card */}
        <Card className="p-6 space-y-4 bg-white/80 backdrop-blur-sm border-0 shadow-xl">
          {gameState === 'menu' && (
            <>
              <div className="space-y-3">
                <Button 
                  onClick={startGame}
                  className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-700"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Start Adventure
                </Button>
                
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" className="h-10">
                    <Trophy className="w-4 h-4 mr-2" />
                    Records
                  </Button>
                  <Button variant="outline" className="h-10">
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </Button>
                </div>
              </div>

              {bestTime && (
                <div className="text-center p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-sm text-amber-800">
                    Best Time: <span className="font-semibold">{bestTime.toFixed(1)}s</span>
                  </p>
                </div>
              )}
            </>
          )}

          {gameState === 'completed' && (
            <>
              <div className="text-center space-y-3">
                <div className="text-6xl">🎉</div>
                <h2 className="text-2xl font-bold text-slate-800">Escaped!</h2>
                <p className="text-slate-600">You made it out of the classroom!</p>
                
                <div className="bg-blue-50 p-4 rounded-lg space-y-2">
                  <p className="text-sm text-blue-800">
                    Final Score: <span className="font-semibold">{score}</span>
                  </p>
                  {bestTime && (
                    <p className="text-sm text-blue-800">
                      Best Time: <span className="font-semibold">{bestTime.toFixed(1)}s</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <Button 
                  onClick={startGame}
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Play Again
                </Button>
                
                <Button 
                  onClick={resetGame}
                  variant="outline" 
                  className="w-full h-10"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Main Menu
                </Button>
              </div>
            </>
          )}
        </Card>

        {/* Game Instructions */}
        <Card className="p-4 bg-white/60 backdrop-blur-sm border-0">
          <h3 className="font-semibold text-slate-800 mb-2">How to Play:</h3>
          <ul className="text-sm text-slate-600 space-y-1">
            <li>• Use WASD or Arrow Keys to move</li>
            <li>• Press SPACE to jump over obstacles</li>
            <li>• Avoid scissors, staplers, and other dangers</li>
            <li>• Reach the classroom door to escape!</li>
          </ul>
        </Card>
      </div>
    </div>
  )
}

export default App