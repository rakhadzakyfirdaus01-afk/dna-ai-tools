"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Gamepad2,
  Trophy,
  RotateCcw,
  Play,
  Pause,
  Code2,
  Sparkles,
  Volume2,
  VolumeX,
  Maximize2,
  HelpCircle,
  Zap,
  Flame,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Crosshair,
} from "lucide-react";
import { useLanguage } from "@/components/shared/language-provider";

type GameId = "snake" | "flappy" | "space" | "pong" | "rpg";

type GameMeta = {
  id: GameId;
  title: string;
  genre: string;
  icon: string;
  descId: string;
  descEn: string;
  controlsId: string;
  controlsEn: string;
  difficulty: "Easy" | "Medium" | "Hard";
};

const GAMES: GameMeta[] = [
  {
    id: "snake",
    title: "Cyber Snake Neon",
    genre: "Arcade / Reflex",
    icon: "🐍",
    descId: "Kendalikan ular neon pemangsa partikel energi. Jangan tabrak dinding!",
    descEn: "Control the neon snake to consume digital energy cubes without hitting walls.",
    controlsId: "Tombol Panah / WASD / Virtual D-Pad",
    controlsEn: "Arrow Keys / WASD / Virtual D-Pad",
    difficulty: "Easy",
  },
  {
    id: "flappy",
    title: "Flappy Drone 2077",
    genre: "Physics / Timing",
    icon: "🚀",
    descId: "Terbangkan drone melewati pilar laser energi cyber yang mematikan.",
    descEn: "Fly your cyber drone through deadly electric laser barriers.",
    controlsId: "Spasi / Tap Layar / Tombol Lompat",
    controlsEn: "Spacebar / Screen Tap / Jump Button",
    difficulty: "Hard",
  },
  {
    id: "space",
    title: "Galaxy Defender",
    genre: "Shooter / Action",
    icon: "👾",
    descId: "Tembak jatuh invasi armada alien luar angkasa dengan meriam laser plasma.",
    descEn: "Blast away invading alien spacecraft with plasma cannons.",
    controlsId: "Panah Kiri/Kanan & Spasi (Tembak)",
    controlsEn: "Arrow Left/Right & Spacebar (Shoot)",
    difficulty: "Medium",
  },
  {
    id: "pong",
    title: "Cyber Pong Battle",
    genre: "Sports / Retro",
    icon: "🏓",
    descId: "Duel tenis meja retro melawan bot AI berkecepatan tinggi.",
    descEn: "Fast-paced retro table tennis duel against an intelligent AI bot.",
    controlsId: "Panah Atas/Bawah / Geser Sentuh",
    controlsEn: "Arrow Up/Down / Touch Drag",
    difficulty: "Medium",
  },
  {
    id: "rpg",
    title: "Dungeon Explorer RPG",
    genre: "Text RPG / Choice",
    icon: "⚔️",
    descId: "Petualangan penjelajahan ruang bawah tanah dengan monster dan harta karun.",
    descEn: "Procedural dungeon crawling text adventure with monsters and loot.",
    controlsId: "Klik Pilihan Tombol Aksi",
    controlsEn: "Click Action Choices",
    difficulty: "Easy",
  },
];

export default function AIArcadePage() {
  const { locale } = useLanguage();
  const isEn = locale === "en";
  const router = useRouter();

  const [activeGame, setActiveGame] = useState<GameId>("snake");
  const [score, setScore] = useState(0);
  const [highScores, setHighScores] = useState<Record<string, number>>({});
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // RPG state
  const [rpgLog, setRpgLog] = useState<string[]>([]);
  const [rpgHp, setRpgHp] = useState(100);
  const [rpgGold, setRpgGold] = useState(0);
  const [rpgFloor, setRpgFloor] = useState(1);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Load high scores from LocalStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("dna_arcade_highscores");
      if (stored) {
        setHighScores(JSON.parse(stored));
      }
    } catch {}
  }, []);

  function saveHighScore(game: string, newScore: number) {
    setHighScores((prev) => {
      const current = prev[game] || 0;
      if (newScore > current) {
        const updated = { ...prev, [game]: newScore };
        try {
          localStorage.setItem("dna_arcade_highscores", JSON.stringify(updated));
        } catch {}
        return updated;
      }
      return prev;
    });
  }

  // Web Audio Synth Beeps (Tanpa perlu file audio luar)
  function playBeep(freq = 440, type: OscillatorType = "sine", duration = 0.1) {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {}
  }

  // ==========================================
  // GAME ENGINES (HTML5 Canvas)
  // ==========================================

  // Controls input refs
  const keysRef = useRef<{ [key: string]: boolean }>({});

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
        e.preventDefault();
      }
      keysRef.current[e.key] = true;
    }
    function handleKeyUp(e: KeyboardEvent) {
      keysRef.current[e.key] = false;
    }
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Reset when changing game
  useEffect(() => {
    setIsPlaying(false);
    setIsGameOver(false);
    setScore(0);
    if (activeGame === "rpg") {
      initRpgGame();
    }
  }, [activeGame]);

  // Game Loop Trigger
  useEffect(() => {
    if (!isPlaying || isGameOver || activeGame === "rpg") return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let cleanup = () => {};

    if (activeGame === "snake") {
      cleanup = runSnakeGame(canvas, ctx);
    } else if (activeGame === "flappy") {
      cleanup = runFlappyGame(canvas, ctx);
    } else if (activeGame === "space") {
      cleanup = runSpaceGame(canvas, ctx);
    } else if (activeGame === "pong") {
      cleanup = runPongGame(canvas, ctx);
    }

    return () => {
      cleanup();
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [isPlaying, isGameOver, activeGame]);

  // 1. SNAKE GAME
  function runSnakeGame(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    const gridSize = 20;
    const tileCountX = Math.floor(canvas.width / gridSize);
    const tileCountY = Math.floor(canvas.height / gridSize);

    let snake = [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 },
    ];
    let dx = 1;
    let dy = 0;
    let food = { x: 15, y: 10 };
    let currentScore = 0;
    let lastTime = 0;
    const speed = 90; // ms per frame

    function spawnFood() {
      food = {
        x: Math.floor(Math.random() * tileCountX),
        y: Math.floor(Math.random() * tileCountY),
      };
    }

    function loop(timestamp: number) {
      if (timestamp - lastTime > speed) {
        lastTime = timestamp;

        // Input
        if ((keysRef.current["ArrowUp"] || keysRef.current["w"] || keysRef.current["W"]) && dy === 0) {
          dx = 0;
          dy = -1;
        } else if ((keysRef.current["ArrowDown"] || keysRef.current["s"] || keysRef.current["S"]) && dy === 0) {
          dx = 0;
          dy = 1;
        } else if ((keysRef.current["ArrowLeft"] || keysRef.current["a"] || keysRef.current["A"]) && dx === 0) {
          dx = -1;
          dy = 0;
        } else if ((keysRef.current["ArrowRight"] || keysRef.current["d"] || keysRef.current["D"]) && dx === 0) {
          dx = 1;
          dy = 0;
        }

        // Move
        const head = { x: snake[0].x + dx, y: snake[0].y + dy };

        // Wall Collision
        if (head.x < 0 || head.x >= tileCountX || head.y < 0 || head.y >= tileCountY) {
          playBeep(180, "sawtooth", 0.3);
          setIsGameOver(true);
          setIsPlaying(false);
          saveHighScore("snake", currentScore);
          return;
        }

        // Self collision
        for (let i = 0; i < snake.length; i++) {
          if (snake[i].x === head.x && snake[i].y === head.y) {
            playBeep(180, "sawtooth", 0.3);
            setIsGameOver(true);
            setIsPlaying(false);
            saveHighScore("snake", currentScore);
            return;
          }
        }

        snake.unshift(head);

        // Eat food
        if (head.x === food.x && head.y === food.y) {
          currentScore += 10;
          setScore(currentScore);
          playBeep(650, "sine", 0.1);
          spawnFood();
        } else {
          snake.pop();
        }

        // Draw
        ctx.fillStyle = "#0B0F19";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Grid lines
        ctx.strokeStyle = "rgba(147, 51, 234, 0.08)";
        ctx.lineWidth = 1;
        for (let x = 0; x < canvas.width; x += gridSize) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, canvas.height);
          ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += gridSize) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(canvas.width, y);
          ctx.stroke();
        }

        // Draw Food (Pulsing Neon Ruby)
        ctx.fillStyle = "#EC4899";
        ctx.shadowColor = "#EC4899";
        ctx.shadowBlur = 12;
        ctx.fillRect(food.x * gridSize + 2, food.y * gridSize + 2, gridSize - 4, gridSize - 4);
        ctx.shadowBlur = 0;

        // Draw Snake (Neon Purple/Cyan Gradient)
        snake.forEach((part, idx) => {
          ctx.fillStyle = idx === 0 ? "#A855F7" : "#06B6D4";
          ctx.shadowColor = idx === 0 ? "#A855F7" : "#06B6D4";
          ctx.shadowBlur = idx === 0 ? 10 : 4;
          ctx.fillRect(part.x * gridSize + 1, part.y * gridSize + 1, gridSize - 2, gridSize - 2);
        });
        ctx.shadowBlur = 0;
      }

      animFrameIdRef.current = requestAnimationFrame(loop);
    }

    animFrameIdRef.current = requestAnimationFrame(loop);
    return () => {};
  }

  // 2. FLAPPY GAME
  function runFlappyGame(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    let birdY = canvas.height / 2;
    let birdVelocity = 0;
    const gravity = 0.38;
    const jump = -7;
    let pipes: Array<{ x: number; top: number; bottom: number; passed?: boolean }> = [];
    const pipeWidth = 52;
    const pipeGap = 130;
    let currentScore = 0;
    let frame = 0;

    function addPipe() {
      const topHeight = Math.floor(Math.random() * (canvas.height - pipeGap - 80)) + 40;
      pipes.push({
        x: canvas.width,
        top: topHeight,
        bottom: canvas.height - topHeight - pipeGap,
      });
    }

    let lastJumpState = false;

    function loop() {
      frame++;

      // Input Jump
      const jumpKey = keysRef.current[" "] || keysRef.current["ArrowUp"] || keysRef.current["w"];
      if (jumpKey && !lastJumpState) {
        birdVelocity = jump;
        playBeep(520, "triangle", 0.08);
      }
      lastJumpState = jumpKey;

      birdVelocity += gravity;
      birdY += birdVelocity;

      if (frame % 100 === 0) {
        addPipe();
      }

      // Update Pipes
      for (let i = 0; i < pipes.length; i++) {
        const p = pipes[i];
        p.x -= 2.6;

        // Collision Check (Bird is circle at x=80, y=birdY, radius=14)
        if (
          80 + 14 > p.x &&
          80 - 14 < p.x + pipeWidth &&
          (birdY - 14 < p.top || birdY + 14 > canvas.height - p.bottom)
        ) {
          playBeep(160, "sawtooth", 0.3);
          setIsGameOver(true);
          setIsPlaying(false);
          saveHighScore("flappy", currentScore);
          return;
        }

        // Score Check
        if (p.x + pipeWidth < 80 && !p.passed) {
          p.passed = true;
          currentScore += 1;
          setScore(currentScore);
          playBeep(700, "sine", 0.1);
        }
      }

      pipes = pipes.filter((p) => p.x + pipeWidth > 0);

      // Ceiling & Floor Collision
      if (birdY + 14 >= canvas.height || birdY - 14 <= 0) {
        playBeep(160, "sawtooth", 0.3);
        setIsGameOver(true);
        setIsPlaying(false);
        saveHighScore("flappy", currentScore);
        return;
      }

      // Render
      ctx.fillStyle = "#0A0D18";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw Pipes (Cyber Neon Pillars)
      pipes.forEach((p) => {
        // Top pipe
        ctx.fillStyle = "#3B82F6";
        ctx.shadowColor = "#3B82F6";
        ctx.shadowBlur = 10;
        ctx.fillRect(p.x, 0, pipeWidth, p.top);
        // Bottom pipe
        ctx.fillRect(p.x, canvas.height - p.bottom, pipeWidth, p.bottom);
      });
      ctx.shadowBlur = 0;

      // Draw Drone Bird (Glowing Cyan Orb)
      ctx.fillStyle = "#EC4899";
      ctx.shadowColor = "#EC4899";
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(80, birdY, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      animFrameIdRef.current = requestAnimationFrame(loop);
    }

    animFrameIdRef.current = requestAnimationFrame(loop);
    return () => {};
  }

  // 3. SPACE INVADER SHOOTER
  function runSpaceGame(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    let playerX = canvas.width / 2;
    const playerY = canvas.height - 40;
    let bullets: Array<{ x: number; y: number }> = [];
    let enemies: Array<{ x: number; y: number; hp: number }> = [];
    let currentScore = 0;
    let lastShot = 0;
    let frame = 0;

    function spawnEnemy() {
      enemies.push({
        x: Math.random() * (canvas.width - 40) + 20,
        y: -20,
        hp: 1,
      });
    }

    function loop(timestamp: number) {
      frame++;

      // Player Movement
      if (keysRef.current["ArrowLeft"] || keysRef.current["a"]) playerX -= 6;
      if (keysRef.current["ArrowRight"] || keysRef.current["d"]) playerX += 6;
      playerX = Math.max(20, Math.min(canvas.width - 20, playerX));

      // Player Shoot
      if (keysRef.current[" "] && timestamp - lastShot > 200) {
        bullets.push({ x: playerX, y: playerY - 10 });
        playBeep(880, "square", 0.05);
        lastShot = timestamp;
      }

      // Spawning
      if (frame % 50 === 0) spawnEnemy();

      // Bullets
      bullets.forEach((b) => (b.y -= 9));
      bullets = bullets.filter((b) => b.y > 0);

      // Enemies
      enemies.forEach((e) => (e.y += 2.2));

      // Collision Bullets vs Enemies
      for (let bIdx = bullets.length - 1; bIdx >= 0; bIdx--) {
        for (let eIdx = enemies.length - 1; eIdx >= 0; eIdx--) {
          const b = bullets[bIdx];
          const e = enemies[eIdx];
          if (b && e && Math.abs(b.x - e.x) < 22 && Math.abs(b.y - e.y) < 22) {
            bullets.splice(bIdx, 1);
            enemies.splice(eIdx, 1);
            currentScore += 20;
            setScore(currentScore);
            playBeep(420, "sine", 0.1);
            break;
          }
        }
      }

      // Enemy hit bottom or player
      for (const e of enemies) {
        if (e.y >= canvas.height - 20 || (Math.abs(e.x - playerX) < 26 && Math.abs(e.y - playerY) < 26)) {
          playBeep(140, "sawtooth", 0.4);
          setIsGameOver(true);
          setIsPlaying(false);
          saveHighScore("space", currentScore);
          return;
        }
      }

      // Draw
      ctx.fillStyle = "#070A12";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Stars
      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      for (let i = 0; i < 20; i++) {
        const sx = (Math.sin(frame * 0.02 + i) * 0.5 + 0.5) * canvas.width;
        const sy = (frame * 1.5 + i * 30) % canvas.height;
        ctx.fillRect(sx, sy, 2, 2);
      }

      // Bullets
      ctx.fillStyle = "#38BDF8";
      ctx.shadowColor = "#38BDF8";
      ctx.shadowBlur = 8;
      bullets.forEach((b) => ctx.fillRect(b.x - 2, b.y, 4, 12));
      ctx.shadowBlur = 0;

      // Enemies (Red Neon Alien)
      enemies.forEach((e) => {
        ctx.fillStyle = "#F43F5E";
        ctx.shadowColor = "#F43F5E";
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(e.x, e.y, 14, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.shadowBlur = 0;

      // Player Ship (Cyan & Purple Triangle)
      ctx.fillStyle = "#A855F7";
      ctx.shadowColor = "#A855F7";
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.moveTo(playerX, playerY - 16);
      ctx.lineTo(playerX - 16, playerY + 12);
      ctx.lineTo(playerX + 16, playerY + 12);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;

      animFrameIdRef.current = requestAnimationFrame(loop);
    }

    animFrameIdRef.current = requestAnimationFrame(loop);
    return () => {};
  }

  // 4. CYBER PONG BATTLE
  function runPongGame(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    const paddleH = 75;
    const paddleW = 12;
    let playerY = (canvas.height - paddleH) / 2;
    let aiY = (canvas.height - paddleH) / 2;
    let ballX = canvas.width / 2;
    let ballY = canvas.height / 2;
    let ballVx = 4.5;
    let ballVy = 3.5;
    let currentScore = 0;

    function loop() {
      // Player controls
      if (keysRef.current["ArrowUp"] || keysRef.current["w"]) playerY -= 6;
      if (keysRef.current["ArrowDown"] || keysRef.current["s"]) playerY += 6;
      playerY = Math.max(0, Math.min(canvas.height - paddleH, playerY));

      // AI movement (follows ball with delay)
      const aiCenter = aiY + paddleH / 2;
      if (aiCenter < ballY - 15) aiY += 3.8;
      else if (aiCenter > ballY + 15) aiY -= 3.8;
      aiY = Math.max(0, Math.min(canvas.height - paddleH, aiY));

      // Ball movement
      ballX += ballVx;
      ballY += ballVy;

      // Top/Bottom bounce
      if (ballY <= 6 || ballY >= canvas.height - 6) {
        ballVy = -ballVy;
        playBeep(400, "sine", 0.05);
      }

      // Player Paddle Bounce
      if (ballX <= 30 + paddleW && ballY >= playerY && ballY <= playerY + paddleH && ballVx < 0) {
        ballVx = -ballVx * 1.05;
        playBeep(600, "triangle", 0.08);
        currentScore += 1;
        setScore(currentScore);
      }

      // AI Paddle Bounce
      if (ballX >= canvas.width - 30 - paddleW && ballY >= aiY && ballY <= aiY + paddleH && ballVx > 0) {
        ballVx = -ballVx * 1.05;
        playBeep(500, "triangle", 0.08);
      }

      // Missed (Player loss)
      if (ballX < 0) {
        playBeep(180, "sawtooth", 0.3);
        setIsGameOver(true);
        setIsPlaying(false);
        saveHighScore("pong", currentScore);
        return;
      }

      // AI Missed (Point for player)
      if (ballX > canvas.width) {
        ballX = canvas.width / 2;
        ballY = canvas.height / 2;
        ballVx = -4.5;
        currentScore += 3;
        setScore(currentScore);
        playBeep(850, "sine", 0.15);
      }

      // Draw
      ctx.fillStyle = "#090C16";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Center Line
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2, 0);
      ctx.lineTo(canvas.width / 2, canvas.height);
      ctx.stroke();
      ctx.setLineDash([]);

      // Player Paddle (Purple)
      ctx.fillStyle = "#A855F7";
      ctx.shadowColor = "#A855F7";
      ctx.shadowBlur = 10;
      ctx.fillRect(30, playerY, paddleW, paddleH);

      // AI Paddle (Pink)
      ctx.fillStyle = "#EC4899";
      ctx.shadowColor = "#EC4899";
      ctx.shadowBlur = 10;
      ctx.fillRect(canvas.width - 30 - paddleW, aiY, paddleW, paddleH);

      // Ball
      ctx.fillStyle = "#38BDF8";
      ctx.shadowColor = "#38BDF8";
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(ballX, ballY, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      animFrameIdRef.current = requestAnimationFrame(loop);
    }

    animFrameIdRef.current = requestAnimationFrame(loop);
    return () => {};
  }

  // 5. DUNGEON TEXT RPG
  function initRpgGame() {
    setRpgHp(100);
    setRpgGold(0);
    setRpgFloor(1);
    setScore(0);
    setRpgLog([
      isEn
        ? "🗡️ You enter the mysterious Cyber Dungeon Floor 1. Ahead lies danger and treasure!"
        : "🗡️ Kamu melangkah ke dalam Cyber Dungeon Lantai 1. Di depan terbentang bahaya dan harta karun!",
    ]);
  }

  function handleRpgAction(type: "explore" | "rest" | "boss") {
    playBeep(480, "sine", 0.08);

    if (type === "explore") {
      const outcome = Math.random();
      if (outcome < 0.45) {
        // Monster battle
        const damage = Math.floor(Math.random() * 18) + 8;
        const reward = Math.floor(Math.random() * 30) + 15;
        const newHp = Math.max(0, rpgHp - damage);
        const newGold = rpgGold + reward;
        setRpgHp(newHp);
        setRpgGold(newGold);
        setScore(newGold);
        setRpgLog((prev) => [
          ...prev,
          isEn
            ? `⚔️ Fought a Cyber Goblin! Took ${damage} DMG, looted +${reward} Gold.`
            : `⚔️ Bertarung melawan Cyber Goblin! Terkena ${damage} DMG, rampas +${reward} Gold.`,
        ]);
        if (newHp <= 0) {
          playBeep(150, "sawtooth", 0.3);
          setIsGameOver(true);
          saveHighScore("rpg", newGold);
        }
      } else {
        // Chest
        const reward = Math.floor(Math.random() * 40) + 20;
        const newGold = rpgGold + reward;
        setRpgGold(newGold);
        setScore(newGold);
        setRpgLog((prev) => [
          ...prev,
          isEn
            ? `💎 Found a glowing Cyber Chest! Gained +${reward} Gold!`
            : `💎 Menemukan Peti Harta Karun! Mendapatkan +${reward} Gold!`,
        ]);
      }
    } else if (type === "rest") {
      const heal = Math.min(100, rpgHp + 25);
      setRpgHp(heal);
      setRpgLog((prev) => [
        ...prev,
        isEn
          ? `☕ Rested at a campfire. Restored +25 HP (Current HP: ${heal}).`
          : `☕ Beristirahat di api unggun. Memulihkan +25 HP (HP Sekarang: ${heal}).`,
      ]);
    } else if (type === "boss") {
      const bossDmg = Math.floor(Math.random() * 35) + 20;
      if (rpgHp > bossDmg) {
        const reward = 100;
        const nextFloor = rpgFloor + 1;
        setRpgHp(rpgHp - bossDmg);
        setRpgFloor(nextFloor);
        setRpgGold(rpgGold + reward);
        setScore(rpgGold + reward);
        setRpgLog((prev) => [
          ...prev,
          isEn
            ? `👑 BOSS DEFEATED! Advanced to Floor ${nextFloor}! Gained +${reward} Gold!`
            : `👑 BOS BERHASIL DIKALAHKAN! Naik ke Lantai ${nextFloor}! Dapat +${reward} Gold!`,
        ]);
      } else {
        setRpgHp(0);
        setIsGameOver(true);
        saveHighScore("rpg", rpgGold);
        setRpgLog((prev) => [
          ...prev,
          isEn ? "💀 Slain by the Dungeon Overlord! Game Over." : "💀 Dikalahkan oleh Raja Dungeon! Game Over.",
        ]);
      }
    }
  }

  // Virtual Controls Trigger
  function triggerVirtualKey(key: string) {
    keysRef.current[key] = true;
    setTimeout(() => {
      keysRef.current[key] = false;
    }, 150);
  }

  // 1-Click Remix ke AI Code
  function handleRemixInAICode() {
    const meta = GAMES.find((g) => g.id === activeGame);
    const remixPrompt = isEn
      ? `Upgrade and expand the "${meta?.title}" game: add new boss levels, unique power-ups, particle effects, and high-fidelity futuristic styling.`
      : `Upgrade dan kembangkan game "${meta?.title}": tambahkan bos musuh baru, power-up unik, efek partikel, dan tampilan futuristik yang ciamik.`;

    try {
      sessionStorage.setItem("ai_code_remix_prompt", remixPrompt);
    } catch {}

    router.push(`/ai-code?remix=${encodeURIComponent(activeGame)}`);
  }

  const currentGameMeta = GAMES.find((g) => g.id === activeGame) || GAMES[0];
  const currentHighScore = highScores[activeGame] || 0;

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 shadow-lg shadow-purple-500/25">
              <Gamepad2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white sm:text-3xl">AI Arcade Playground</h1>
              <p className="text-sm text-slate-400">
                {isEn
                  ? "Play games generated by AI Code right in your browser & remix them with 1-click!"
                  : "Mainkan game buatan AI Code langsung di browser & modifikasi kodenya secara instan!"}
              </p>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              {soundEnabled ? <Volume2 className="h-4 w-4 text-purple-400" /> : <VolumeX className="h-4 w-4 text-slate-500" />}
              <span>{soundEnabled ? (isEn ? "Audio ON" : "Suara ON") : (isEn ? "Audio Muted" : "Suara Mute")}</span>
            </button>

            <button
              onClick={handleRemixInAICode}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-purple-600/25 transition hover:opacity-95"
            >
              <Code2 className="h-4 w-4" />
              <span>{isEn ? "Remix di AI Code" : "Remix di AI Code"}</span>
            </button>
          </div>
        </div>

        {/* Game Selector Tabs */}
        <div className="mt-6 flex flex-wrap gap-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-2 backdrop-blur">
          {GAMES.map((game) => {
            const isSelected = activeGame === game.id;
            return (
              <button
                key={game.id}
                onClick={() => setActiveGame(game.id)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition ${
                  isSelected
                    ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-600/25"
                    : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
                }`}
              >
                <span className="text-base">{game.icon}</span>
                <span>{game.title}</span>
              </button>
            );
          })}
        </div>

        {/* Main Game Screen Grid */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Sisi Kiri: Layar Game Canvas */}
          <div className="space-y-4 lg:col-span-8">
            <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-2xl backdrop-blur">
              {/* Score & Controls Bar */}
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-purple-400">
                    <Zap className="h-4 w-4" />
                    <span className="text-xs uppercase tracking-wider text-slate-400">Score:</span>
                    <span className="text-lg font-black text-white">{score}</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-amber-400">
                    <Trophy className="h-4 w-4" />
                    <span className="text-xs uppercase tracking-wider text-slate-400">High Score:</span>
                    <span className="text-lg font-black text-amber-300">{currentHighScore}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {activeGame !== "rpg" && (
                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      disabled={isGameOver}
                      className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700"
                    >
                      {isPlaying ? (
                        <>
                          <Pause className="h-3.5 w-3.5" /> {isEn ? "Pause" : "Jeda"}
                        </>
                      ) : (
                        <>
                          <Play className="h-3.5 w-3.5" /> {isEn ? "Play" : "Mulai"}
                        </>
                      )}
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setIsGameOver(false);
                      setScore(0);
                      if (activeGame === "rpg") initRpgGame();
                      else setIsPlaying(true);
                    }}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-700 hover:text-white"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    {isEn ? "Restart" : "Ulangi"}
                  </button>
                </div>
              </div>

              {/* Game Screen Container */}
              <div className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-xl border border-slate-800 bg-[#070A12]">
                {activeGame === "rpg" ? (
                  // RPG TEXT ADVENTURE UI
                  <div className="flex h-full w-full flex-col justify-between p-6">
                    <div>
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400">HP:</span>
                          <div className="h-3 w-32 overflow-hidden rounded-full bg-slate-800">
                            <div
                              className="h-full bg-gradient-to-r from-red-500 to-emerald-400 transition-all duration-300"
                              style={{ width: `${rpgHp}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-white">{rpgHp}/100</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs">
                          <span className="text-amber-400 font-bold">💰 {rpgGold} Gold</span>
                          <span className="text-purple-400 font-bold">🏰 Floor {rpgFloor}</span>
                        </div>
                      </div>

                      <div className="mt-4 max-h-[220px] space-y-2 overflow-y-auto pr-2 text-xs">
                        {rpgLog.map((log, i) => (
                          <div key={i} className="rounded-lg bg-slate-900/60 p-2.5 text-slate-200">
                            {log}
                          </div>
                        ))}
                      </div>
                    </div>

                    {!isGameOver ? (
                      <div className="mt-4 grid grid-cols-3 gap-2">
                        <button
                          onClick={() => handleRpgAction("explore")}
                          className="rounded-xl border border-purple-500/40 bg-purple-500/10 py-3 text-xs font-bold text-purple-300 transition hover:bg-purple-500/20"
                        >
                          🧭 {isEn ? "Explore" : "Jelajahi"}
                        </button>
                        <button
                          onClick={() => handleRpgAction("rest")}
                          className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 py-3 text-xs font-bold text-emerald-300 transition hover:bg-emerald-500/20"
                        >
                          ☕ {isEn ? "Rest (+25 HP)" : "Istirahat"}
                        </button>
                        <button
                          onClick={() => handleRpgAction("boss")}
                          className="rounded-xl border border-pink-500/40 bg-pink-500/10 py-3 text-xs font-bold text-pink-300 transition hover:bg-pink-500/20"
                        >
                          👑 {isEn ? "Fight Floor Boss" : "Lawan Boss"}
                        </button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <p className="text-lg font-bold text-red-400">💀 GAME OVER</p>
                        <button
                          onClick={initRpgGame}
                          className="mt-2 rounded-xl bg-purple-600 px-6 py-2 text-xs font-bold text-white shadow"
                        >
                          {isEn ? "Try Again" : "Coba Lagi"}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  // CANVAS GAMES
                  <>
                    <canvas
                      ref={canvasRef}
                      width={640}
                      height={480}
                      className="h-full w-full object-contain"
                    />

                    {/* Start Overlay */}
                    {!isPlaying && !isGameOver && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-tr from-purple-600 to-pink-600 shadow-xl shadow-purple-600/30">
                          <Play className="ml-1 h-8 w-8 text-white" />
                        </div>
                        <h2 className="mt-4 text-xl font-bold text-white">{currentGameMeta.title}</h2>
                        <p className="mt-1 text-xs text-slate-400">{isEn ? currentGameMeta.descEn : currentGameMeta.descId}</p>
                        <button
                          onClick={() => setIsPlaying(true)}
                          className="mt-5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg transition hover:scale-105"
                        >
                          {isEn ? "Start Game" : "Mulai Mainkan"}
                        </button>
                      </div>
                    )}

                    {/* Game Over Overlay */}
                    {isGameOver && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/85 backdrop-blur-sm">
                        <Flame className="h-12 w-12 text-pink-500 animate-bounce" />
                        <h2 className="mt-2 text-2xl font-black text-white">GAME OVER</h2>
                        <p className="mt-1 text-sm text-slate-300">
                          {isEn ? "Final Score:" : "Skor Akhir:"} <span className="font-bold text-purple-400">{score}</span>
                        </p>
                        <div className="mt-5 flex gap-3">
                          <button
                            onClick={() => {
                              setIsGameOver(false);
                              setScore(0);
                              setIsPlaying(true);
                            }}
                            className="rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-5 py-2.5 text-xs font-bold text-white shadow transition hover:scale-105"
                          >
                            {isEn ? "Play Again" : "Main Lagi"}
                          </button>
                          <button
                            onClick={handleRemixInAICode}
                            className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-700"
                          >
                            {isEn ? "Remix di AI Code" : "Remix di AI Code"}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* On-Screen Mobile Virtual Controls (HP / Touchpad) */}
              {activeGame !== "rpg" && (
                <div className="mt-4 rounded-xl border border-slate-800/80 bg-slate-950/60 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-400">
                      📱 {isEn ? "Virtual Touchpad / D-Pad" : "Kontrol Sentuh Layar (HP / Tablet)"}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {isEn ? currentGameMeta.controlsEn : currentGameMeta.controlsId}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-center gap-6">
                    {/* D-Pad */}
                    <div className="grid grid-cols-3 gap-1">
                      <div />
                      <button
                        onPointerDown={() => triggerVirtualKey("ArrowUp")}
                        className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800 text-slate-300 active:bg-purple-600 active:text-white"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <div />

                      <button
                        onPointerDown={() => triggerVirtualKey("ArrowLeft")}
                        className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800 text-slate-300 active:bg-purple-600 active:text-white"
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </button>
                      <button
                        onPointerDown={() => triggerVirtualKey("ArrowDown")}
                        className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800 text-slate-300 active:bg-purple-600 active:text-white"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>
                      <button
                        onPointerDown={() => triggerVirtualKey("ArrowRight")}
                        className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800 text-slate-300 active:bg-purple-600 active:text-white"
                      >
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Action Button (Jump / Shoot) */}
                    <button
                      onPointerDown={() => triggerVirtualKey(" ")}
                      className="flex h-16 w-16 flex-col items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-600 font-black text-white shadow-lg active:scale-95"
                    >
                      <Zap className="h-5 w-5" />
                      <span className="text-[10px]">{activeGame === "space" ? "SHOOT" : "ACTION"}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sisi Kanan: Detail Game, Leaderboard, & Remix Guide */}
          <div className="space-y-6 lg:col-span-4">
            {/* Info Game Aktif */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{currentGameMeta.icon}</span>
                <div>
                  <h3 className="text-lg font-bold text-white">{currentGameMeta.title}</h3>
                  <span className="inline-block rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] font-semibold text-purple-400">
                    {currentGameMeta.genre}
                  </span>
                </div>
              </div>

              <p className="mt-3 text-xs leading-relaxed text-slate-400">
                {isEn ? currentGameMeta.descEn : currentGameMeta.descId}
              </p>

              <div className="mt-4 space-y-2 border-t border-slate-800 pt-3 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500">{isEn ? "Controls:" : "Kontrol:"}</span>
                  <span className="font-medium text-slate-200">
                    {isEn ? currentGameMeta.controlsEn : currentGameMeta.controlsId}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{isEn ? "Difficulty:" : "Tingkat Kesulitan:"}</span>
                  <span className="font-semibold text-pink-400">{currentGameMeta.difficulty}</span>
                </div>
              </div>
            </div>

            {/* Leaderboard Lokal */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">{isEn ? "Hall of Fame" : "Papan Skor Terbaik"}</h3>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                {isEn ? "Your top recorded scores across games" : "Rekor skor tertinggi yang kamu raih"}
              </p>

              <div className="mt-4 space-y-2">
                {GAMES.map((g, idx) => {
                  const s = highScores[g.id] || 0;
                  return (
                    <div
                      key={g.id}
                      className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-950/40 px-3.5 py-2.5 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">#{idx + 1}</span>
                        <span>{g.icon}</span>
                        <span className="font-medium text-white">{g.title}</span>
                      </div>
                      <span className="font-black text-amber-400">{s} PTS</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Banner Remix di AI Code */}
            <div className="rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-950/40 to-slate-900/60 p-6 backdrop-blur">
              <div className="flex items-center gap-2 text-purple-400">
                <Sparkles className="h-5 w-5" />
                <h3 className="text-sm font-bold text-white">{isEn ? "Remix with AI Code" : "Ingin Modifikasi Game Ini?"}</h3>
              </div>
              <p className="mt-2 text-xs text-slate-300">
                {isEn
                  ? "Send this game to AI Code to add new levels, boss fights, physics, or custom art styles."
                  : "Kirim game ini ke AI Code untuk menambahkan level baru, pertarungan bos, atau efek visual custom."}
              </p>
              <button
                onClick={handleRemixInAICode}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 py-2.5 text-xs font-bold text-white shadow-md shadow-purple-600/30 transition hover:bg-purple-500"
              >
                <Code2 className="h-4 w-4" />
                <span>{isEn ? "Open in AI Code" : "Buka di AI Code"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
