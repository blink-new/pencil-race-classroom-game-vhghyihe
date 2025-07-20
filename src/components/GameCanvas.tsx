import React, { useRef, useEffect, useState, useCallback } from 'react'
import * as THREE from 'three'
import { Button } from './ui/button'
import { Pause } from 'lucide-react'

interface GameCanvasProps {
  level: number
  onComplete: (score: number, time: number) => void
  onPause: () => void
}

interface Obstacle {
  mesh: THREE.Mesh
  type: 'scissors' | 'stapler' | 'eraser' | 'ruler' | 'sharpener'
  position: THREE.Vector3
  rotation: THREE.Vector3
  dangerous: boolean
}

const GameCanvas: React.FC<GameCanvasProps> = ({ level, onComplete, onPause }) => {
  const mountRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene>()
  const rendererRef = useRef<THREE.WebGLRenderer>()
  const cameraRef = useRef<THREE.PerspectiveCamera>()
  const pencilRef = useRef<THREE.Group>()
  const animationIdRef = useRef<number>()
  
  const [gameTime, setGameTime] = useState(0)
  const [score, setScore] = useState(0)
  const [isJumping, setIsJumping] = useState(false)
  const [gameStarted, setGameStarted] = useState(false)
  
  // Game state
  const gameStateRef = useRef({
    pencilPosition: new THREE.Vector3(0, 0.5, 0),
    pencilVelocity: new THREE.Vector3(0, 0, 0),
    isGrounded: true,
    obstacles: [] as Obstacle[],
    startTime: Date.now(),
    isGameActive: true
  })

  // Input handling
  const keysRef = useRef({
    w: false, a: false, s: false, d: false,
    ArrowUp: false, ArrowLeft: false, ArrowDown: false, ArrowRight: false,
    space: false
  })

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const key = event.code === 'Space' ? 'space' : event.key.toLowerCase()
    if (key in keysRef.current) {
      keysRef.current[key as keyof typeof keysRef.current] = true
      event.preventDefault()
    }
  }, [])

  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    const key = event.code === 'Space' ? 'space' : event.key.toLowerCase()
    if (key in keysRef.current) {
      keysRef.current[key as keyof typeof keysRef.current] = false
      event.preventDefault()
    }
  }, [])

  // Helper functions for creating 3D objects
  const createTileTexture = useCallback(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 256
    const ctx = canvas.getContext('2d')!
    
    // Create tile pattern
    ctx.fillStyle = '#F5F5DC'
    ctx.fillRect(0, 0, 256, 256)
    ctx.strokeStyle = '#E0E0E0'
    ctx.lineWidth = 2
    ctx.strokeRect(0, 0, 256, 256)
    
    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(10, 15)
    return texture
  }, [])

  const createPencil = useCallback(() => {
    const pencilGroup = new THREE.Group()
    
    // Pencil body (yellow wood)
    const bodyGeometry = new THREE.CylinderGeometry(0.05, 0.05, 1.5, 8)
    const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0xFFD700 })
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
    body.position.y = 0.75
    pencilGroup.add(body)
    
    // Pencil tip (graphite)
    const tipGeometry = new THREE.ConeGeometry(0.05, 0.2, 8)
    const tipMaterial = new THREE.MeshLambertMaterial({ color: 0x2C2C2C })
    const tip = new THREE.Mesh(tipGeometry, tipMaterial)
    tip.position.y = 1.6
    pencilGroup.add(tip)
    
    // Eraser (pink)
    const eraserGeometry = new THREE.CylinderGeometry(0.06, 0.06, 0.15, 8)
    const eraserMaterial = new THREE.MeshLambertMaterial({ color: 0xFF69B4 })
    const eraser = new THREE.Mesh(eraserGeometry, eraserMaterial)
    eraser.position.y = -0.075
    pencilGroup.add(eraser)
    
    // Metal ferrule
    const ferruleGeometry = new THREE.CylinderGeometry(0.055, 0.055, 0.1, 8)
    const ferruleMaterial = new THREE.MeshLambertMaterial({ color: 0xC0C0C0 })
    const ferrule = new THREE.Mesh(ferruleGeometry, ferruleMaterial)
    ferrule.position.y = 0.05
    pencilGroup.add(ferrule)
    
    return pencilGroup
  }, [])

  const createWalls = useCallback((scene: THREE.Scene) => {
    const wallMaterial = new THREE.MeshLambertMaterial({ color: 0xF0F8FF })
    
    // Back wall
    const backWallGeometry = new THREE.PlaneGeometry(20, 8)
    const backWall = new THREE.Mesh(backWallGeometry, wallMaterial)
    backWall.position.set(0, 4, -15)
    scene.add(backWall)
    
    // Side walls
    const sideWallGeometry = new THREE.PlaneGeometry(30, 8)
    const leftWall = new THREE.Mesh(sideWallGeometry, wallMaterial)
    leftWall.position.set(-10, 4, 0)
    leftWall.rotation.y = Math.PI / 2
    scene.add(leftWall)
    
    const rightWall = new THREE.Mesh(sideWallGeometry, wallMaterial)
    rightWall.position.set(10, 4, 0)
    rightWall.rotation.y = -Math.PI / 2
    scene.add(rightWall)
  }, [])

  const createDesk = useCallback(() => {
    const deskGroup = new THREE.Group()
    
    // Desktop
    const desktopGeometry = new THREE.BoxGeometry(2, 0.1, 1.2)
    const desktopMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 })
    const desktop = new THREE.Mesh(desktopGeometry, desktopMaterial)
    desktop.position.y = 1.5
    deskGroup.add(desktop)
    
    // Legs
    const legGeometry = new THREE.BoxGeometry(0.1, 1.5, 0.1)
    const legMaterial = new THREE.MeshLambertMaterial({ color: 0x696969 })
    
    const positions = [
      [-0.9, 0.75, -0.5], [0.9, 0.75, -0.5],
      [-0.9, 0.75, 0.5], [0.9, 0.75, 0.5]
    ]
    
    positions.forEach(pos => {
      const leg = new THREE.Mesh(legGeometry, legMaterial)
      leg.position.set(pos[0], pos[1], pos[2])
      deskGroup.add(leg)
    })
    
    return deskGroup
  }, [])

  const createTeacherDesk = useCallback(() => {
    const deskGroup = new THREE.Group()
    
    const desktopGeometry = new THREE.BoxGeometry(3, 0.15, 1.5)
    const desktopMaterial = new THREE.MeshLambertMaterial({ color: 0x654321 })
    const desktop = new THREE.Mesh(desktopGeometry, desktopMaterial)
    desktop.position.y = 1.5
    deskGroup.add(desktop)
    
    return deskGroup
  }, [])

  const createClassroomFurniture = useCallback((scene: THREE.Scene) => {
    // Create desks
    for (let i = 0; i < 6; i++) {
      const desk = createDesk()
      desk.position.set(
        (i % 3 - 1) * 4,
        0,
        Math.floor(i / 3) * -6 - 3
      )
      scene.add(desk)
    }
    
    // Teacher's desk
    const teacherDesk = createTeacherDesk()
    teacherDesk.position.set(0, 0, -12)
    scene.add(teacherDesk)
  }, [createDesk, createTeacherDesk])

  const createExitDoor = useCallback((scene: THREE.Scene) => {
    // Door frame
    const frameGeometry = new THREE.BoxGeometry(2.2, 4, 0.2)
    const frameMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 })
    const frame = new THREE.Mesh(frameGeometry, frameMaterial)
    frame.position.set(0, 2, 14.9)
    scene.add(frame)
    
    // Door
    const doorGeometry = new THREE.BoxGeometry(2, 3.8, 0.1)
    const doorMaterial = new THREE.MeshLambertMaterial({ color: 0x654321 })
    const door = new THREE.Mesh(doorGeometry, doorMaterial)
    door.position.set(0, 2, 14.8)
    scene.add(door)
    
    // Door handle
    const handleGeometry = new THREE.SphereGeometry(0.05)
    const handleMaterial = new THREE.MeshLambertMaterial({ color: 0xFFD700 })
    const handle = new THREE.Mesh(handleGeometry, handleMaterial)
    handle.position.set(0.8, 2, 14.7)
    scene.add(handle)
  }, [])

  const createClassroom = useCallback((scene: THREE.Scene) => {
    // Floor
    const floorGeometry = new THREE.PlaneGeometry(20, 30)
    const floorMaterial = new THREE.MeshLambertMaterial({ 
      color: 0xF5F5DC,
      map: createTileTexture()
    })
    const floor = new THREE.Mesh(floorGeometry, floorMaterial)
    floor.rotation.x = -Math.PI / 2
    scene.add(floor)
    
    // Walls
    createWalls(scene)
    
    // Desks and classroom furniture
    createClassroomFurniture(scene)
    
    // Exit door
    createExitDoor(scene)
  }, [createTileTexture, createWalls, createClassroomFurniture, createExitDoor])

  const createScissors = useCallback(() => {
    const scissorsGroup = new THREE.Group()
    
    // Blade 1
    const bladeGeometry = new THREE.BoxGeometry(0.05, 0.8, 0.02)
    const bladeMaterial = new THREE.MeshLambertMaterial({ color: 0xC0C0C0 })
    const blade1 = new THREE.Mesh(bladeGeometry, bladeMaterial)
    blade1.position.set(-0.1, 0, 0)
    blade1.rotation.z = 0.2
    scissorsGroup.add(blade1)
    
    const blade2 = new THREE.Mesh(bladeGeometry, bladeMaterial)
    blade2.position.set(0.1, 0, 0)
    blade2.rotation.z = -0.2
    scissorsGroup.add(blade2)
    
    // Handle
    const handleGeometry = new THREE.TorusGeometry(0.15, 0.02, 8, 16)
    const handleMaterial = new THREE.MeshLambertMaterial({ color: 0xFF4500 })
    const handle1 = new THREE.Mesh(handleGeometry, handleMaterial)
    handle1.position.set(-0.1, -0.3, 0)
    scissorsGroup.add(handle1)
    
    const handle2 = new THREE.Mesh(handleGeometry, handleMaterial)
    handle2.position.set(0.1, -0.3, 0)
    scissorsGroup.add(handle2)
    
    return scissorsGroup
  }, [])

  const createStapler = useCallback(() => {
    const staplerGroup = new THREE.Group()
    
    // Base
    const baseGeometry = new THREE.BoxGeometry(0.8, 0.2, 0.4)
    const baseMaterial = new THREE.MeshLambertMaterial({ color: 0x2F2F2F })
    const base = new THREE.Mesh(baseGeometry, baseMaterial)
    staplerGroup.add(base)
    
    // Top
    const topGeometry = new THREE.BoxGeometry(0.7, 0.15, 0.35)
    const topMaterial = new THREE.MeshLambertMaterial({ color: 0x1F1F1F })
    const top = new THREE.Mesh(topGeometry, topMaterial)
    top.position.y = 0.175
    staplerGroup.add(top)
    
    return staplerGroup
  }, [])

  const createEraser = useCallback(() => {
    const eraserGeometry = new THREE.BoxGeometry(0.3, 0.1, 0.8)
    const eraserMaterial = new THREE.MeshLambertMaterial({ color: 0xFF69B4 })
    return new THREE.Mesh(eraserGeometry, eraserMaterial)
  }, [])

  const createRuler = useCallback(() => {
    const rulerGeometry = new THREE.BoxGeometry(2, 0.05, 0.15)
    const rulerMaterial = new THREE.MeshLambertMaterial({ color: 0xFFFFE0 })
    return new THREE.Mesh(rulerGeometry, rulerMaterial)
  }, [])

  const createObstacles = useCallback((scene: THREE.Scene) => {
    const obstacles: Obstacle[] = []
    
    // Scissors (dangerous)
    const scissors = createScissors()
    scissors.position.set(2, 0.2, 5)
    scene.add(scissors)
    obstacles.push({
      mesh: scissors,
      type: 'scissors',
      position: scissors.position.clone(),
      rotation: scissors.rotation.clone(),
      dangerous: true
    })
    
    // Stapler
    const stapler = createStapler()
    stapler.position.set(-3, 0.3, 8)
    scene.add(stapler)
    obstacles.push({
      mesh: stapler,
      type: 'stapler',
      position: stapler.position.clone(),
      rotation: stapler.rotation.clone(),
      dangerous: true
    })
    
    // Erasers (safe to touch)
    for (let i = 0; i < 3; i++) {
      const eraser = createEraser()
      eraser.position.set(
        (Math.random() - 0.5) * 8,
        0.1,
        i * 3 + 2
      )
      scene.add(eraser)
      obstacles.push({
        mesh: eraser,
        type: 'eraser',
        position: eraser.position.clone(),
        rotation: eraser.rotation.clone(),
        dangerous: false
      })
    }
    
    // Rulers
    for (let i = 0; i < 2; i++) {
      const ruler = createRuler()
      ruler.position.set(
        (i === 0 ? -2 : 2),
        0.05,
        i * 4 + 6
      )
      scene.add(ruler)
      obstacles.push({
        mesh: ruler,
        type: 'ruler',
        position: ruler.position.clone(),
        rotation: ruler.rotation.clone(),
        dangerous: false
      })
    }
    
    gameStateRef.current.obstacles = obstacles
  }, [createScissors, createStapler, createEraser, createRuler])

  const checkCollisions = useCallback(() => {
    const pencilPos = gameStateRef.current.pencilPosition
    
    gameStateRef.current.obstacles.forEach(obstacle => {
      const distance = pencilPos.distanceTo(obstacle.position)
      
      if (distance < 0.5) {
        if (obstacle.dangerous) {
          // Hit dangerous obstacle - reset position
          gameStateRef.current.pencilPosition.set(0, 0.5, 0)
          gameStateRef.current.pencilVelocity.set(0, 0, 0)
          setScore(prev => Math.max(0, prev - 10))
        } else {
          // Hit safe obstacle - small score boost
          setScore(prev => prev + 5)
          // Remove the obstacle
          sceneRef.current?.remove(obstacle.mesh)
          gameStateRef.current.obstacles = gameStateRef.current.obstacles.filter(o => o !== obstacle)
        }
      }
    })
  }, [])

  const completeGame = useCallback(() => {
    gameStateRef.current.isGameActive = false
    const finalTime = (Date.now() - gameStateRef.current.startTime) / 1000
    const finalScore = score + Math.max(0, 100 - Math.floor(finalTime))
    onComplete(finalScore, finalTime)
  }, [score, onComplete])

  // Game physics and update loop
  const updateGame = useCallback(() => {
    if (!gameStateRef.current.isGameActive || !pencilRef.current) return
    
    const gameState = gameStateRef.current
    const keys = keysRef.current
    const pencil = pencilRef.current
    const camera = cameraRef.current!
    
    // Movement input
    const moveSpeed = 0.1
    const jumpForce = 0.3
    
    // Horizontal movement
    if (keys.w || keys.ArrowUp) {
      gameState.pencilVelocity.z += moveSpeed
    }
    if (keys.s || keys.ArrowDown) {
      gameState.pencilVelocity.z -= moveSpeed
    }
    if (keys.a || keys.ArrowLeft) {
      gameState.pencilVelocity.x -= moveSpeed
    }
    if (keys.d || keys.ArrowRight) {
      gameState.pencilVelocity.x += moveSpeed
    }
    
    // Jumping
    if ((keys.space) && gameState.isGrounded) {
      gameState.pencilVelocity.y = jumpForce
      gameState.isGrounded = false
      setIsJumping(true)
    }
    
    // Apply gravity
    gameState.pencilVelocity.y -= 0.02
    
    // Update position
    gameState.pencilPosition.add(gameState.pencilVelocity)
    
    // Ground collision
    if (gameState.pencilPosition.y <= 0.5) {
      gameState.pencilPosition.y = 0.5
      gameState.pencilVelocity.y = 0
      gameState.isGrounded = true
      setIsJumping(false)
    }
    
    // Apply friction
    gameState.pencilVelocity.x *= 0.85
    gameState.pencilVelocity.z *= 0.85
    
    // Boundary constraints
    gameState.pencilPosition.x = Math.max(-9, Math.min(9, gameState.pencilPosition.x))
    gameState.pencilPosition.z = Math.max(-14, Math.min(14, gameState.pencilPosition.z))
    
    // Update pencil mesh position
    pencil.position.copy(gameState.pencilPosition)
    
    // Pencil rotation based on movement
    if (gameState.pencilVelocity.length() > 0.01) {
      const angle = Math.atan2(gameState.pencilVelocity.x, gameState.pencilVelocity.z)
      pencil.rotation.y = angle
    }
    
    // Camera follow (third-person)
    const cameraOffset = new THREE.Vector3(0, 3, -4)
    const desiredCameraPosition = gameState.pencilPosition.clone().add(cameraOffset)
    camera.position.lerp(desiredCameraPosition, 0.1)
    camera.lookAt(gameState.pencilPosition)
    
    // Check for obstacle collisions
    checkCollisions()
    
    // Check for exit
    if (gameState.pencilPosition.z > 13) {
      completeGame()
    }
    
    // Update game time
    const currentTime = (Date.now() - gameState.startTime) / 1000
    setGameTime(currentTime)
  }, [checkCollisions, completeGame])

  // Initialize Three.js scene
  useEffect(() => {
    if (!mountRef.current) return

    const mount = mountRef.current

    // Scene setup
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x87CEEB)
    sceneRef.current = scene

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    )
    camera.position.set(0, 3, -4)
    cameraRef.current = camera

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    rendererRef.current = renderer
    mount.appendChild(renderer.domElement)

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(10, 10, 5)
    directionalLight.castShadow = true
    directionalLight.shadow.mapSize.width = 2048
    directionalLight.shadow.mapSize.height = 2048
    scene.add(directionalLight)

    // Create game world
    createClassroom(scene)
    createObstacles(scene)

    // Create pencil
    const pencil = createPencil()
    pencil.position.set(0, 0.5, 0)
    scene.add(pencil)
    pencilRef.current = pencil

    // Start game
    gameStateRef.current.startTime = Date.now()
    setGameStarted(true)

    // Animation loop
    const animate = () => {
      updateGame()
      renderer.render(scene, camera)
      animationIdRef.current = requestAnimationFrame(animate)
    }
    animate()

    // Event listeners
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    // Handle resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current)
      }
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('resize', handleResize)
      if (mount && renderer.domElement) {
        mount.removeChild(renderer.domElement)
      }
      renderer.dispose()
    }
  }, [handleKeyDown, handleKeyUp, createClassroom, createObstacles, createPencil, updateGame])

  return (
    <div className="relative w-full h-screen">
      <div ref={mountRef} className="w-full h-full" />
      
      {/* Game UI Overlay */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-10">
        <div className="bg-black/50 backdrop-blur-sm rounded-lg p-3 text-white">
          <div className="text-sm space-y-1">
            <div>Time: {gameTime.toFixed(1)}s</div>
            <div>Score: {score}</div>
            {isJumping && <div className="text-yellow-400">Jumping!</div>}
          </div>
        </div>
        
        <Button
          onClick={onPause}
          variant="secondary"
          size="sm"
          className="bg-black/50 backdrop-blur-sm border-0 text-white hover:bg-black/70"
        >
          <Pause className="w-4 h-4" />
        </Button>
      </div>
      
      {/* Controls hint */}
      <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-sm rounded-lg p-3 text-white text-sm">
        <div>WASD/Arrows: Move</div>
        <div>SPACE: Jump</div>
        <div>Goal: Reach the door!</div>
      </div>
    </div>
  )
}

export default GameCanvas