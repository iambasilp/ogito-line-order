import { useEffect, useRef, useState } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';

// Audio Context Singleton for sounds
let audioCtx: AudioContext | null = null;
const initAudio = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
};

const playSound = (type: 'jump' | 'hit' | 'score') => {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  
  if (type === 'jump') {
    osc.type = 'square';
    osc.frequency.setValueAtTime(300, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
  } else if (type === 'hit') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.2);
  } else if (type === 'score') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, audioCtx.currentTime);
    osc.frequency.setValueAtTime(1200, audioCtx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.2);
  }
};

const Game = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover'>('start');
  const [reactScore, setReactScore] = useState(0);
  const [reactBestScore, setReactBestScore] = useState(() => parseInt(localStorage.getItem('bestOgitoScore') || '0', 10));

  const gameStateRef = useRef(gameState);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    // Game constants
    const GRAVITY = 0.8;
    const JUMP_VELOCITY = -13;
    const INITIAL_SPEED = 6;
    const SPAWN_MIN_INTERVAL = 900; // ms
    const SPAWN_MAX_INTERVAL = 2500; // ms

    let score = 0;
    let bestScore = parseInt(localStorage.getItem('bestOgitoScore') || '0', 10);
    let frame = 0;
    let speed = INITIAL_SPEED;
    let nextSpawnTime = 0;
    let lastScoreMilestone = 0;

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

    for (let i = 0; i < 50; i++) {
      dirtParticles.push({
        x: Math.random() * canvas.width,
        y: GROUND_Y + 5 + Math.random() * 15,
        size: Math.random() * 2 + 1
      });
    }

    const logoImg = new Image();
    logoImg.src = '/logo.png';
    let isLogoLoaded = false;
    logoImg.onload = () => {
      isLogoLoaded = true;
      if (gameStateRef.current === 'start') drawFrame();
    };

    const resetGame = () => {
      player.y = GROUND_Y - player.height;
      player.vy = 0;
      player.isJumping = false;
      obstacles = [];
      score = 0;
      lastScoreMilestone = 0;
      speed = INITIAL_SPEED;
      frame = 0;
      nextSpawnTime = frame + Math.floor(SPAWN_MIN_INTERVAL / (1000/60));
      setReactScore(0);
      setGameState('playing');
    };

    const jump = () => {
      initAudio();
      if (gameStateRef.current === 'playing' && !player.isJumping) {
        player.vy = JUMP_VELOCITY;
        player.isJumping = true;
        playSound('jump');
      } else if (gameStateRef.current === 'gameover') {
        resetGame();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        if (!e.repeat) {
          e.preventDefault();
          jump();
        }
      }
    };

    let touchStartY = 0;
    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      touchStartY = e.touches[0].clientY;
    };
    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      const touchEndY = e.changedTouches[0].clientY;
      if (touchStartY - touchEndY > 30) {
        // Swipe up
        jump();
      } else {
        // Tap
        jump();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

    const checkCollision = (rect1: any, rect2: any) => {
      const hitboxReductionX = 10;
      const hitboxReductionY = 5;
      return (
        rect1.x + hitboxReductionX < rect2.x + rect2.width &&
        rect1.x + rect1.width - hitboxReductionX > rect2.x &&
        rect1.y + hitboxReductionY < rect2.y + rect2.height &&
        rect1.y + rect1.height - hitboxReductionY > rect2.y
      );
    };

    const spawnObstacle = () => {
      const isLarge = Math.random() > 0.6;
      const height = isLarge ? 45 : 30;
      const width = isLarge ? 22 : 16;
      const count = Math.floor(Math.random() * 3) + 1;
      
      for(let i=0; i<count; i++) {
        obstacles.push({
          x: canvas.width + (i * (width + 6)),
          y: GROUND_Y - height,
          width,
          height,
          type: isLarge ? 'large' : 'small'
        });
      }
    };

    const drawPlayer = () => {
      // Skin tone head
      ctx.fillStyle = '#ffdbac';
      ctx.beginPath();
      ctx.arc(player.x + 20, player.y + 10, 10, 0, Math.PI * 2);
      ctx.fill();
      
      // Shirt (where the logo goes)
      const shirtY = player.y + 20;
      if (isLogoLoaded) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(player.x, shirtY, 40, 25);
        ctx.drawImage(logoImg, player.x + 2, shirtY + 2, 36, 21);
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(player.x, shirtY, 40, 25);
      }

      const armSwing = player.isJumping ? 0 : Math.sin(frame * 0.3) * 8;
      
      // Back Arm (Skin tone)
      ctx.fillStyle = '#ffdbac';
      ctx.fillRect(player.x + 15 + armSwing, player.y + 22, 6, 15);
      
      // Legs (animating if on ground) - 6 frames mapped to sin wave
      const runCycle = player.isJumping ? 0 : Math.floor(frame / 4) % 6;
      const legY = player.y + 45;
      
      // Dark trousers
      ctx.fillStyle = '#2c3e50';
      
      let l1Height = 20, l2Height = 20;
      let l1Y = legY, l2Y = legY;
      
      // Map the 6 frames to different leg heights to simulate running
      if (runCycle === 0 || runCycle === 1) { l1Height = 20; l2Height = 10; }
      else if (runCycle === 2) { l1Height = 15; l2Height = 15; }
      else if (runCycle === 3 || runCycle === 4) { l1Height = 10; l2Height = 20; }
      else if (runCycle === 5) { l1Height = 15; l2Height = 15; }
      
      // Leg 1
      ctx.fillRect(player.x + 12, l1Y, 6, l1Height);
      // Leg 2
      ctx.fillRect(player.x + 22, l2Y, 6, l2Height);

      // Sneakers
      ctx.fillStyle = '#e74c3c';
      ctx.fillRect(player.x + 12, l1Y + l1Height - 4, 10, 4);
      ctx.fillRect(player.x + 22, l2Y + l2Height - 4, 10, 4);

      // Front Arm
      ctx.fillStyle = '#ffdbac';
      ctx.fillRect(player.x + 25 - armSwing, player.y + 22, 6, 15);
    };

    const drawCactus = (obs: any) => {
      ctx.fillStyle = '#535353'; // Match Chrome Dino obstacle color
      ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
      ctx.fillRect(obs.x - 6, obs.y + 10, 6, 12);
      ctx.fillRect(obs.x - 6, obs.y + 10, 16, 4);
      ctx.fillRect(obs.x + obs.width, obs.y + 5, 6, 12);
      ctx.fillRect(obs.x + obs.width - 8, obs.y + 13, 16, 4);
    };

    const drawFrame = () => {
      if (!ctx) return;
      frame++;

      ctx.fillStyle = '#f7f7f7';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.beginPath();
      ctx.moveTo(0, GROUND_Y);
      ctx.lineTo(canvas.width, GROUND_Y);
      ctx.strokeStyle = '#535353';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#535353';
      dirtParticles.forEach(dirt => {
        if (gameStateRef.current === 'playing') {
          dirt.x -= speed;
          if (dirt.x < 0) {
            dirt.x = canvas.width;
            dirt.y = GROUND_Y + 2 + Math.random() * 15;
          }
        }
        ctx.fillRect(dirt.x, dirt.y, dirt.size, dirt.size);
      });

      if (gameStateRef.current === 'playing') {
        score += 0.1;
        
        // Difficulty progression based on score milestone
        const currentMilestone = Math.floor(score / 100);
        if (currentMilestone > lastScoreMilestone) {
          lastScoreMilestone = currentMilestone;
          speed += 0.5; // Game gets slightly faster every 100 points
          playSound('score');
        }

        player.vy += GRAVITY;
        player.y += player.vy;

        if (player.y >= GROUND_Y - player.height) {
          player.y = GROUND_Y - player.height;
          player.vy = 0;
          player.isJumping = false;
        }

        if (frame > nextSpawnTime) {
          spawnObstacle();
          const randomInterval = Math.random() * (SPAWN_MAX_INTERVAL - SPAWN_MIN_INTERVAL) + SPAWN_MIN_INTERVAL;
          const minFrames = 60;
          nextSpawnTime = frame + Math.max(minFrames, Math.floor(randomInterval / (1000/60) / (speed / INITIAL_SPEED)));
        }

        for (let i = obstacles.length - 1; i >= 0; i--) {
          const obs = obstacles[i];
          obs.x -= speed;

          if (obs.x + obs.width < 0) {
            obstacles.splice(i, 1);
          }

          if (checkCollision(player, obs)) {
            setGameState('gameover');
            playSound('hit');
            if (Math.floor(score) > bestScore) {
                bestScore = Math.floor(score);
                localStorage.setItem('bestOgitoScore', bestScore.toString());
                setReactBestScore(bestScore);
            }
          }
        }
        
        // React UI score sync (throttled to avoid re-rendering every frame)
        if (frame % 5 === 0) {
            setReactScore(Math.floor(score));
        }
      }

      obstacles.forEach(drawCactus);
      drawPlayer();
      
      // Draw Canvas-based Classic Score
      ctx.font = 'bold 20px "Courier New", Courier, monospace';
      ctx.fillStyle = '#535353';
      ctx.textAlign = 'right';
      const scoreStr = Math.floor(score).toString().padStart(5, '0');
      const hiStr = bestScore.toString().padStart(5, '0');
      ctx.fillText(`HI ${hiStr}  ${scoreStr}`, canvas.width - 20, 30);

      if (gameStateRef.current === 'playing' || gameStateRef.current === 'start') {
        animationFrameId = requestAnimationFrame(drawFrame);
      } else if (gameStateRef.current === 'gameover') {
        animationFrameId = requestAnimationFrame(drawFrame);
      }
    };

    if (gameStateRef.current === 'playing') {
      resetGame();
      animationFrameId = requestAnimationFrame(drawFrame);
    } else if (gameStateRef.current === 'start') {
      drawFrame();
    } else if (gameStateRef.current === 'gameover') {
      drawFrame();
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('keydown', handleKeyDown);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [gameState]);

  return (
    <Layout>
      <div className="flex flex-col items-center pt-10 min-h-screen px-4 w-full bg-background">
        
        {/* Game Area matching the recommended structure */}
        <div className="w-full max-w-3xl flex flex-col items-center">
          
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-foreground uppercase">Brand Runner</h1>
          </div>
          
          <div className="w-full border-2 border-border/50 bg-[#f7f7f7] relative overflow-hidden aspect-[21/9] sm:aspect-[3/1]">
            <canvas 
              ref={canvasRef}
              width={800}
              height={266}
              className="w-full h-full block"
              style={{ objectFit: 'cover' }}
            />
            
            {/* START SCREEN UI */}
            {gameState === 'start' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80">
                <h2 className="text-xl font-bold uppercase mb-2">BRAND RUNNER</h2>
                <p className="text-sm font-medium mb-6">Jump over obstacles and beat your highest score.</p>
                <Button onClick={() => { initAudio(); setGameState('playing'); }} className="uppercase font-bold tracking-widest px-8 rounded-none">
                  START GAME
                </Button>
                <div className="mt-6 flex flex-col items-center text-xs font-bold text-muted-foreground">
                  <span className="hidden sm:inline">Desktop instruction: SPACE / ↑ TO JUMP</span>
                  <span className="sm:hidden">Mobile instruction: TAP OR SWIPE UP TO JUMP</span>
                </div>
              </div>
            )}
            
            {/* GAME OVER UI */}
            {gameState === 'gameover' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80">
                <h2 className="text-2xl font-black uppercase mb-4 tracking-widest">GAME OVER</h2>
                <div className="flex gap-8 mb-6 font-mono font-bold">
                  <div className="flex flex-col items-center">
                    <span className="text-muted-foreground text-xs">Score</span>
                    <span className="text-xl">{reactScore.toString().padStart(5, '0')}</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-muted-foreground text-xs">Best</span>
                    <span className="text-xl">{reactBestScore.toString().padStart(5, '0')}</span>
                  </div>
                </div>
                <Button onClick={() => setGameState('playing')} className="uppercase font-bold tracking-widest px-8 rounded-none">
                  PLAY AGAIN
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
