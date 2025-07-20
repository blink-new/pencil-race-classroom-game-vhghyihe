import React, { useRef, useEffect, useState, useCallback } from 'react'
import { Button } from './ui/button'
import { Card } from './ui/card'

interface GameObject {
  x: number
  y: number
  width: number
  height: number
  vx?: number
  vy?: number
  type: string
  health?: number
}

interface Level {
  id: number
  name: string
  background: string
  obstacles: GameObject[]
  enemies: GameObject[]
  boss?: GameObject
  scrollSpeed: number
  difficulty: number
}

const LEVELS: Level[] = [
  {
    id: 1,
    name: "Desk Escape",
    background: "#8B4513",
    obstacles: [
      { x: 300, y: 350, width: 40, height: 40, type: "eraser" },
      { x: 500, y: 320, width: 60, height: 20, type: "ruler" },
      { x: 700, y: 340, width: 50, height: 50, type: "scissors" },
    ],
    enemies: [],
    scrollSpeed: 2,
    difficulty: 1
  },
  {
    id: 2,
    name: "Notebook Valley",
    background: "#4A5568",
    obstacles: [
      { x: 250, y: 330, width: 40, height: 40, type: "eraser" },
      { x: 400, y: 310, width: 60, height: 20, type: "ruler" },
      { x: 550, y: 340, width: 50, height: 50, type: "scissors" },
      { x: 750, y: 320, width: 30, height: 30, type: "stapler" },
    ],
    enemies: [
      { x: 600, y: 300, width: 20, height: 20, vx: -1, type: "paperball" }
    ],
    scrollSpeed: 3,
    difficulty: 2
  },
  {
    id: 3,
    name: "Pencil Case Chaos",
    background: "#2D3748",
    obstacles: [
      { x: 200, y: 340, width: 40, height: 40, type: "eraser" },
      { x: 350, y: 300, width: 60, height: 20, type: "ruler" },
      { x: 500, y: 330, width: 50, height: 50, type: "scissors" },
      { x: 650, y: 310, width: 30, height: 30, type: "stapler" },
      { x: 800, y: 340, width: 35, height: 35, type: "sharpener" },
    ],
    enemies: [
      { x: 450, y: 280, width: 20, height: 20, vx: -1.5, type: "paperball" },
      { x: 700, y: 290, width: 20, height: 20, vx: -1, type: "paperball" }
    ],
    scrollSpeed: 4,
    difficulty: 3
  },
  {
    id: 4,
    name: "Teacher's Wrath",
    background: "#1A202C",
    obstacles: [
      { x: 300, y: 330, width: 50, height: 50, type: "scissors" },
      { x: 500, y: 320, width: 30, height: 30, type: "stapler" },
    ],
    enemies: [
      { x: 400, y: 270, width: 20, height: 20, vx: -2, type: "paperball" },
      { x: 600, y: 285, width: 20, height: 20, vx: -1.5, type: "paperball" }
    ],
    boss: { x: 700, y: 200, width: 80, height: 120, health: 5, type: "teacher" },
    scrollSpeed: 5,
    difficulty: 4
  }
]

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'paused' | 'gameOver' | 'levelComplete' | 'victory'>('menu')
  const [currentLevel, setCurrentLevel] = useState(0)
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(3)
  const [player, setPlayer] = useState({ x: 100, y: 350, width: 30, height: 8, vy: 0, onGround: true })
  const [camera, setCamera] = useState({ x: 0 })
  const [levelObjects, setLevelObjects] = useState<GameObject[]>([])
  const [homeworkProjectiles, setHomeworkProjectiles] = useState<GameObject[]>([])
  const [keys, setKeys] = useState({ left: false, right: false, up: false, down: false })

  const level = LEVELS[currentLevel]

  // Initialize level
  useEffect(() => {
    if (level) {
      setLevelObjects([...level.obstacles, ...level.enemies, ...(level.boss ? [level.boss] : [])])
      setHomeworkProjectiles([])
    }
  }, [currentLevel, level])

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'ArrowLeft':
          setKeys(prev => ({ ...prev, left: true }))
          break
        case 'ArrowRight':
          setKeys(prev => ({ ...prev, right: true }))
          break
        case 'ArrowUp':
        case 'Space':
          setKeys(prev => ({ ...prev, up: true }))
          break
        case 'ArrowDown':
          setKeys(prev => ({ ...prev, down: true }))
          break
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'ArrowLeft':
          setKeys(prev => ({ ...prev, left: false }))
          break
        case 'ArrowRight':
          setKeys(prev => ({ ...prev, right: false }))
          break
        case 'ArrowUp':
        case 'Space':
          setKeys(prev => ({ ...prev, up: false }))
          break
        case 'ArrowDown':
          setKeys(prev => ({ ...prev, down: false }))
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  // Collision detection
  const checkCollision = useCallback((rect1: any, rect2: any) => {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y
  }, [])

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') return

    const gameLoop = setInterval(() => {
      // Update player physics
      setPlayer(prev => {
        const newPlayer = { ...prev }
        
        // Horizontal movement
        if (keys.left) newPlayer.x -= 4
        if (keys.right) newPlayer.x += 4
        
        // Jumping
        if (keys.up && newPlayer.onGround) {
          newPlayer.vy = -12
          newPlayer.onGround = false
        }
        
        // Gravity
        newPlayer.vy += 0.8
        newPlayer.y += newPlayer.vy
        
        // Ground collision
        if (newPlayer.y >= 350) {
          newPlayer.y = 350
          newPlayer.vy = 0
          newPlayer.onGround = true
        }
        
        // Keep player in bounds
        newPlayer.x = Math.max(0, Math.min(newPlayer.x, 1200))
        
        return newPlayer
      })

      // Update camera to follow player
      setCamera(prev => ({
        x: Math.max(0, player.x - 400)
      }))

      // Move enemies and check collisions
      setLevelObjects(prev => prev.map(obj => {
        if (obj.type === 'paperball') {
          return { ...obj, x: obj.x + (obj.vx || 0) }
        }
        return obj
      }))

      // Boss behavior - teacher shooting homework
      if (level.boss) {
        const boss = levelObjects.find(obj => obj.type === 'teacher')
        if (boss && Math.random() < 0.02) { // 2% chance per frame to shoot
          setHomeworkProjectiles(prev => [...prev, {
            x: boss.x,
            y: boss.y + 60,
            width: 15,
            height: 20,
            vx: -6,
            type: 'homework'
          }])
        }
      }

      // Update homework projectiles
      setHomeworkProjectiles(prev => 
        prev.map(hw => ({ ...hw, x: hw.x + (hw.vx || 0) }))
           .filter(hw => hw.x > -50) // Remove off-screen projectiles
      )

      // Check collisions
      const playerRect = { x: player.x, y: player.y, width: player.width, height: player.height }
      
      // Check obstacle collisions
      levelObjects.forEach(obj => {
        if (obj.type === 'scissors' || obj.type === 'stapler' || obj.type === 'paperball') {
          const objRect = { x: obj.x, y: obj.y, width: obj.width, height: obj.height }
          if (checkCollision(playerRect, objRect)) {
            setLives(prev => {
              const newLives = prev - 1
              if (newLives <= 0) {
                setGameState('gameOver')
              }
              return newLives
            })
            // Reset player position
            setPlayer(prev => ({ ...prev, x: 100, y: 350 }))
          }
        }
      })

      // Check homework projectile collisions
      homeworkProjectiles.forEach(hw => {
        const hwRect = { x: hw.x, y: hw.y, width: hw.width, height: hw.height }
        if (checkCollision(playerRect, hwRect)) {
          setLives(prev => {
            const newLives = prev - 1
            if (newLives <= 0) {
              setGameState('gameOver')
            }
            return newLives
          })
          // Remove the homework that hit
          setHomeworkProjectiles(prev => prev.filter(p => p !== hw))
        }
      })

      // Check level completion
      if (player.x > 1000) {
        if (currentLevel < LEVELS.length - 1) {
          setCurrentLevel(prev => prev + 1)
          setPlayer({ x: 100, y: 350, width: 30, height: 8, vy: 0, onGround: true })
          setScore(prev => prev + 1000)
          setGameState('levelComplete')
        } else {
          setGameState('victory')
        }
      }
    }, 16) // ~60 FPS

    return () => clearInterval(gameLoop)
  }, [gameState, keys, player, levelObjects, homeworkProjectiles, currentLevel, level, checkCollision])

  // Render game
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.fillStyle = level?.background || '#87CEEB'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw classroom floor
    ctx.fillStyle = '#8B4513'
    ctx.fillRect(-camera.x, 380, 1400, 20)

    // Draw classroom walls
    ctx.fillStyle = '#F5F5DC'
    ctx.fillRect(-camera.x, 0, 1400, 50)
    ctx.fillRect(-camera.x, 350, 1400, 30)

    // Draw finish line
    ctx.fillStyle = '#00FF00'
    ctx.fillRect(1000 - camera.x, 300, 10, 80)
    ctx.fillStyle = '#000'
    ctx.font = '16px Inter'
    ctx.fillText('EXIT', 970 - camera.x, 295)

    // Draw obstacles and enemies
    levelObjects.forEach(obj => {
      const x = obj.x - camera.x
      const y = obj.y

      switch (obj.type) {
        case 'eraser':
          ctx.fillStyle = '#FF69B4'
          ctx.fillRect(x, y, obj.width, obj.height)
          break
        case 'ruler':
          ctx.fillStyle = '#FFD700'
          ctx.fillRect(x, y, obj.width, obj.height)
          break
        case 'scissors':
          ctx.fillStyle = '#C0C0C0'
          ctx.fillRect(x, y, obj.width, obj.height)
          // Draw scissor blades
          ctx.fillStyle = '#FF0000'
          ctx.fillRect(x + 5, y + 5, 15, 5)
          ctx.fillRect(x + 25, y + 5, 15, 5)
          break
        case 'stapler':
          ctx.fillStyle = '#000000'
          ctx.fillRect(x, y, obj.width, obj.height)
          break
        case 'sharpener':
          ctx.fillStyle = '#8B4513'
          ctx.fillRect(x, y, obj.width, obj.height)
          break
        case 'paperball':
          ctx.fillStyle = '#FFFFFF'
          ctx.beginPath()
          ctx.arc(x + obj.width/2, y + obj.height/2, obj.width/2, 0, Math.PI * 2)
          ctx.fill()
          break
        case 'teacher':
          // Draw teacher boss
          ctx.fillStyle = '#8B4513' // Brown for body
          ctx.fillRect(x, y + 40, obj.width, obj.height - 40)
          // Head
          ctx.fillStyle = '#FFDBAC'
          ctx.beginPath()
          ctx.arc(x + obj.width/2, y + 20, 20, 0, Math.PI * 2)
          ctx.fill()
          // Angry eyes
          ctx.fillStyle = '#FF0000'
          ctx.fillRect(x + 25, y + 15, 8, 8)
          ctx.fillRect(x + 45, y + 15, 8, 8)
          // Health bar
          if (obj.health) {
            ctx.fillStyle = '#FF0000'
            ctx.fillRect(x, y - 10, obj.width, 5)
            ctx.fillStyle = '#00FF00'
            ctx.fillRect(x, y - 10, (obj.width * obj.health) / 5, 5)
          }
          break
      }
    })

    // Draw homework projectiles
    homeworkProjectiles.forEach(hw => {
      const x = hw.x - camera.x
      const y = hw.y
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(x, y, hw.width, hw.height)
      ctx.fillStyle = '#000'
      ctx.font = '10px Inter'
      ctx.fillText('HW', x + 2, y + 12)
    })

    // Draw player (pencil)
    const playerX = player.x - camera.x
    const playerY = player.y

    // Pencil body (yellow)
    ctx.fillStyle = '#FFD700'
    ctx.fillRect(playerX, playerY, player.width - 5, player.height)
    
    // Pencil tip (gray)
    ctx.fillStyle = '#808080'
    ctx.fillRect(playerX + player.width - 5, playerY + 2, 5, player.height - 4)
    
    // Eraser (pink)
    ctx.fillStyle = '#FF69B4'
    ctx.fillRect(playerX - 3, playerY + 1, 3, player.height - 2)

  }, [player, camera, levelObjects, homeworkProjectiles, level])

  const startGame = () => {
    setGameState('playing')
    setCurrentLevel(0)
    setScore(0)
    setLives(3)
    setPlayer({ x: 100, y: 350, width: 30, height: 8, vy: 0, onGround: true })
    setCamera({ x: 0 })
  }

  const nextLevel = () => {
    setGameState('playing')
    setPlayer({ x: 100, y: 350, width: 30, height: 8, vy: 0, onGround: true })
    setCamera({ x: 0 })
  }

  const restartGame = () => {
    startGame()
  }

  if (gameState === 'menu') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-blue-100">
        <Card className="p-8 text-center max-w-md">
          <h1 className="text-4xl font-bold text-blue-600 mb-4">🖊️ Pencil Escape</h1>
          <p className="text-gray-600 mb-6">
            You're a pencil that jumped out of someone's hand! Navigate through classroom obstacles, 
            avoid dangerous scissors and staplers, and escape each level. Watch out for the angry teacher boss!
          </p>
          <div className="mb-4">
            <p className="text-sm text-gray-500 mb-2">Controls:</p>
            <p className="text-xs text-gray-400">← → Arrow keys to move</p>
            <p className="text-xs text-gray-400">↑ Arrow or Space to jump</p>
          </div>
          <Button onClick={startGame} className="w-full">
            Start Adventure
          </Button>
        </Card>
      </div>
    )
  }

  if (gameState === 'levelComplete') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-green-50 to-green-100">
        <Card className="p-8 text-center max-w-md">
          <h2 className="text-3xl font-bold text-green-600 mb-4">Level Complete! 🎉</h2>
          <p className="text-gray-600 mb-4">
            Great job escaping {level.name}!
          </p>
          <p className="text-lg font-semibold mb-6">Score: {score}</p>
          <Button onClick={nextLevel} className="w-full">
            Next Level
          </Button>
        </Card>
      </div>
    )
  }

  if (gameState === 'victory') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-yellow-50 to-yellow-100">
        <Card className="p-8 text-center max-w-md">
          <h2 className="text-4xl font-bold text-yellow-600 mb-4">Victory! 🏆</h2>
          <p className="text-gray-600 mb-4">
            Congratulations! You've escaped all the classroom levels and defeated the teacher boss!
          </p>
          <p className="text-xl font-bold mb-6">Final Score: {score}</p>
          <Button onClick={restartGame} className="w-full">
            Play Again
          </Button>
        </Card>
      </div>
    )
  }

  if (gameState === 'gameOver') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-red-50 to-red-100">
        <Card className="p-8 text-center max-w-md">
          <h2 className="text-3xl font-bold text-red-600 mb-4">Game Over 💥</h2>
          <p className="text-gray-600 mb-4">
            The classroom obstacles got you! Try again and be more careful.
          </p>
          <p className="text-lg font-semibold mb-6">Score: {score}</p>
          <Button onClick={restartGame} className="w-full">
            Try Again
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Game UI */}
      <div className="bg-gray-800 text-white p-4 flex justify-between items-center">
        <div className="flex gap-6">
          <span className="font-semibold">Level: {currentLevel + 1} - {level.name}</span>
          <span>Lives: {'❤️'.repeat(lives)}</span>
          <span>Score: {score}</span>
        </div>
        <div className="text-sm text-gray-300">
          Use ← → arrows to move, ↑ to jump
        </div>
      </div>

      {/* Game Canvas */}
      <div className="flex-1 flex items-center justify-center bg-gray-100">
        <canvas
          ref={canvasRef}
          width={800}
          height={400}
          className="border-2 border-gray-300 bg-sky-200"
        />
      </div>
    </div>
  )
}