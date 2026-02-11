const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const overlay = document.getElementById("overlay");

const keys = new Set();

const WORLD_LENGTH = 5000;
const RING_COUNT = 24;
const OBSTACLE_COUNT = 15;

const state = {
  running: false,
  gameOver: false,
  score: 0,
  speed: 90,
  distance: 0,
  ringIndex: 0,
  rings: [],
  obstacles: [],
  player: {
    x: 0,
    y: 0,
    z: 0,
    pitch: 0,
    roll: 0,
  },
};

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function resetGame() {
  state.running = true;
  state.gameOver = false;
  state.score = 0;
  state.speed = 90;
  state.distance = 0;
  state.ringIndex = 0;
  state.player = { x: 0, y: 0, z: 0, pitch: 0, roll: 0 };

  state.rings = Array.from({ length: RING_COUNT }, (_, i) => ({
    x: rand(-420, 420),
    y: rand(-180, 180),
    z: 380 + i * (WORLD_LENGTH / RING_COUNT),
    radius: rand(60, 88),
    hit: false,
  }));

  state.obstacles = Array.from({ length: OBSTACLE_COUNT }, (_, i) => ({
    x: rand(-520, 520),
    y: rand(-240, 240),
    z: 540 + i * (WORLD_LENGTH / OBSTACLE_COUNT) + rand(-160, 160),
    radius: rand(36, 60),
  }));

  overlay.classList.add("hidden");
}

function project(x, y, z) {
  const relZ = z - state.player.z;
  if (relZ <= 1) return null;

  const fov = 650;
  const scale = fov / relZ;
  return {
    x: canvas.width / 2 + (x - state.player.x) * scale,
    y: canvas.height / 2 + (y - state.player.y) * scale,
    scale,
    relZ,
  };
}

function drawBackground() {
  const horizon = canvas.height * (0.5 + state.player.pitch * 0.02);

  const sky = ctx.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, "#75b4ff");
  sky.addColorStop(1, "#a5d8ff");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, horizon);

  const ground = ctx.createLinearGradient(0, horizon, 0, canvas.height);
  ground.addColorStop(0, "#244360");
  ground.addColorStop(1, "#101a2a");
  ctx.fillStyle = ground;
  ctx.fillRect(0, horizon, canvas.width, canvas.height - horizon);

  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.lineWidth = 1;
  for (let i = 1; i < 8; i++) {
    const y = horizon + (canvas.height - horizon) * (i / 8);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
}

function drawPlayerHud() {
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(-state.player.roll * 0.55);
  ctx.strokeStyle = "rgba(233, 249, 255, 0.85)";
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(-40, 0);
  ctx.lineTo(-10, 0);
  ctx.moveTo(10, 0);
  ctx.lineTo(40, 0);
  ctx.moveTo(0, -28);
  ctx.lineTo(0, 28);
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = "#e6f4ff";
  ctx.font = "24px ui-sans-serif";
  ctx.fillText(`分数: ${state.score}`, 24, 40);
  ctx.fillText(`速度: ${state.speed.toFixed(0)} m/s`, 24, 72);
  ctx.fillText(`距离: ${state.distance.toFixed(0)} m`, 24, 104);

  if (state.gameOver) {
    ctx.fillStyle = "rgba(7, 18, 32, 0.72)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#f8fbff";
    ctx.font = "bold 58px ui-sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("任务失败", canvas.width / 2, canvas.height / 2 - 30);
    ctx.font = "28px ui-sans-serif";
    ctx.fillText("按 Space 重新开始", canvas.width / 2, canvas.height / 2 + 34);
    ctx.textAlign = "left";
  }
}

function drawRing(ring) {
  const p = project(ring.x, ring.y, ring.z);
  if (!p) return;

  const radius = ring.radius * p.scale;
  if (radius < 3 || radius > 3000) return;

  ctx.beginPath();
  ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
  ctx.lineWidth = Math.max(2, radius * 0.1);
  ctx.strokeStyle = ring.hit ? "rgba(80, 255, 170, 0.7)" : "rgba(255, 237, 145, 0.82)";
  ctx.stroke();
}

function drawObstacle(obs) {
  const p = project(obs.x, obs.y, obs.z);
  if (!p) return;
  const radius = obs.radius * p.scale;
  if (radius < 2 || radius > 2500) return;

  const gradient = ctx.createRadialGradient(p.x - radius * 0.35, p.y - radius * 0.35, radius * 0.2, p.x, p.y, radius);
  gradient.addColorStop(0, "#eb5f5f");
  gradient.addColorStop(1, "#6d1d1d");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function update(dt) {
  if (!state.running || state.gameOver) return;

  const turn = 70 * dt;
  if (keys.has("KeyA")) state.player.x -= turn;
  if (keys.has("KeyD")) state.player.x += turn;
  if (keys.has("KeyW")) state.player.y += turn;
  if (keys.has("KeyS")) state.player.y -= turn;

  state.player.x = Math.max(-620, Math.min(620, state.player.x));
  state.player.y = Math.max(-300, Math.min(300, state.player.y));

  if (keys.has("ArrowUp")) state.speed = Math.min(240, state.speed + 65 * dt);
  if (keys.has("ArrowDown")) state.speed = Math.max(50, state.speed - 65 * dt);

  state.player.pitch += ((keys.has("KeyW") ? 1 : 0) - (keys.has("KeyS") ? 1 : 0) - state.player.pitch * 2.2) * dt;
  state.player.roll += ((keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0) - state.player.roll * 2.2) * dt;

  const dz = state.speed * dt;
  state.player.z += dz;
  state.distance += dz;

  for (const ring of state.rings) {
    if (ring.hit || Math.abs(ring.z - state.player.z) > 26) continue;
    const dx = state.player.x - ring.x;
    const dy = state.player.y - ring.y;
    if (dx * dx + dy * dy <= ring.radius * ring.radius) {
      ring.hit = true;
      state.score += 100;
    }
  }

  for (const obs of state.obstacles) {
    if (Math.abs(obs.z - state.player.z) > 20) continue;
    const dx = state.player.x - obs.x;
    const dy = state.player.y - obs.y;
    if (dx * dx + dy * dy <= (obs.radius + 18) * (obs.radius + 18)) {
      state.gameOver = true;
      state.running = false;
      overlay.classList.remove("hidden");
      overlay.innerHTML = `<h1>任务失败</h1><p>你撞上了障碍物，最终得分：${state.score}</p><p>按 <kbd>Space</kbd> 重新开始。</p>`;
      return;
    }
  }

  if (state.player.z > WORLD_LENGTH + 420) {
    state.gameOver = true;
    state.running = false;
    overlay.classList.remove("hidden");
    overlay.innerHTML = `<h1>任务完成</h1><p>最终得分：${state.score}</p><p>按 <kbd>Space</kbd> 再来一局。</p>`;
  }
}

function render() {
  drawBackground();

  const drawables = [
    ...state.rings.map((item) => ({ type: "ring", z: item.z, item })),
    ...state.obstacles.map((item) => ({ type: "obs", z: item.z, item })),
  ].sort((a, b) => b.z - a.z);

  for (const entry of drawables) {
    if (entry.type === "ring") drawRing(entry.item);
    else drawObstacle(entry.item);
  }

  drawPlayerHud();
}

let lastTime = performance.now();
function loop(now) {
  const dt = Math.min(0.03, (now - lastTime) / 1000);
  lastTime = now;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

window.addEventListener("keydown", (event) => {
  keys.add(event.code);
  if (event.code === "Space" && (!state.running || state.gameOver)) {
    resetGame();
  }
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.code);
});

render();
requestAnimationFrame(loop);
