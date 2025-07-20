import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';

interface GameObject {
  x: number;
  y: number;
  width: number;
  height: number;
  type: string;
  color?: string;
  health?: number;
  maxHealth?: number;
  speed?: number;
  direction?: number;
  lastShot?: number;
  pattern?: string;
  phase?: number;
}

interface Projectile {
  x: number;
  y: number;
  width: number;
  height: number;
  speedX: number;
  speedY: number;
  type: string;
  color: string;
}

interface Particle {
  x: number;
  y: number;
  speedX: number;
  speedY: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  
  // Game state
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'paused' | 'levelComplete' | 'gameOver' | 'victory'>('menu');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [bossDefeated, setBossDefeated] = useState(0);

  // Game objects
  const gameStateRef = useRef({
    pencil: { x: 100, y: 300, width: 40, height: 8, velocityY: 0, onGround: false, invulnerable: 0 },
    camera: { x: 0 },
    worldSpeed: 3, // Continuous forward movement
    obstacles: [] as GameObject[],
    enemies: [] as GameObject[],
    bosses: [] as GameObject[],
    projectiles: [] as Projectile[],
    particles: [] as Particle[],
    levelProgress: 0,
    nextObstacle: 0,
    nextEnemy: 0,
    bossActive: false,
    bossSpawned: false,
    levelDistance: 0,
    backgroundOffset: 0
  });

  // Level definitions - 20 levels with 4 boss fights
  const levels = useMemo(() => [
    // Regular levels 1-4
    { name: "Desk Escape", type: "normal", difficulty: 1, background: "#8B4513", obstacleFreq: 120, enemyFreq: 200 },
    { name: "Notebook Valley", type: "normal", difficulty: 1.2, background: "#696969", obstacleFreq: 100, enemyFreq: 180 },
    { name: "Pencil Case Chaos", type: "normal", difficulty: 1.4, background: "#2F4F4F", obstacleFreq: 80, enemyFreq: 160 },
    { name: "Ruler Rapids", type: "normal", difficulty: 1.6, background: "#4682B4", obstacleFreq: 70, enemyFreq: 140 },
    
    // Boss 1 - Teacher
    { name: "Teacher's Wrath", type: "boss", boss: "teacher", background: "#1a1a1a", difficulty: 2 },
    
    // Regular levels 6-9
    { name: "Eraser Wasteland", type: "normal", difficulty: 1.8, background: "#CD853F", obstacleFreq: 60, enemyFreq: 120 },
    { name: "Stapler Storm", type: "normal", difficulty: 2, background: "#483D8B", obstacleFreq: 55, enemyFreq: 110 },
    { name: "Sharpener Maze", type: "normal", difficulty: 2.2, background: "#8B0000", obstacleFreq: 50, enemyFreq: 100 },
    { name: "Calculator Canyon", type: "normal", difficulty: 2.4, background: "#556B2F", obstacleFreq: 45, enemyFreq: 90 },
    
    // Boss 2 - Principal
    { name: "Principal's Office", type: "boss", boss: "principal", background: "#0f0f0f", difficulty: 2.5 },
    
    // Regular levels 11-14
    { name: "Glue Trap Valley", type: "normal", difficulty: 2.6, background: "#9932CC", obstacleFreq: 40, enemyFreq: 80 },
    { name: "Marker Madness", type: "normal", difficulty: 2.8, background: "#B22222", obstacleFreq: 38, enemyFreq: 75 },
    { name: "Compass Chaos", type: "normal", difficulty: 3, background: "#191970", obstacleFreq: 35, enemyFreq: 70 },
    { name: "Protractor Peril", type: "normal", difficulty: 3.2, background: "#8B008B", obstacleFreq: 32, enemyFreq: 65 },
    
    // Boss 3 - Janitor
    { name: "Janitor's Revenge", type: "boss", boss: "janitor", background: "#0a0a0a", difficulty: 3.5 },
    
    // Regular levels 16-19
    { name: "Highlighter Hell", type: "normal", difficulty: 3.6, background: "#FF4500", obstacleFreq: 30, enemyFreq: 60 },
    { name: "Binder Blitz", type: "normal", difficulty: 3.8, background: "#4B0082", obstacleFreq: 28, enemyFreq: 55 },
    { name: "Folder Frenzy", type: "normal", difficulty: 4, background: "#800000", obstacleFreq: 25, enemyFreq: 50 },
    { name: "Backpack Battlefield", type: "normal", difficulty: 4.2, background: "#2F2F2F", obstacleFreq: 22, enemyFreq: 45 },
    
    // Final Boss - School Superintendent
    { name: "Superintendent's Fury", type: "boss", boss: "superintendent", background: "#000000", difficulty: 5 }
  ], []);

  const keys = useRef({ left: false, right: false, up: false, space: false });

  // Input handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch(e.code) {
        case 'ArrowLeft': keys.current.left = true; break;
        case 'ArrowRight': keys.current.right = true; break;
        case 'ArrowUp': 
        case 'Space': 
          keys.current.up = true; 
          e.preventDefault(); 
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch(e.code) {
        case 'ArrowLeft': keys.current.left = false; break;
        case 'ArrowRight': keys.current.right = false; break;
        case 'ArrowUp': 
        case 'Space': 
          keys.current.up = false; 
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Create obstacles
  const createObstacle = useCallback((x: number) => {
    const types = ['scissors', 'stapler', 'eraser', 'ruler', 'sharpener', 'glue', 'calculator'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    const obstacles: { [key: string]: any } = {
      scissors: { width: 30, height: 25, color: '#FF0000' },
      stapler: { width: 35, height: 20, color: '#333333' },
      eraser: { width: 25, height: 15, color: '#FFB6C1' },
      ruler: { width: 40, height: 8, color: '#FFD700' },
      sharpener: { width: 20, height: 20, color: '#C0C0C0' },
      glue: { width: 15, height: 30, color: '#FFFFFF' },
      calculator: { width: 45, height: 35, color: '#000000' }
    };

    const obstacleData = obstacles[type];
    return {
      x,
      y: 400 - obstacleData.height,
      width: obstacleData.width,
      height: obstacleData.height,
      type,
      color: obstacleData.color
    };
  }, []);

  // Create enemies
  const createEnemy = useCallback((x: number) => {
    const types = ['paperball', 'flyingEraser', 'bouncingRuler'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    const enemies: { [key: string]: any } = {
      paperball: { width: 15, height: 15, color: '#FFFFFF', speed: 2, y: 350 },
      flyingEraser: { width: 20, height: 12, color: '#FFB6C1', speed: 1.5, y: 250 },
      bouncingRuler: { width: 30, height: 6, color: '#FFD700', speed: 1, y: 300 }
    };

    const enemyData = enemies[type];
    return {
      x,
      y: enemyData.y,
      width: enemyData.width,
      height: enemyData.height,
      type,
      color: enemyData.color,
      speed: enemyData.speed * (1 + level * 0.1),
      direction: -1
    };
  }, [level]);

  // Create boss
  const createBoss = useCallback((type: string) => {
    const bosses: { [key: string]: any } = {
      teacher: { 
        width: 80, height: 100, color: '#8B4513', health: 50, 
        pattern: 'homework', x: 700, y: 200 
      },
      principal: { 
        width: 90, height: 110, color: '#2F4F4F', health: 75, 
        pattern: 'detention', x: 700, y: 180 
      },
      janitor: { 
        width: 85, height: 105, color: '#696969', health: 100, 
        pattern: 'mop', x: 700, y: 190 
      },
      superintendent: { 
        width: 100, height: 120, color: '#000080', health: 150, 
        pattern: 'policy', x: 700, y: 160 
      }
    };

    const bossData = bosses[type];
    return {
      ...bossData,
      type: 'boss',
      maxHealth: bossData.health,
      lastShot: 0,
      phase: 1
    };
  }, []);

  // Create projectile
  const createProjectile = useCallback((x: number, y: number, targetX: number, targetY: number, type: string) => {
    const dx = targetX - x;
    const dy = targetY - y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const speed = type === 'homework' ? 4 : type === 'detention' ? 5 : type === 'mop' ? 3 : 6;

    const projectiles: { [key: string]: any } = {
      homework: { width: 20, height: 15, color: '#FFFFFF' },
      detention: { width: 25, height: 20, color: '#FF0000' },
      mop: { width: 30, height: 8, color: '#8B4513' },
      policy: { width: 35, height: 25, color: '#000080' }
    };

    const projData = projectiles[type] || projectiles.homework;

    return {
      x, y,
      width: projData.width,
      height: projData.height,
      speedX: (dx / distance) * speed,
      speedY: (dy / distance) * speed,
      type,
      color: projData.color
    };
  }, []);

  // Create particle effect
  const createParticles = useCallback((x: number, y: number, color: string, count: number = 5) => {
    const particles = [];
    for (let i = 0; i < count; i++) {
      particles.push({
        x: x + Math.random() * 20 - 10,
        y: y + Math.random() * 20 - 10,
        speedX: (Math.random() - 0.5) * 4,
        speedY: (Math.random() - 0.5) * 4,
        life: 30,
        maxLife: 30,
        color,
        size: Math.random() * 3 + 1
      });
    }
    return particles;
  }, []);

  // Collision detection
  const checkCollision = useCallback((rect1: any, rect2: any) => {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
  }, []);

  // Start game
  const startGame = useCallback(() => {
    setGameState('playing');
    setScore(0);
    setLives(3);
    setLevel(1);
    setBossDefeated(0);
    
    const state = gameStateRef.current;
    state.pencil = { x: 100, y: 300, width: 40, height: 8, velocityY: 0, onGround: false, invulnerable: 0 };
    state.camera = { x: 0 };
    state.worldSpeed = 3;
    state.obstacles = [];
    state.enemies = [];
    state.bosses = [];
    state.projectiles = [];
    state.particles = [];
    state.levelProgress = 0;
    state.nextObstacle = 0;
    state.nextEnemy = 0;
    state.bossActive = false;
    state.bossSpawned = false;
    state.levelDistance = 0;
    state.backgroundOffset = 0;
  }, []);

  // Next level
  const nextLevel = useCallback(() => {
    if (level >= levels.length) {
      setGameState('victory');
      return;
    }

    setLevel(prev => prev + 1);
    setScore(prev => prev + 1000);
    
    const state = gameStateRef.current;
    state.obstacles = [];
    state.enemies = [];
    state.bosses = [];
    state.projectiles = [];
    state.levelProgress = 0;
    state.nextObstacle = 0;
    state.nextEnemy = 0;
    state.bossActive = false;
    state.bossSpawned = false;
    state.levelDistance = 0;
    state.worldSpeed = Math.min(3 + level * 0.2, 8); // Increase speed each level
    
    setGameState('playing');
  }, [level, levels.length]);

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const gameLoop = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const state = gameStateRef.current;
      const currentLevel = levels[level - 1];

      // Clear canvas
      ctx.fillStyle = currentLevel.background;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Update background
      state.backgroundOffset -= state.worldSpeed * 0.5;
      if (state.backgroundOffset <= -100) state.backgroundOffset = 0;

      // Draw moving background pattern
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      for (let i = 0; i < 10; i++) {
        const x = (i * 100 + state.backgroundOffset) % canvas.width;
        ctx.fillRect(x, 0, 2, canvas.height);
      }

      // Update pencil physics
      const pencil = state.pencil;
      
      // Continuous forward movement - pencil stays in place, world moves
      state.camera.x += state.worldSpeed;
      state.levelDistance += state.worldSpeed;

      // Pencil controls (only up/down movement)
      if (keys.current.up && pencil.onGround) {
        pencil.velocityY = -12;
        pencil.onGround = false;
      }

      // Gravity
      pencil.velocityY += 0.6;
      pencil.y += pencil.velocityY;

      // Ground collision
      if (pencil.y >= 392) {
        pencil.y = 392;
        pencil.velocityY = 0;
        pencil.onGround = true;
      }

      // Keep pencil on screen
      if (pencil.y < 0) {
        pencil.y = 0;
        pencil.velocityY = 0;
      }

      // Update invulnerability
      if (pencil.invulnerable > 0) pencil.invulnerable--;

      // Spawn obstacles and enemies for normal levels
      if (currentLevel.type === 'normal') {
        if (state.levelDistance > state.nextObstacle) {
          state.obstacles.push(createObstacle(state.camera.x + canvas.width));
          state.nextObstacle = state.levelDistance + currentLevel.obstacleFreq / currentLevel.difficulty;
        }

        if (state.levelDistance > state.nextEnemy) {
          state.enemies.push(createEnemy(state.camera.x + canvas.width));
          state.nextEnemy = state.levelDistance + currentLevel.enemyFreq / currentLevel.difficulty;
        }

        // Level completion
        if (state.levelDistance > 2000) {
          setGameState('levelComplete');
          return;
        }
      }

      // Boss level logic
      if (currentLevel.type === 'boss' && !state.bossSpawned) {
        state.bosses.push(createBoss(currentLevel.boss));
        state.bossActive = true;
        state.bossSpawned = true;
      }

      // Update obstacles
      state.obstacles = state.obstacles.filter(obstacle => {
        obstacle.x -= state.worldSpeed;
        
        // Remove off-screen obstacles
        if (obstacle.x + obstacle.width < state.camera.x - 100) return false;

        // Collision with pencil
        if (checkCollision(pencil, obstacle) && pencil.invulnerable === 0) {
          setLives(prev => {
            const newLives = prev - 1;
            if (newLives <= 0) {
              setGameState('gameOver');
            }
            return newLives;
          });
          pencil.invulnerable = 120;
          state.particles.push(...createParticles(pencil.x, pencil.y, '#FF0000'));
        }

        return true;
      });

      // Update enemies
      state.enemies = state.enemies.filter(enemy => {
        enemy.x -= state.worldSpeed;
        enemy.x += enemy.direction * enemy.speed;

        // Bouncing behavior
        if (enemy.type === 'bouncingRuler') {
          enemy.y += Math.sin(Date.now() * 0.01) * 2;
        }

        // Remove off-screen enemies
        if (enemy.x + enemy.width < state.camera.x - 100) return false;

        // Collision with pencil
        if (checkCollision(pencil, enemy) && pencil.invulnerable === 0) {
          setLives(prev => {
            const newLives = prev - 1;
            if (newLives <= 0) {
              setGameState('gameOver');
            }
            return newLives;
          });
          pencil.invulnerable = 120;
          state.particles.push(...createParticles(pencil.x, pencil.y, '#FF0000'));
          return false;
        }

        return true;
      });

      // Update bosses
      state.bosses = state.bosses.filter(boss => {
        boss.x -= state.worldSpeed * 0.5; // Boss moves slower

        // Boss AI and shooting
        const now = Date.now();
        if (now - boss.lastShot > 1000) { // Shoot every second
          const projectile = createProjectile(
            boss.x, 
            boss.y + boss.height / 2, 
            pencil.x, 
            pencil.y, 
            boss.pattern
          );
          state.projectiles.push(projectile);
          boss.lastShot = now;
        }

        // Boss movement patterns
        if (boss.pattern === 'homework') {
          boss.y += Math.sin(now * 0.003) * 2;
        } else if (boss.pattern === 'detention') {
          boss.y += Math.cos(now * 0.004) * 3;
        } else if (boss.pattern === 'mop') {
          boss.x += Math.sin(now * 0.002) * 1;
        }

        // Check if pencil jumped on boss (defeat mechanism)
        if (checkCollision(pencil, boss) && pencil.velocityY > 0 && pencil.invulnerable === 0) {
          boss.health -= 10; // Damage boss when jumped on
          pencil.velocityY = -8; // Bounce pencil up
          state.particles.push(...createParticles(boss.x + boss.width/2, boss.y, '#FFD700', 8));
          
          if (boss.health <= 0) {
            // Boss defeated!
            setBossDefeated(prev => prev + 1);
            setScore(prev => prev + 5000); // Big score bonus
            state.particles.push(...createParticles(boss.x + boss.width/2, boss.y + boss.height/2, '#00FF00', 15));
            setGameState('levelComplete');
            return false; // Remove boss
          }
        }

        // Boss goes off screen = level failed
        if (boss.x + boss.width < state.camera.x - 100) {
          setGameState('gameOver');
          return false;
        }

        return true;
      });

      // Update projectiles
      state.projectiles = state.projectiles.filter(projectile => {
        projectile.x += projectile.speedX;
        projectile.y += projectile.speedY;

        // Remove off-screen projectiles
        if (projectile.x < state.camera.x - 100 || projectile.x > state.camera.x + canvas.width + 100) {
          return false;
        }

        // Collision with pencil
        if (checkCollision(pencil, projectile) && pencil.invulnerable === 0) {
          setLives(prev => {
            const newLives = prev - 1;
            if (newLives <= 0) {
              setGameState('gameOver');
            }
            return newLives;
          });
          pencil.invulnerable = 120;
          state.particles.push(...createParticles(pencil.x, pencil.y, '#FF0000'));
          return false;
        }

        return true;
      });

      // Update particles
      state.particles = state.particles.filter(particle => {
        particle.x += particle.speedX;
        particle.y += particle.speedY;
        particle.life--;
        return particle.life > 0;
      });

      // Draw ground
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(0, 400, canvas.width, 50);

      // Draw obstacles
      state.obstacles.forEach(obstacle => {
        const screenX = obstacle.x - state.camera.x;
        ctx.fillStyle = obstacle.color;
        ctx.fillRect(screenX, obstacle.y, obstacle.width, obstacle.height);
        
        // Add details based on type
        if (obstacle.type === 'scissors') {
          ctx.fillStyle = '#C0C0C0';
          ctx.fillRect(screenX + 5, obstacle.y + 5, 20, 3);
          ctx.fillRect(screenX + 5, obstacle.y + 17, 20, 3);
        } else if (obstacle.type === 'stapler') {
          ctx.fillStyle = '#666666';
          ctx.fillRect(screenX + 5, obstacle.y + 5, 25, 10);
        }
      });

      // Draw enemies
      state.enemies.forEach(enemy => {
        const screenX = enemy.x - state.camera.x;
        ctx.fillStyle = enemy.color;
        
        if (enemy.type === 'paperball') {
          ctx.beginPath();
          ctx.arc(screenX + enemy.width/2, enemy.y + enemy.height/2, enemy.width/2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(screenX, enemy.y, enemy.width, enemy.height);
        }
      });

      // Draw bosses
      state.bosses.forEach(boss => {
        const screenX = boss.x - state.camera.x;
        
        // Boss body
        ctx.fillStyle = boss.color;
        ctx.fillRect(screenX, boss.y, boss.width, boss.height);
        
        // Boss face (angry eyes)
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(screenX + 15, boss.y + 20, 8, 8);
        ctx.fillRect(screenX + boss.width - 23, boss.y + 20, 8, 8);
        
        // Boss health bar
        const healthBarWidth = 100;
        const healthBarHeight = 8;
        const healthBarX = screenX + boss.width/2 - healthBarWidth/2;
        const healthBarY = boss.y - 20;
        
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);
        
        ctx.fillStyle = '#00FF00';
        const healthPercent = boss.health / boss.maxHealth;
        ctx.fillRect(healthBarX, healthBarY, healthBarWidth * healthPercent, healthBarHeight);
        
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.strokeRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);
      });

      // Draw projectiles
      state.projectiles.forEach(projectile => {
        const screenX = projectile.x - state.camera.x;
        ctx.fillStyle = projectile.color;
        ctx.fillRect(screenX, projectile.y, projectile.width, projectile.height);
        
        // Add rotation effect
        ctx.save();
        ctx.translate(screenX + projectile.width/2, projectile.y + projectile.height/2);
        ctx.rotate(Date.now() * 0.01);
        ctx.fillRect(-projectile.width/2, -projectile.height/2, projectile.width, projectile.height);
        ctx.restore();
      });

      // Draw particles
      state.particles.forEach(particle => {
        const screenX = particle.x - state.camera.x;
        const alpha = particle.life / particle.maxLife;
        ctx.fillStyle = particle.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
        ctx.fillRect(screenX, particle.y, particle.size, particle.size);
      });

      // Draw pencil
      const screenPencilX = pencil.x - state.camera.x;
      
      // Pencil body (yellow)
      ctx.fillStyle = pencil.invulnerable > 0 && Math.floor(pencil.invulnerable / 10) % 2 ? '#FFFF00' : '#FFD700';
      ctx.fillRect(screenPencilX, pencil.y, pencil.width - 8, pencil.height);
      
      // Pencil tip (gray)
      ctx.fillStyle = '#808080';
      ctx.fillRect(screenPencilX + pencil.width - 8, pencil.y + 2, 8, pencil.height - 4);
      
      // Pencil eraser (pink)
      ctx.fillStyle = '#FFB6C1';
      ctx.fillRect(screenPencilX - 4, pencil.y + 1, 4, pencil.height - 2);

      // Update score
      setScore(prev => prev + 1);

      animationRef.current = requestAnimationFrame(gameLoop);
    };

    animationRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameState, level, levels, checkCollision, createObstacle, createEnemy, createBoss, createProjectile, createParticles]);

  // Handle level complete
  useEffect(() => {
    if (gameState === 'levelComplete') {
      const timer = setTimeout(() => {
        nextLevel();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [gameState, nextLevel]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={800}
          height={450}
          className="border-2 border-gray-600 bg-black"
        />
        
        {/* Game UI Overlay */}
        {gameState === 'playing' && (
          <div className="absolute top-4 left-4 right-4 flex justify-between items-center text-white font-bold">
            <div className="flex items-center space-x-4">
              <div>Level: {level}</div>
              <div>{levels[level - 1]?.name}</div>
            </div>
            <div className="flex items-center space-x-4">
              <div>Score: {score}</div>
              <div className="flex items-center">
                Lives: {Array.from({length: lives}, (_, i) => (
                  <span key={i} className="text-red-500 ml-1">❤️</span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Menu Screen */}
        {gameState === 'menu' && (
          <div className="absolute inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center text-center">
            <h1 className="text-4xl font-bold mb-4 text-yellow-400">🖊️ PENCIL ESCAPE ADVENTURE</h1>
            <p className="text-lg mb-2">The Ultimate Endless Runner!</p>
            <p className="text-sm mb-6 max-w-md">
              You're a pencil that jumped out of someone's hand! Navigate through 20 challenging levels,
              defeat 4 epic bosses, and escape the classroom forever!
            </p>
            <div className="text-sm mb-6 space-y-1">
              <p><strong>↑ Arrow or Space:</strong> Jump over obstacles</p>
              <p><strong>Goal:</strong> Survive the endless forward movement!</p>
              <p><strong>Features:</strong> 20 levels • 4 boss fights • Realistic physics</p>
            </div>
            <button
              onClick={startGame}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold text-lg transition-colors"
            >
              START ADVENTURE
            </button>
          </div>
        )}

        {/* Level Complete */}
        {gameState === 'levelComplete' && (
          <div className="absolute inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center text-center">
            <h2 className="text-3xl font-bold mb-4 text-green-400">Level Complete!</h2>
            <p className="text-lg mb-2">{levels[level - 1]?.name} Conquered!</p>
            <p className="text-sm">Score: {score}</p>
            <p className="text-sm">Preparing next level...</p>
          </div>
        )}

        {/* Game Over */}
        {gameState === 'gameOver' && (
          <div className="absolute inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center text-center">
            <h2 className="text-3xl font-bold mb-4 text-red-400">Game Over!</h2>
            <p className="text-lg mb-2">You reached Level {level}</p>
            <p className="text-sm mb-6">Final Score: {score}</p>
            <button
              onClick={startGame}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded font-bold transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Victory */}
        {gameState === 'victory' && (
          <div className="absolute inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center text-center">
            <h2 className="text-4xl font-bold mb-4 text-gold-400">🏆 VICTORY! 🏆</h2>
            <p className="text-lg mb-2">You've escaped the classroom!</p>
            <p className="text-sm mb-2">All 20 levels completed!</p>
            <p className="text-sm mb-2">All 4 bosses defeated!</p>
            <p className="text-lg mb-6">Final Score: {score}</p>
            <button
              onClick={startGame}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded font-bold transition-colors"
            >
              Play Again
            </button>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-4 text-center text-sm text-gray-400 max-w-2xl">
        <p>🎮 <strong>Epic Endless Runner:</strong> 20 levels • 4 boss battles • Continuous forward movement</p>
        <p>🖊️ <strong>You are the pencil!</strong> Jump over classroom obstacles and defeat school staff bosses</p>
      </div>
    </div>
  );
};

export default GameCanvas;