import { useEffect, useRef, useState } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';

let audioCtx: AudioContext | null = null;
const initAudio = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
};

const playSound = (type: 'jump' | 'hit' | 'score' | 'level') => {
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
    // Explosion sound
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(10, audioCtx.currentTime + 0.5);
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.5);
  } else if (type === 'score') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, audioCtx.currentTime);
    osc.frequency.setValueAtTime(1200, audioCtx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.2);
  } else if (type === 'level') {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(400, audioCtx.currentTime);
    osc.frequency.setValueAtTime(600, audioCtx.currentTime + 0.1);
    osc.frequency.setValueAtTime(800, audioCtx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.5);
  }
};

const Game = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover'>('start');
  const [reactScore, setReactScore] = useState(0);
  const [reactBestScore, setReactBestScore] = useState(() => parseInt(localStorage.getItem('bestOgitoScore') || '0', 10));

  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  useEffect(() => {
    let isCancelled = false;
    
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Dynamically set internal width based on CSS size to avoid any distortion while keeping height constant for physics
    const updateCanvasSize = () => {
      const ratio = container.clientWidth / container.clientHeight;
      canvas.height = 300; 
      canvas.width = 300 * ratio;
    };
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    let animationFrameId: number;

    const GRAVITY = 0.8;
    const JUMP_VELOCITY = -13;
    const INITIAL_SPEED = 6;
    const SPAWN_MIN_INTERVAL = 900; 
    const SPAWN_MAX_INTERVAL = 2500; 

    let score = 0;
    let bestScore = parseInt(localStorage.getItem('bestOgitoScore') || '0', 10);
    let frame = 0;
    let speed = INITIAL_SPEED;
    let nextSpawnTime = 0;
    let lastScoreMilestone = 0;
    let currentLevel = 0;
    let shakeFrames = 0;

    const GROUND_Y = canvas.height - 30;

    let player = {
      x: 50,
      y: GROUND_Y - 65, 
      width: 40,
      height: 65,
      vy: 0,
      isJumping: false,
    };
    
    let obstacles: { x: number; y: number; width: number; height: number; type: 'small' | 'large' | 'bird' }[] = [];
    let dirtParticles: { x: number; y: number; size: number }[] = [];
    let juiceParticles: { x: number, y: number, vx: number, vy: number, life: number, maxLife: number, color: string, size: number, type: 'spark' | 'confetti' | 'rain' }[] = [];
    let customerNames = ['OGITO', 'FAST', 'DELIVERY'];
    
    // Fetch top customers dynamically to put on buildings
    const loadCustomers = async () => {
      try {
        const response = await api.get('/customers?limit=15');
        if (response.data && response.data.customers && response.data.customers.length > 0) {
          customerNames = response.data.customers.map((c: any) => c.name.toUpperCase());
        }
      } catch (err) {
        console.error('Failed to load customers for building signs', err);
      }
    };
    loadCustomers();

    let playerTrail: {x: number, y: number, frame: number, isJumping: boolean}[] = [];
    let buildings: { x: number, w: number, h: number, windows: {wx: number, wy: number}[], name: string }[] = [];

    // Initialize background dirt
    for (let i = 0; i < 50; i++) {
      dirtParticles.push({
        x: Math.random() * canvas.width,
        y: GROUND_Y + 5 + Math.random() * 15,
        size: Math.random() * 2 + 1
      });
    }

    const initBuildings = () => {
      buildings = [];
      let curX = 0;
      while(curX < canvas.width + 400) {
        const w = 40 + Math.random() * 60;
        const h = 50 + Math.random() * 100;
        const windows = [];
        for(let i=0; i < 4; i++) {
          if (Math.random() > 0.3) {
            windows.push({ wx: Math.random() * (w - 10), wy: Math.random() * (h - 20) });
          }
        }
        
        const signName = Math.random() > 0.4 ? customerNames[Math.floor(Math.random() * customerNames.length)] : '';
        buildings.push({ x: curX, w, h, windows, name: signName });
        curX += w + Math.random() * 20;
      }
    };
    initBuildings();

    const logoImg = new Image();
    logoImg.src = '/logo.png';
    let isLogoLoaded = false;
    logoImg.onload = () => {
      if (isCancelled) return;
      isLogoLoaded = true;
      if (gameStateRef.current !== 'playing') drawFrame();
    };

    const resetGame = () => {
      player.y = GROUND_Y - player.height;
      player.vy = 0;
      player.isJumping = false;
      obstacles = [];
      juiceParticles = [];
      playerTrail = [];
      score = 0;
      lastScoreMilestone = 0;
      currentLevel = 0;
      shakeFrames = 0;
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

    const handleTouchStart = (e: TouchEvent) => {
      if (e.target === canvas) e.preventDefault(); // Only prevent scroll if touching game
      jump(); // Instant response on mobile!
    };
    const handleTouchEnd = (e: TouchEvent) => {
      if (e.target === canvas) e.preventDefault();
      // Swipe logic not needed since we jump instantly on touch, 
      // but if we ever add swipe-down to duck, we check it here.
    };

    window.addEventListener('keydown', handleKeyDown);
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

    const spawnExplosion = (x: number, y: number) => {
      for(let i = 0; i < 40; i++) {
        juiceParticles.push({
          x: x + 20, y: y + 30,
          vx: (Math.random() - 0.5) * 15,
          vy: (Math.random() - 0.5) * 15,
          life: 30 + Math.random() * 20,
          maxLife: 50,
          color: Math.random() > 0.5 ? '#e74c3c' : '#ffffff',
          size: Math.random() * 5 + 2,
          type: 'spark'
        });
      }
    };

    const spawnConfetti = () => {
      const colors = ['#0984e3', '#fd79a8', '#ffeaa7', '#00b894'];
      for(let i = 0; i < 100; i++) {
        juiceParticles.push({
          x: Math.random() * canvas.width,
          y: canvas.height + 10,
          vx: (Math.random() - 0.5) * 6,
          vy: -(12 + Math.random() * 12),
          life: 80 + Math.random() * 60,
          maxLife: 140,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: Math.random() * 6 + 3,
          type: 'confetti'
        });
      }
    };

    const spawnRain = () => {
      // Multiple rain drops per frame for density
      for(let i=0; i<3; i++) {
        juiceParticles.push({
          x: Math.random() * canvas.width * 1.5, 
          y: -10,
          vx: -3 - Math.random() * 2,
          vy: 15 + Math.random() * 5,
          life: 100,
          maxLife: 100,
          color: 'rgba(116, 185, 255, 0.6)',
          size: Math.random() * 2 + 1,
          type: 'rain'
        });
      }
    };

    const checkCollision = (rect1: any, rect2: any) => {
      const hitboxReductionX = 10;
      const hitboxReductionY = 8;
      return (
        rect1.x + hitboxReductionX < rect2.x + rect2.width &&
        rect1.x + rect1.width - hitboxReductionX > rect2.x &&
        rect1.y + hitboxReductionY < rect2.y + rect2.height &&
        rect1.y + rect1.height - hitboxReductionY > rect2.y
      );
    };

    const spawnObstacle = () => {
      const canSpawnBird = score > 300;
      const typeRoll = Math.random();
      
      if (canSpawnBird && typeRoll > 0.7) {
        const isHigh = Math.random() > 0.5;
        const height = 24;
        const width = 34;
        obstacles.push({
          x: canvas.width,
          y: GROUND_Y - (isHigh ? 75 : 25),
          width,
          height,
          type: 'bird'
        });
      } else {
        const isLarge = Math.random() > 0.5;
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
      }
    };

    const drawPlayer = (mainColor: string, isNightMode: boolean, currentFrame: number, isGhost: boolean = false) => {
      ctx.fillStyle = isGhost ? '#0984e3' : '#ffdbac';
      ctx.beginPath();
      ctx.arc(player.x + 20, player.y + 10, 10, 0, Math.PI * 2);
      ctx.fill();
      
      const shirtY = player.y + 20;
      if (isGhost) {
        ctx.fillRect(player.x, shirtY, 40, 25);
      } else if (isLogoLoaded) {
        ctx.drawImage(logoImg, player.x, shirtY, 40, 25);
      } else {
        ctx.fillStyle = mainColor;
        ctx.fillRect(player.x, shirtY, 40, 25);
      }

      const armSwing = player.isJumping ? 0 : Math.sin(currentFrame * 0.3) * 8;
      
      ctx.fillStyle = isGhost ? '#0984e3' : '#ffdbac';
      ctx.fillRect(player.x + 15 + armSwing, player.y + 22, 6, 15);
      
      const runCycle = player.isJumping ? 0 : Math.floor(currentFrame / 4) % 6;
      const legY = player.y + 45;
      
      ctx.fillStyle = isGhost ? '#0984e3' : (isNightMode ? '#95a5a6' : '#2c3e50');
      
      let l1Height = 20, l2Height = 20;
      let l1Y = legY, l2Y = legY;
      
      if (runCycle === 0 || runCycle === 1) { l1Height = 20; l2Height = 10; }
      else if (runCycle === 2) { l1Height = 15; l2Height = 15; }
      else if (runCycle === 3 || runCycle === 4) { l1Height = 10; l2Height = 20; }
      else if (runCycle === 5) { l1Height = 15; l2Height = 15; }
      
      ctx.fillRect(player.x + 12, l1Y, 6, l1Height);
      ctx.fillRect(player.x + 22, l2Y, 6, l2Height);

      ctx.fillStyle = isGhost ? '#74b9ff' : '#e74c3c';
      ctx.fillRect(player.x + 12, l1Y + l1Height - 4, 10, 4);
      ctx.fillRect(player.x + 22, l2Y + l2Height - 4, 10, 4);

      ctx.fillStyle = isGhost ? '#0984e3' : '#ffdbac';
      ctx.fillRect(player.x + 25 - armSwing, player.y + 22, 6, 15);
    };

    const drawCactus = (obs: any, color: string) => {
      ctx.fillStyle = color;
      ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
      ctx.fillRect(obs.x - 6, obs.y + 10, 6, 12);
      ctx.fillRect(obs.x - 6, obs.y + 10, 16, 4);
      ctx.fillRect(obs.x + obs.width, obs.y + 5, 6, 12);
      ctx.fillRect(obs.x + obs.width - 8, obs.y + 13, 16, 4);
    };

    const drawBird = (obs: any, color: string, currentFrame: number) => {
      ctx.fillStyle = color;
      ctx.fillRect(obs.x + 10, obs.y + 10, 20, 8);
      ctx.fillRect(obs.x + 4, obs.y + 8, 8, 6);
      ctx.fillRect(obs.x, obs.y + 10, 4, 4);
      ctx.fillRect(obs.x + 30, obs.y + 8, 4, 6);

      const flapState = Math.floor(currentFrame / 10) % 2;
      if (flapState === 0) {
        ctx.fillRect(obs.x + 14, obs.y, 10, 10);
      } else {
        ctx.fillRect(obs.x + 14, obs.y + 18, 10, 10);
      }
    };

    const drawFrame = () => {
      if (isCancelled || !ctx) return;
      frame++;

      currentLevel = Math.floor(score / 300);
      const isNightMode = currentLevel % 2 === 1;
      
      const bgColor = isNightMode ? '#18191a' : '#f7f7f7';
      const mainColor = isNightMode ? '#acacac' : '#535353';

      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // SCREEN SHAKE
      if (shakeFrames > 0) {
        ctx.save();
        const dx = (Math.random() - 0.5) * 12;
        const dy = (Math.random() - 0.5) * 12;
        ctx.translate(dx, dy);
        shakeFrames--;
      }

      // Parallax Cityscape
      const buildingColor = isNightMode ? '#242526' : '#e0e0e0';
      const windowColor = isNightMode ? '#f1c40f' : '#ffffff';
      
      buildings.forEach(b => {
        if (gameStateRef.current === 'playing') {
          b.x -= speed * 0.15; // Move slower than ground
        }
        if (b.x + b.w < 0) {
          b.x = canvas.width + Math.random() * 50;
          b.name = Math.random() > 0.4 ? customerNames[Math.floor(Math.random() * customerNames.length)] : '';
        }
        ctx.fillStyle = buildingColor;
        ctx.fillRect(b.x, GROUND_Y - b.h, b.w, b.h);
        
        // Draw Customer Name Neon Sign
        if (b.name && b.w > 20) {
          ctx.save();
          // Translate to the exact horizontal center of the building
          ctx.translate(b.x + b.w / 2, GROUND_Y - b.h + 10);
          ctx.rotate(Math.PI / 2); // Rotate 90 degrees clockwise
          
          // Glow effect for Night Mode
          if (isNightMode) {
            ctx.shadowColor = '#ff9ff3';
            ctx.shadowBlur = 12;
            ctx.fillStyle = '#ffffff'; 
          } else {
            ctx.fillStyle = '#2d3436'; 
          }
          
          const fontSize = Math.min(14, b.w * 0.45); // Scale font to building width
          ctx.font = `bold ${fontSize}px sans-serif`;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle'; // perfectly centers text on the X translation
          
          let displayName = b.name;
          const maxTextWidth = b.h - 20; 
          
          // Truncate neatly if too long
          while(ctx.measureText(displayName).width > maxTextWidth && displayName.length > 0) {
             displayName = displayName.slice(0, -1);
          }
          if (displayName !== b.name && displayName.length > 0) {
             displayName = displayName.slice(0, -1) + '…';
          }
          
          if (displayName.length > 0) {
             ctx.fillText(displayName, 0, 0); 
          }
          ctx.restore();
        }
        
        if (isNightMode) {
          ctx.fillStyle = windowColor;
          b.windows.forEach(w => {
            // Flicker slightly
            if (Math.random() > 0.02) {
                ctx.fillRect(b.x + 5 + w.wx, GROUND_Y - b.h + 10 + w.wy, 4, 6);
            }
          });
        }
      });

      // Ground
      ctx.beginPath();
      ctx.moveTo(0, GROUND_Y);
      ctx.lineTo(canvas.width, GROUND_Y);
      ctx.strokeStyle = mainColor;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Dirt particles
      ctx.fillStyle = mainColor;
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

      // Night Rain
      if (isNightMode && gameStateRef.current === 'playing') {
         if (Math.random() > 0.5) spawnRain();
      }

      if (gameStateRef.current === 'playing') {
        score += 0.1;
        
        const currentMilestone = Math.floor(score / 100);
        if (currentMilestone > lastScoreMilestone) {
          lastScoreMilestone = currentMilestone;
          speed += 0.5; 
          
          if (currentMilestone % 3 === 0) {
            playSound('level');
            spawnConfetti(); // JUICE: Confetti on level up!
          } else {
            playSound('score');
          }
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

          if (obs.type === 'bird') obs.x -= 1.5; 

          if (obs.x + obs.width < 0) obstacles.splice(i, 1);

          if (checkCollision(player, obs)) {
            setGameState('gameover');
            shakeFrames = 15; // JUICE: Screen shake
            spawnExplosion(player.x, player.y); // JUICE: Pixel explosion
            playSound('hit');
            if (Math.floor(score) > bestScore) {
                bestScore = Math.floor(score);
                localStorage.setItem('bestOgitoScore', bestScore.toString());
                setReactBestScore(bestScore);
            }
          }
        }
        
        if (frame % 5 === 0) setReactScore(Math.floor(score));
      }

      // Draw Entities
      obstacles.forEach(obs => {
        if (obs.type === 'bird') {
          drawBird(obs, mainColor, frame);
        } else {
          drawCactus(obs, mainColor);
        }
      });
      
      // Hyperspeed Ghost Trail (JUICE: Level 3+)
      if (currentLevel >= 2 && gameStateRef.current === 'playing') {
        if (frame % 3 === 0) {
            playerTrail.push({x: player.x, y: player.y, frame, isJumping: player.isJumping});
            if (playerTrail.length > 3) playerTrail.shift();
        }
        playerTrail.forEach((t, idx) => {
            ctx.globalAlpha = 0.15 + (idx * 0.1);
            const oldPlayerY = player.y;
            const oldPlayerIsJumping = player.isJumping;
            player.y = t.y;
            player.isJumping = t.isJumping;
            
            drawPlayer('', isNightMode, t.frame, true);
            
            player.y = oldPlayerY;
            player.isJumping = oldPlayerIsJumping;
        });
        ctx.globalAlpha = 1.0;
      }

      if (gameStateRef.current !== 'gameover' || shakeFrames === 0) {
          // If game over, only draw the player if they aren't fully exploded yet
          drawPlayer(mainColor, isNightMode, frame, false);
      }

      // Draw Particles (Explosions, Confetti, Rain)
      for(let i = juiceParticles.length - 1; i >= 0; i--) {
        const p = juiceParticles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        
        if (p.type === 'confetti' || p.type === 'spark') {
            p.vy += 0.4; // Gravity
        }
        
        if (p.life <= 0 || p.y > canvas.height + 20) {
            juiceParticles.splice(i, 1);
            continue;
        }

        ctx.globalAlpha = p.life / p.maxLife;
        ctx.fillStyle = p.color;
        
        if (p.type === 'rain') {
            ctx.fillRect(p.x, p.y, p.size, p.size * 4); // Elongated rain
        } else {
            ctx.fillRect(p.x, p.y, p.size, p.size);
        }
      }
      ctx.globalAlpha = 1.0;

      // Draw Score
      ctx.font = 'bold 20px "Courier New", Courier, monospace';
      ctx.fillStyle = mainColor;
      ctx.textAlign = 'right';
      const scoreStr = Math.floor(score).toString().padStart(5, '0');
      const hiStr = bestScore.toString().padStart(5, '0');
      ctx.fillText(`HI ${hiStr}  ${scoreStr}`, canvas.width - 20, 30);
      
      // Draw Level Indicator
      if (currentLevel > 0) {
          ctx.textAlign = 'center';
          ctx.font = 'bold 16px "Courier New", Courier, monospace';
          ctx.fillText(`LEVEL ${currentLevel + 1}`, canvas.width / 2, 30);
      }

      // Restore Screen Shake Transform
      if (shakeFrames > 0 || (gameStateRef.current === 'gameover' && shakeFrames === 0)) {
         ctx.restore();
      }

      if (gameStateRef.current === 'playing' || juiceParticles.length > 0 || shakeFrames > 0) {
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
      isCancelled = true;
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', updateCanvasSize);
      window.removeEventListener('keydown', handleKeyDown);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [gameState]);

  return (
    <Layout>
      <div className="flex flex-col items-center pt-10 min-h-screen px-4 w-full bg-background">
        
        <div className="w-full max-w-6xl flex flex-col items-center">
          
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold tracking-tight text-foreground uppercase">Brand Runner</h1>
          </div>
          
          <div ref={containerRef} className="w-full border-2 border-border/50 relative overflow-hidden aspect-[21/9] lg:aspect-[4/1] bg-black rounded-xl shadow-2xl">
            <canvas 
              ref={canvasRef}
              className="w-full h-full block"
            />
            
            {/* START SCREEN UI */}
            {gameState === 'start' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 dark:bg-black/80">
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
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 dark:bg-black/80 z-10">
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
