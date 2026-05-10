import { useEffect, useRef } from 'react';

const W = 350;
const H = 600;
const COLS = 7;
const BRICK_W = W / COLS;
const BRICK_H = 32;
const BRICK_PAD = 2;
const TOP_OFFSET = 20;
const GAME_OVER_ROW = 12;
const SHOOTER_Y = H - 24;
const BALL_RADIUS = 5;
const BALL_SPEED = 9.5;
const PICKUP_RADIUS = 10;
const LAUNCH_DELAY = 70;
const MIN_ANGLE_RAD = (10 * Math.PI) / 180;

function rand(n) {
  return Math.floor(Math.random() * n);
}

function spawnRowItems(round) {
  const items = [];
  const occupied = new Set();
  if (Math.random() < 0.9) {
    const c = rand(COLS);
    items.push({ col: c, isPickup: true });
    occupied.add(c);
  }
  const numBricks = 3 + rand(3);
  let placed = 0;
  let attempts = 0;
  while (placed < numBricks && attempts < 40) {
    attempts++;
    const c = rand(COLS);
    if (occupied.has(c)) continue;
    let hp = round;
    if (Math.random() < 0.15) hp = round * 2;
    items.push({ col: c, hp, isPickup: false });
    occupied.add(c);
    placed++;
  }
  return items;
}

function brickRect(b) {
  return {
    x: b.col * BRICK_W + BRICK_PAD,
    y: TOP_OFFSET + b.row * BRICK_H + BRICK_PAD,
    w: BRICK_W - BRICK_PAD * 2,
    h: BRICK_H - BRICK_PAD * 2,
  };
}

function pickupCenter(p) {
  return {
    x: p.col * BRICK_W + BRICK_W / 2,
    y: TOP_OFFSET + p.row * BRICK_H + BRICK_H / 2,
  };
}

function hpColor(hp) {
  const palette = [
    '#7ee787',
    '#6ee7ff',
    '#7c9cff',
    '#b388ff',
    '#ff8ad1',
    '#ff7a7a',
    '#ffb86c',
    '#ffd866',
  ];
  return palette[Math.min(palette.length - 1, Math.floor((hp - 1) / 3))];
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function makeInitialState() {
  const items = spawnRowItems(1).map((it) => ({ ...it, row: 0, alive: true }));
  return {
    bricks: items.filter((i) => !i.isPickup),
    pickups: items.filter((i) => i.isPickup),
    balls: [],
    launchX: W / 2,
    ballCount: 1,
    ballsToLaunch: 0,
    lastLaunchTime: 0,
    launchVx: 0,
    launchVy: 0,
    firstReturnX: null,
    aim: null,
    score: 0,
    round: 1,
    phase: 'aim',
    pendingBallGain: 0,
  };
}

export default function BrickBreaker({ onGameOver, onHud }) {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const rafRef = useRef(0);
  const onGameOverRef = useRef(onGameOver);
  const onHudRef = useRef(onHud);
  onGameOverRef.current = onGameOver;
  onHudRef.current = onHud;

  if (!stateRef.current) stateRef.current = makeInitialState();

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const initial = stateRef.current;
    onHudRef.current?.({
      round: initial.round,
      score: initial.score,
      ballCount: initial.ballCount,
      phase: initial.phase,
    });

    function getCanvasPoint(evt) {
      const rect = canvas.getBoundingClientRect();
      const cx = evt.clientX - rect.left;
      const cy = evt.clientY - rect.top;
      return {
        x: (cx / rect.width) * W,
        y: (cy / rect.height) * H,
      };
    }

    function onPointerDown(e) {
      const s = stateRef.current;
      if (s.phase !== 'aim') return;
      e.preventDefault();
      canvas.setPointerCapture(e.pointerId);
      s.aim = getCanvasPoint(e);
    }

    function onPointerMove(e) {
      const s = stateRef.current;
      if (s.phase !== 'aim' || !s.aim) return;
      e.preventDefault();
      s.aim = getCanvasPoint(e);
    }

    function onPointerUp(e) {
      const s = stateRef.current;
      if (s.phase !== 'aim' || !s.aim) {
        s.aim = null;
        return;
      }
      const dx = s.aim.x - s.launchX;
      const dy = s.aim.y - SHOOTER_Y;
      const len = Math.hypot(dx, dy);
      s.aim = null;
      if (len < 12 || dy >= 0) return;

      let angle = Math.atan2(dy, dx);
      const limit = -MIN_ANGLE_RAD;
      if (angle > limit) angle = limit;
      const flipLimit = -Math.PI - limit;
      if (angle < flipLimit) angle = flipLimit;

      s.launchVx = Math.cos(angle) * BALL_SPEED;
      s.launchVy = Math.sin(angle) * BALL_SPEED;
      s.ballsToLaunch = s.ballCount;
      s.lastLaunchTime = 0;
      s.firstReturnX = null;
      s.balls = [];
      s.phase = 'flying';
      onHudRef.current?.({ round: s.round, score: s.score, ballCount: s.ballCount, phase: s.phase });
    }

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);

    let lastScore = stateRef.current.score;
    function step(now) {
      const s = stateRef.current;

      if (s.phase === 'flying' && s.ballsToLaunch > 0 && now - s.lastLaunchTime > LAUNCH_DELAY) {
        s.balls.push({
          x: s.launchX,
          y: SHOOTER_Y - BALL_RADIUS,
          vx: s.launchVx,
          vy: s.launchVy,
          alive: true,
        });
        s.ballsToLaunch--;
        s.lastLaunchTime = now;
      }

      const SUB = 2;
      for (let st = 0; st < SUB; st++) {
        for (const ball of s.balls) {
          if (!ball.alive) continue;
          ball.x += ball.vx / SUB;
          ball.y += ball.vy / SUB;

          if (ball.x < BALL_RADIUS) {
            ball.x = BALL_RADIUS;
            ball.vx = Math.abs(ball.vx);
          } else if (ball.x > W - BALL_RADIUS) {
            ball.x = W - BALL_RADIUS;
            ball.vx = -Math.abs(ball.vx);
          }
          if (ball.y < BALL_RADIUS) {
            ball.y = BALL_RADIUS;
            ball.vy = Math.abs(ball.vy);
          }

          if (ball.y >= SHOOTER_Y) {
            ball.alive = false;
            ball.y = SHOOTER_Y;
            if (s.firstReturnX === null) {
              s.firstReturnX = clamp(ball.x, BALL_RADIUS + 2, W - BALL_RADIUS - 2);
            }
            continue;
          }

          for (const brick of s.bricks) {
            if (!brick.alive) continue;
            const r = brickRect(brick);
            const closestX = Math.max(r.x, Math.min(ball.x, r.x + r.w));
            const closestY = Math.max(r.y, Math.min(ball.y, r.y + r.h));
            const cx = ball.x - closestX;
            const cy = ball.y - closestY;
            if (cx * cx + cy * cy < BALL_RADIUS * BALL_RADIUS) {
              brick.hp--;
              s.score++;
              if (brick.hp <= 0) brick.alive = false;
              const overlapX = BALL_RADIUS - Math.abs(cx);
              const overlapY = BALL_RADIUS - Math.abs(cy);
              if (Math.abs(cx) > Math.abs(cy) || cy === 0) {
                ball.vx = cx >= 0 ? Math.abs(ball.vx) : -Math.abs(ball.vx);
                ball.x += cx >= 0 ? overlapX : -overlapX;
              } else {
                ball.vy = cy >= 0 ? Math.abs(ball.vy) : -Math.abs(ball.vy);
                ball.y += cy >= 0 ? overlapY : -overlapY;
              }
              break;
            }
          }

          for (const p of s.pickups) {
            if (!p.alive) continue;
            const c = pickupCenter(p);
            const dx = ball.x - c.x;
            const dy = ball.y - c.y;
            const rr = PICKUP_RADIUS + BALL_RADIUS;
            if (dx * dx + dy * dy < rr * rr) {
              p.alive = false;
              s.pendingBallGain++;
            }
          }
        }
      }

      if (s.phase === 'flying' && s.ballsToLaunch === 0 && s.balls.every((b) => !b.alive)) {
        if (s.firstReturnX !== null) s.launchX = s.firstReturnX;
        s.firstReturnX = null;
        s.balls = [];
        s.ballCount += s.pendingBallGain;
        s.pendingBallGain = 0;

        s.bricks.forEach((b) => (b.row += 1));
        s.pickups.forEach((p) => (p.row += 1));
        s.pickups = s.pickups.filter((p) => p.alive && p.row < GAME_OVER_ROW + 1);
        s.bricks = s.bricks.filter((b) => b.alive);

        const lost = s.bricks.some((b) => b.alive && b.row >= GAME_OVER_ROW);
        if (lost) {
          s.phase = 'gameover';
          onHudRef.current?.({ round: s.round, score: s.score, ballCount: s.ballCount, phase: 'gameover' });
          onGameOverRef.current?.(s.score);
        } else {
          s.round += 1;
          const newItems = spawnRowItems(s.round);
          for (const it of newItems) {
            const obj = { ...it, row: 0, alive: true };
            if (it.isPickup) s.pickups.push(obj);
            else s.bricks.push(obj);
          }
          s.phase = 'aim';
          onHudRef.current?.({ round: s.round, score: s.score, ballCount: s.ballCount, phase: 'aim' });
        }
      }

      if (s.score !== lastScore) {
        lastScore = s.score;
        onHudRef.current?.({ round: s.round, score: s.score, ballCount: s.ballCount, phase: s.phase });
      }

      render(ctx, s);
      rafRef.current = requestAnimationFrame(step);
    }

    rafRef.current = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(rafRef.current);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
    };
  }, []);

  return (
    <div className="canvas-wrap">
      <canvas ref={canvasRef} width={W} height={H} />
    </div>
  );
}

function render(ctx, s) {
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#0f1530');
  grad.addColorStop(1, '#070a18');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  const gy = TOP_OFFSET + GAME_OVER_ROW * BRICK_H;
  ctx.strokeStyle = 'rgba(255, 94, 126, 0.55)';
  ctx.setLineDash([6, 6]);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, gy);
  ctx.lineTo(W, gy);
  ctx.stroke();
  ctx.setLineDash([]);

  for (const b of s.bricks) {
    if (!b.alive) continue;
    const r = brickRect(b);
    ctx.fillStyle = hpColor(b.hp);
    roundRect(ctx, r.x, r.y, r.w, r.h, 5);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(b.hp), r.x + r.w / 2, r.y + r.h / 2);
  }

  for (const p of s.pickups) {
    if (!p.alive) continue;
    const c = pickupCenter(p);
    ctx.strokeStyle = '#6ee7ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(c.x, c.y, PICKUP_RADIUS, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#6ee7ff';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('+', c.x, c.y + 1);
  }

  ctx.fillStyle = '#ffffff';
  for (const b of s.balls) {
    if (!b.alive) continue;
    ctx.beginPath();
    ctx.arc(b.x, b.y, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  }

  if (s.phase === 'aim') {
    ctx.fillStyle = '#6ee7ff';
    ctx.beginPath();
    ctx.arc(s.launchX, SHOOTER_Y, BALL_RADIUS + 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('x' + s.ballCount, s.launchX, SHOOTER_Y - 10);

    if (s.aim) {
      const dx = s.aim.x - s.launchX;
      const dy = s.aim.y - SHOOTER_Y;
      const len = Math.hypot(dx, dy);
      if (len > 8 && dy < 0) {
        const ux = dx / len;
        const uy = dy / len;
        ctx.strokeStyle = 'rgba(110, 231, 255, 0.55)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(s.launchX, SHOOTER_Y - BALL_RADIUS);
        ctx.lineTo(s.launchX + ux * 220, SHOOTER_Y - BALL_RADIUS + uy * 220);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
