import { useState, useEffect, useRef } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Trophy, Play, RefreshCw } from 'lucide-react';

const Game = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(() => parseInt(localStorage.getItem('bestOgitoScore') || '0', 10));
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover'>('start');
  
  // Game refs to avoid state dependencies in animation loop
  const gameStateRef = useRef(gameState);
  const scoreRef = useRef(0);
  
  // Update refs when state changes
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let lastTime = 0;

    // Game constants
    const GRAVITY = 0.6;
    const JUMP_VELOCITY = -10;
    const OBSTACLE_SPEED_START = 5;
    const SPAWN_MIN_INTERVAL = 1000; // ms
    const SPAWN_MAX_INTERVAL = 2500; // ms

    // Game variables
    let dino = {
      x: 50,
      y: 0, // Will be set to ground
      width: 60,
      height: 30,
      vy: 0,
      isJumping: false,
    };
    
    // The ground Y position
    const GROUND_Y = canvas.height - 40;
    dino.y = GROUND_Y - dino.height;

    let obstacles: { x: number; y: number; width: number; height: number; speed: number }[] = [];
    let speedMultiplier = 1;
    let nextSpawnTime = 0;

    // Load Logo Image
    const logoImg = new Image();
    logoImg.src = '/logo.png';
    let isLogoLoaded = false;
    logoImg.onload = () => {
      isLogoLoaded = true;
      if (gameStateRef.current === 'start') {
        drawFrame();
      }
    };

    const resetGame = () => {
      dino.y = GROUND_Y - dino.height;
      dino.vy = 0;
      dino.isJumping = false;
      obstacles = [];
      scoreRef.current = 0;
      setScore(0);
      speedMultiplier = 1;
      nextSpawnTime = performance.now() + SPAWN_MIN_INTERVAL;
    };

    const jump = () => {
      if (gameStateRef.current === 'playing' && !dino.isJumping) {
        dino.vy = JUMP_VELOCITY;
        dino.isJumping = true;
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        if (gameStateRef.current === 'playing') {
          jump();
        }
      }
    };

    const handleCanvasClick = (e: MouseEvent | TouchEvent) => {
      e.preventDefault(); // Prevent double firing on touch devices
      if (gameStateRef.current === 'playing') {
        jump();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    canvas.addEventListener('mousedown', handleCanvasClick);
    canvas.addEventListener('touchstart', handleCanvasClick, { passive: false });

    const checkCollision = (rect1: any, rect2: any) => {
      // Small hitbox reduction to make it forgiving
      const hitboxReduction = 5;
      return (
        rect1.x + hitboxReduction < rect2.x + rect2.width &&
        rect1.x + rect1.width - hitboxReduction > rect2.x &&
        rect1.y + hitboxReduction < rect2.y + rect2.height &&
        rect1.y + rect1.height - hitboxReduction > rect2.y
      );
    };

    const spawnObstacle = () => {
      // Random obstacle height (cactus style)
      const height = Math.random() > 0.5 ? 40 : 25;
      const width = 20;
      obstacles.push({
        x: canvas.width,
        y: GROUND_Y - height,
        width,
        height,
        speed: OBSTACLE_SPEED_START * speedMultiplier
      });
    };

    const drawFrame = (time: number = 0) => {
      if (!ctx) return;
      
      lastTime = time;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw Ground
      ctx.fillStyle = '#e2e8f0'; // Tailwind slate-200
      ctx.fillRect(0, GROUND_Y, canvas.width, canvas.height - GROUND_Y);
      
      // Draw horizon line
      ctx.beginPath();
      ctx.moveTo(0, GROUND_Y);
      ctx.lineTo(canvas.width, GROUND_Y);
      ctx.strokeStyle = '#cbd5e1'; // slate-300
      ctx.lineWidth = 2;
      ctx.stroke();

      if (gameStateRef.current === 'playing') {
        // Update Dino physics
        dino.vy += GRAVITY;
        dino.y += dino.vy;

        if (dino.y >= GROUND_Y - dino.height) {
          dino.y = GROUND_Y - dino.height;
          dino.vy = 0;
          dino.isJumping = false;
        }

        // Spawn obstacles
        if (time > nextSpawnTime) {
          spawnObstacle();
          // Calculate next spawn time with some randomness
          const randomInterval = Math.random() * (SPAWN_MAX_INTERVAL - SPAWN_MIN_INTERVAL) + SPAWN_MIN_INTERVAL;
          nextSpawnTime = time + randomInterval / speedMultiplier;
        }

        // Update Obstacles & Check Collisions
        for (let i = obstacles.length - 1; i >= 0; i--) {
          const obs = obstacles[i];
          obs.x -= obs.speed;

          // Remove off-screen obstacles
          if (obs.x + obs.width < 0) {
            obstacles.splice(i, 1);
            scoreRef.current += 10; // 10 points per obstacle cleared
            
            // Periodically update React state (not every frame to save renders)
            if (scoreRef.current % 10 === 0) {
                setScore(scoreRef.current);
            }
            
            // Increase speed slightly every 100 points
            if (scoreRef.current % 100 === 0) {
              speedMultiplier += 0.1;
            }
          }

          // Collision Check
          if (checkCollision(dino, obs)) {
            setGameState('gameover');
            
            // Check best score
            if (scoreRef.current > parseInt(localStorage.getItem('bestOgitoScore') || '0', 10)) {
                localStorage.setItem('bestOgitoScore', scoreRef.current.toString());
                setBestScore(scoreRef.current);
            }
          }
        }
      }

      // Draw Obstacles (Cactus styling)
      ctx.fillStyle = '#10b981'; // Tailwind emerald-500
      obstacles.forEach(obs => {
        // Draw main stem
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
        // Add a little rounded top for style
        ctx.beginPath();
        ctx.arc(obs.x + obs.width/2, obs.y, obs.width/2, Math.PI, 0);
        ctx.fill();
      });

      // Draw Dino (Logo)
      if (isLogoLoaded) {
        ctx.drawImage(logoImg, dino.x, dino.y, dino.width, dino.height);
      } else {
        // Fallback rectangle
        ctx.fillStyle = '#f97316'; // orange-500
        ctx.fillRect(dino.x, dino.y, dino.width, dino.height);
      }
      
      // Continue loop if playing or just drawing start screen
      if (gameStateRef.current === 'playing' || gameStateRef.current === 'start') {
        animationFrameId = requestAnimationFrame(drawFrame);
      } else if (gameStateRef.current === 'gameover') {
        // Draw one last frame to show collision
        animationFrameId = requestAnimationFrame(drawFrame);
      }
    };

    if (gameStateRef.current === 'playing') {
      resetGame();
      lastTime = performance.now();
      animationFrameId = requestAnimationFrame(drawFrame);
    } else if (gameStateRef.current === 'start') {
      // Just draw the initial state
      drawFrame();
    } else if (gameStateRef.current === 'gameover') {
      // Keep drawing to show the game over state statically
      drawFrame();
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('keydown', handleKeyDown);
      canvas.removeEventListener('mousedown', handleCanvasClick);
      canvas.removeEventListener('touchstart', handleCanvasClick);
    };
  }, [gameState]); // Re-run effect when game state transitions

  const startGame = () => {
    setGameState('playing');
  };

  return (
    <Layout>
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 w-full">
        
        <div className="text-center mb-6">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight mb-2">Ogito Runner</h1>
          <p className="text-muted-foreground text-sm sm:text-base max-w-md mx-auto">
            Help Ogito jump the obstacles! Tap the board or press <strong className="font-semibold text-foreground">Space</strong> to jump.
          </p>
        </div>

        <div className="w-full max-w-2xl bg-card border shadow-lg rounded-xl overflow-hidden relative select-none touch-none">
          
          {/* Score Header */}
          <div className="flex justify-between items-center p-4 border-b bg-muted/30">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Score</span>
              <span className="text-2xl font-black text-foreground tabular-nums leading-none">{score}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="flex items-center gap-1 text-xs font-bold text-amber-600 uppercase tracking-wider">
                <Trophy className="h-3.5 w-3.5" /> Best
              </span>
              <span className="text-2xl font-black text-amber-600 tabular-nums leading-none">{bestScore}</span>
            </div>
          </div>

          {/* Game Canvas Container */}
          <div className="relative w-full overflow-hidden bg-[#f8fafc] dark:bg-slate-900 aspect-[21/9] sm:aspect-[3/1]">
            <canvas 
              ref={canvasRef}
              width={800}
              height={266}
              className="w-full h-full block cursor-pointer"
              style={{ objectFit: 'cover' }}
            />
            
            {/* Start Overlay */}
            {gameState === 'start' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 backdrop-blur-[2px] z-10">
                <Button onClick={startGame} size="lg" className="rounded-full px-8 h-12 text-base font-bold shadow-xl hover:scale-105 transition-transform">
                  <Play className="mr-2 h-5 w-5 fill-current" /> Play Now
                </Button>
              </div>
            )}

            {/* Game Over Overlay */}
            {gameState === 'gameover' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm z-10 animate-in fade-in duration-300">
                <h2 className="text-3xl font-black text-foreground mb-1">Game Over!</h2>
                <p className="text-muted-foreground font-medium mb-6">You scored {score} points</p>
                <Button onClick={startGame} size="lg" variant="default" className="rounded-full px-8 h-12 text-base font-bold shadow-xl hover:scale-105 transition-transform">
                  <RefreshCw className="mr-2 h-5 w-5" /> Play Again
                </Button>
              </div>
            )}
          </div>
        </div>

      </div>
    </Layout>
  );
};

export default Game;
