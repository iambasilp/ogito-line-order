import { useEffect, useRef } from 'react';
import Layout from '@/components/Layout';

const Game = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    // Game constants (Chrome Dino tuned)
    const GRAVITY = 0.8;
    const JUMP_VELOCITY = -12;
    const INITIAL_SPEED = 5;
    const MAX_SPEED = 13;
    const SPAWN_MIN_INTERVAL = 1000; // ms
    const SPAWN_MAX_INTERVAL = 2500; // ms

    // Game state
    let gameState: 'start' | 'playing' | 'gameover' = 'start';
    let score = 0;
    let bestScore = parseInt(localStorage.getItem('bestOgitoScore') || '0', 10);
    let frame = 0;
    let speed = INITIAL_SPEED;
    let nextSpawnTime = 0;

    let player = {
      x: 50,
      y: 0, 
      width: 40,
      height: 65,
      vy: 0,
      isJumping: false,
    };
    
    const GROUND_Y = canvas.height - 30;
    player.y = GROUND_Y - player.height;

    let obstacles: { x: number; y: number; width: number; height: number; type: 'small' | 'large' }[] = [];
    let dirtParticles: { x: number; y: number; size: number }[] = [];

    // Initialize dirt particles
    for (let i = 0; i < 50; i++) {
      dirtParticles.push({
        x: Math.random() * canvas.width,
        y: GROUND_Y + 5 + Math.random() * 15,
        size: Math.random() * 2 + 1
      });
    }

    // Load Logo Image
    const logoImg = new Image();
    logoImg.src = '/logo.png';
    let isLogoLoaded = false;
    logoImg.onload = () => {
      isLogoLoaded = true;
      if (gameState === 'start') {
        drawFrame();
      }
    };

    const resetGame = () => {
      player.y = GROUND_Y - player.height;
      player.vy = 0;
      player.isJumping = false;
      obstacles = [];
      score = 0;
      speed = INITIAL_SPEED;
      frame = 0;
      nextSpawnTime = frame + Math.floor(SPAWN_MIN_INTERVAL / (1000/60)); // approx frames
      gameState = 'playing';
    };

    const jump = () => {
      if (gameState === 'playing' && !player.isJumping) {
        player.vy = JUMP_VELOCITY;
        player.isJumping = true;
      } else if (gameState === 'start' || gameState === 'gameover') {
        resetGame();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        jump();
      }
    };

    const handleCanvasClick = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      jump();
    };

    window.addEventListener('keydown', handleKeyDown);
    canvas.addEventListener('mousedown', handleCanvasClick);
    canvas.addEventListener('touchstart', handleCanvasClick, { passive: false });

    const checkCollision = (rect1: any, rect2: any) => {
      const hitboxReduction = 10;
      return (
        rect1.x + hitboxReduction < rect2.x + rect2.width &&
        rect1.x + rect1.width - hitboxReduction > rect2.x &&
        rect1.y + hitboxReduction < rect2.y + rect2.height &&
        rect1.y + rect1.height - hitboxReduction > rect2.y
      );
    };

    const spawnObstacle = () => {
      const isLarge = Math.random() > 0.6;
      const height = isLarge ? 50 : 35;
      const width = isLarge ? 25 : 18;
      
      // Sometimes spawn multiple cacti
      const count = Math.floor(Math.random() * 3) + 1;
      
      for(let i=0; i<count; i++) {
        obstacles.push({
          x: canvas.width + (i * (width + 4)),
          y: GROUND_Y - height,
          width,
          height,
          type: isLarge ? 'large' : 'small'
        });
      }
    };

    const drawPlayer = () => {
      // Draw Head
      ctx.fillStyle = '#535353';
      ctx.beginPath();
      ctx.arc(player.x + 20, player.y + 10, 10, 0, Math.PI * 2);
      ctx.fill();
      
      // Shirt (where the logo goes)
      const shirtY = player.y + 20;
      if (isLogoLoaded) {
        // Draw shirt background off-white so logo pops
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(player.x, shirtY, 40, 25);
        ctx.drawImage(logoImg, player.x + 2, shirtY + 2, 36, 21);
      } else {
        ctx.fillStyle = '#535353';
        ctx.fillRect(player.x, shirtY, 40, 25);
      }

      // Arms (swinging)
      ctx.fillStyle = '#535353';
      const armSwing = player.isJumping ? 0 : Math.sin(frame * 0.2) * 5;
      // Back arm
      ctx.fillRect(player.x + 15 + armSwing, player.y + 22, 6, 15);
      
      // Legs (animating if on ground)
      const legState = player.isJumping ? 0 : Math.floor(frame / 6) % 2;
      const legY = player.y + 45;
      
      if (legState === 0) {
        // Leg 1 down, Leg 2 up
        ctx.fillRect(player.x + 12, legY, 6, 20);
        ctx.fillRect(player.x + 22, legY, 6, 10);
      } else {
        // Leg 1 up, Leg 2 down
        ctx.fillRect(player.x + 12, legY, 6, 10);
        ctx.fillRect(player.x + 22, legY, 6, 20);
      }

      // Front arm (drawn last so it overlaps the shirt)
      ctx.fillRect(player.x + 25 - armSwing, player.y + 22, 6, 15);
    };

    const drawCactus = (obs: any) => {
      ctx.fillStyle = '#535353';
      // Main stem
      ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
      // Left arm
      ctx.fillRect(obs.x - 8, obs.y + 10, 8, 15);
      ctx.fillRect(obs.x - 8, obs.y + 10, 20, 5);
      // Right arm
      ctx.fillRect(obs.x + obs.width, obs.y + 5, 8, 15);
      ctx.fillRect(obs.x + obs.width - 10, obs.y + 15, 20, 5);
    };

    const drawUI = () => {
      ctx.font = 'bold 20px "Courier New", Courier, monospace';
      ctx.fillStyle = '#535353';
      ctx.textAlign = 'right';
      
      const scoreStr = Math.floor(score).toString().padStart(5, '0');
      const hiStr = bestScore.toString().padStart(5, '0');
      
      ctx.fillText(`HI ${hiStr}  ${scoreStr}`, canvas.width - 20, 30);

      if (gameState === 'start') {
        ctx.textAlign = 'center';
        ctx.fillText("PRESS SPACE TO START", canvas.width / 2, canvas.height / 2);
      }

      if (gameState === 'gameover') {
        ctx.textAlign = 'center';
        ctx.font = 'bold 24px "Courier New", Courier, monospace';
        ctx.fillText("G A M E  O V E R", canvas.width / 2, canvas.height / 2 - 20);
        
        ctx.font = 'bold 16px "Courier New", Courier, monospace';
        ctx.fillText("Press Space or Tap to restart", canvas.width / 2, canvas.height / 2 + 20);
      }
    };

    const drawFrame = () => {
      if (!ctx) return;
      frame++;

      // Clear canvas (Chrome Dino white/off-white)
      ctx.fillStyle = '#f7f7f7';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw Ground
      ctx.beginPath();
      ctx.moveTo(0, GROUND_Y);
      ctx.lineTo(canvas.width, GROUND_Y);
      ctx.strokeStyle = '#535353';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Update & Draw Dirt
      ctx.fillStyle = '#535353';
      dirtParticles.forEach(dirt => {
        if (gameState === 'playing') {
          dirt.x -= speed;
          if (dirt.x < 0) {
            dirt.x = canvas.width;
            dirt.y = GROUND_Y + 2 + Math.random() * 15;
          }
        }
        ctx.fillRect(dirt.x, dirt.y, dirt.size, dirt.size);
      });

      if (gameState === 'playing') {
        score += 0.1; // Score increases naturally over time
        if (speed < MAX_SPEED) {
          speed += 0.002; // Slowly increase speed
        }

        // Update Physics
        player.vy += GRAVITY;
        player.y += player.vy;

        if (player.y >= GROUND_Y - player.height) {
          player.y = GROUND_Y - player.height;
          player.vy = 0;
          player.isJumping = false;
        }

        // Spawn obstacles
        if (frame > nextSpawnTime) {
          spawnObstacle();
          const randomInterval = Math.random() * (SPAWN_MAX_INTERVAL - SPAWN_MIN_INTERVAL) + SPAWN_MIN_INTERVAL;
          // Frames until next spawn (ensure minimum gap of 60 frames so jumps are always possible)
          const minFrames = 60;
          nextSpawnTime = frame + Math.max(minFrames, Math.floor(randomInterval / (1000/60) / (speed / INITIAL_SPEED)));
        }

        // Update Obstacles & Check Collisions
        for (let i = obstacles.length - 1; i >= 0; i--) {
          const obs = obstacles[i];
          obs.x -= speed;

          if (obs.x + obs.width < 0) {
            obstacles.splice(i, 1);
          }

          if (checkCollision(player, obs)) {
            gameState = 'gameover';
            if (Math.floor(score) > bestScore) {
                bestScore = Math.floor(score);
                localStorage.setItem('bestOgitoScore', bestScore.toString());
            }
          }
        }
      }

      // Draw entities
      obstacles.forEach(drawCactus);
      drawPlayer();
      drawUI();

      if (gameState === 'playing' || gameState === 'start') {
        animationFrameId = requestAnimationFrame(drawFrame);
      } else if (gameState === 'gameover') {
        // Draw one final frame for the game over text
        animationFrameId = requestAnimationFrame(drawFrame);
      }
    };

    // Initial draw
    drawFrame();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('keydown', handleKeyDown);
      canvas.removeEventListener('mousedown', handleCanvasClick);
      canvas.removeEventListener('touchstart', handleCanvasClick);
    };
  }, []);

  return (
    <Layout>
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 w-full">
        <div className="w-full max-w-3xl border border-border shadow-md rounded-md overflow-hidden relative select-none touch-none bg-[#f7f7f7]">
          <div className="relative w-full overflow-hidden aspect-[21/9] sm:aspect-[3/1]">
            <canvas 
              ref={canvasRef}
              width={800}
              height={266}
              className="w-full h-full block cursor-pointer"
              style={{ objectFit: 'cover' }}
            />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Game;
