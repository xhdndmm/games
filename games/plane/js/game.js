// 打飞机：纵版射击。自动开火，击毁敌机得分，三档难度，粒子爆炸。
const canvas = document.querySelector("#board");
const context = canvas.getContext("2d");
const overlay = document.querySelector("#overlay");
const overlayTitle = document.querySelector("#overlay-title");
const overlayCopy = document.querySelector("#overlay-copy");
const startButton = document.querySelector("#start");
const restartButton = document.querySelector("#restart");
const scoreElement = document.querySelector("#score");
const bestElement = document.querySelector("#best");
const livesElement = document.querySelector("#lives");
const difficultyButtons = document.querySelectorAll(".difficulty-button");

const width = canvas.width;
const height = canvas.height;

// 难度参数：敌机生成间隔(帧)、敌机速度、同时存活上限
const difficultyConfig = {
  easy: { spawnEvery: 55, speed: 1.6, maxEnemies: 6 },
  normal: { spawnEvery: 40, speed: 2.2, maxEnemies: 9 },
  hard: { spawnEvery: 26, speed: 3.0, maxEnemies: 14 },
};

const enemyTypes = [
  { name: "scout", width: 34, height: 30, hp: 1, points: 10, color: "#f1745f" },
  { name: "fighter", width: 42, height: 38, hp: 2, points: 25, color: "#f7c84b" },
  { name: "bomber", width: 56, height: 52, hp: 4, points: 60, color: "#8fb6a9" },
];

let player;
let bullets = [];
let enemies = [];
let particles = [];
let stars = [];
let score = 0;
let lives = 3;
let best = Number(localStorage.getItem("plane-best") || 0);
let frameCount = 0;
let state = "idle"; // idle | running | over
let currentDifficulty = "normal";
let invincible = 0;

bestElement.textContent = best;

function makeStars() {
  stars = [];
  for (let i = 0; i < 60; i += 1) {
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() < 0.75 ? 1 : 2,
      speed: 0.4 + Math.random() * 1.4,
    });
  }
}

function resetGame() {
  player = { x: width / 2, y: height - 60, width: 40, height: 36 };
  bullets = [];
  enemies = [];
  particles = [];
  score = 0;
  lives = 3;
  frameCount = 0;
  invincible = 0;
  scoreElement.textContent = "0";
  renderLives();
}

function renderLives() {
  livesElement.textContent = "✈ ".repeat(Math.max(lives, 0)).trim() || "—";
}

function setDifficulty(level) {
  currentDifficulty = level;
  difficultyButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.difficulty === level);
  });
}

difficultyButtons.forEach((button) => {
  button.addEventListener("click", () => setDifficulty(button.dataset.difficulty));
});

function start() {
  resetGame();
  makeStars();
  state = "running";
  overlay.hidden = true;
}

startButton.addEventListener("click", start);
restartButton.addEventListener("click", start);

// 键盘移动 + 空格暂停射击不需要（自动射击），仅方向
const keys = {};
window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"].includes(key)) {
    keys[key] = true;
  }
});
window.addEventListener("keyup", (event) => {
  keys[event.key.toLowerCase()] = false;
});

// 触屏方向键（窄屏显示）：按住移动
const padKeyMap = { up: "arrowup", down: "arrowdown", left: "arrowleft", right: "arrowright" };
document.querySelectorAll(".pad button").forEach((button) => {
  const key = padKeyMap[button.dataset.direction];
  button.addEventListener("pointerdown", () => {
    keys[key] = true;
  });
  ["pointerup", "pointercancel", "pointerleave"].forEach((type) => {
    button.addEventListener(type, () => {
      keys[key] = false;
    });
  });
});

// 触屏 / 鼠标拖动：手指(鼠标)在哪，飞机就往哪去
let pointerTarget = null;
function pointerPosition(event) {
  const rect = canvas.getBoundingClientRect();
  const scale = canvas.width / rect.width;
  const clientX = event.touches ? event.touches[0].clientX : event.clientX;
  const clientY = event.touches ? event.touches[0].clientY : event.clientY;
  return {
    x: (clientX - rect.left) * scale,
    y: (clientY - rect.top) * scale,
  };
}
canvas.addEventListener("touchstart", (event) => {
  event.preventDefault();
  pointerTarget = pointerPosition(event);
}, { passive: false });
canvas.addEventListener("touchmove", (event) => {
  event.preventDefault();
  pointerTarget = pointerPosition(event);
}, { passive: false });
canvas.addEventListener("touchend", () => {
  pointerTarget = null;
});
canvas.addEventListener("mousemove", (event) => {
  pointerTarget = pointerPosition(event);
});
canvas.addEventListener("mouseleave", () => {
  pointerTarget = null;
});

function spawnEnemy() {
  const config = difficultyConfig[currentDifficulty];
  if (enemies.length >= config.maxEnemies) return;
  const type = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
  const hpMultiplier = currentDifficulty === "hard" ? 1.5 : 1;
  enemies.push({
    x: type.width / 2 + Math.random() * (width - type.width),
    y: -type.height,
    width: type.width,
    height: type.height,
    hp: Math.ceil(type.hp * hpMultiplier),
    maxHp: Math.ceil(type.hp * hpMultiplier),
    points: type.points,
    color: type.color,
    speed: type.name === "bomber" ? config.speed * 0.6 : config.speed * (0.9 + Math.random() * 0.5),
    wobble: type.name === "scout" ? Math.random() * Math.PI * 2 : 0,
  });
}

function spawnExplosion(x, y, color, count) {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 3.5;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 24 + Math.random() * 16,
      size: 2 + Math.random() * 3,
      color,
    });
  }
}

function movePlayer() {
  const step = 4.5;
  let dx = 0;
  let dy = 0;
  if (keys.arrowleft || keys.a) dx -= 1;
  if (keys.arrowright || keys.d) dx += 1;
  if (keys.arrowup || keys.w) dy -= 1;
  if (keys.arrowdown || keys.s) dy += 1;
  if (dx !== 0 || dy !== 0) {
    const length = Math.hypot(dx, dy) || 1;
    player.x += (dx / length) * step;
    player.y += (dy / length) * step;
    pointerTarget = null;
  }
  if (pointerTarget) {
    player.x += (pointerTarget.x - player.x) * 0.25;
    player.y += (pointerTarget.y - player.y) * 0.25;
  }
  player.x = Math.max(player.width / 2, Math.min(width - player.width / 2, player.x));
  player.y = Math.max(height * 0.55, Math.min(height - player.height / 2, player.y));
}

function fire() {
  bullets.push({ x: player.x - 8, y: player.y - 18, width: 3, height: 12 });
  bullets.push({ x: player.x + 8, y: player.y - 18, width: 3, height: 12 });
}

function collides(a, b) {
  return (
    Math.abs(a.x - b.x) < (a.width + b.width) / 2 - 6 &&
    Math.abs(a.y - b.y) < (a.height + b.height) / 2 - 6
  );
}

function update() {
  frameCount += 1;
  const config = difficultyConfig[currentDifficulty];

  movePlayer();

  if (frameCount % 8 === 0) fire();
  bullets = bullets.filter((bullet) => {
    bullet.y -= 8;
    return bullet.y > -20;
  });

  if (frameCount % config.spawnEvery === 0) spawnEnemy();
  enemies.forEach((enemy) => {
    enemy.y += enemy.speed;
    if (enemy.wobble) enemy.x += Math.sin(frameCount * 0.08 + enemy.wobble) * 1.2;
  });
  enemies = enemies.filter((enemy) => enemy.y < height + 60);

  particles = particles.filter((particle) => {
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.life -= 1;
    return particle.life > 0;
  });

  for (const enemy of [...enemies]) {
    for (const bullet of [...bullets]) {
      if (collides(enemy, bullet)) {
        bullets.splice(bullets.indexOf(bullet), 1);
        enemy.hp -= 1;
        spawnExplosion(bullet.x, bullet.y, "#d8f45c", 4);
        if (enemy.hp <= 0) {
          enemies.splice(enemies.indexOf(enemy), 1);
          spawnExplosion(enemy.x, enemy.y, enemy.color, 18);
          score += enemy.points;
          scoreElement.textContent = String(score);
          if (score > best) {
            best = score;
            bestElement.textContent = String(best);
            localStorage.setItem("plane-best", String(best));
          }
        }
        break;
      }
    }
  }

  if (invincible > 0) invincible -= 1;
  for (const enemy of [...enemies]) {
    if (invincible === 0 && collides(enemy, player)) {
      enemies.splice(enemies.indexOf(enemy), 1);
      spawnExplosion(enemy.x, enemy.y, enemy.color, 18);
      lives -= 1;
      if (lives <= 0) {
        spawnExplosion(player.x, player.y, "#f1745f", 40);
        state = "over";
        showGameOver();
        renderLives();
        break;
      }
      invincible = 90;
      renderLives();
    }
  }
}

function showGameOver() {
  overlayTitle.textContent = "游戏结束";
  overlayCopy.textContent = `本局 ${score} 分 · 最高 ${best} 分`;
  overlay.hidden = false;
  startButton.textContent = "再来一局";
}

function drawPlane(x, y, w, h, color) {
  context.save();
  context.translate(x, y);
  context.fillStyle = color;
  // 机身
  context.beginPath();
  context.moveTo(0, -h / 2);
  context.lineTo(w / 6, 0);
  context.lineTo(w / 6, h / 2 - 6);
  context.lineTo(-w / 6, h / 2 - 6);
  context.lineTo(-w / 6, 0);
  context.closePath();
  context.fill();
  // 机翼
  context.beginPath();
  context.moveTo(0, -2);
  context.lineTo(w / 2, h / 4);
  context.lineTo(w / 6, h / 4 - 4);
  context.lineTo(-w / 6, h / 4 - 4);
  context.lineTo(-w / 2, h / 4);
  context.closePath();
  context.fill();
  context.restore();
}

function draw() {
  context.clearRect(0, 0, width, height);

  // 星空
  stars.forEach((star) => {
    star.y += star.speed;
    if (star.y > height) {
      star.y = 0;
      star.x = Math.random() * width;
    }
    context.globalAlpha = 0.35 + star.speed * 0.3;
    context.fillStyle = "#ffffff";
    context.fillRect(star.x, star.y, star.size, star.size);
  });
  context.globalAlpha = 1;

  // 子弹
  context.fillStyle = "#d8f45c";
  bullets.forEach((bullet) => {
    context.fillRect(bullet.x - bullet.width / 2, bullet.y - bullet.height / 2, bullet.width, bullet.height);
  });

  // 敌机
  enemies.forEach((enemy) => {
    drawPlane(enemy.x, enemy.y, enemy.width, enemy.height, enemy.color);
    if (enemy.hp < enemy.maxHp) {
      const ratio = enemy.hp / enemy.maxHp;
      context.fillStyle = "rgba(247, 200, 75, 0.9)";
      context.fillRect(enemy.x - 16, enemy.y - enemy.height / 2 - 7, 32 * ratio, 3);
    }
  });

  // 爆炸粒子
  particles.forEach((particle) => {
    context.globalAlpha = Math.max(particle.life / 40, 0);
    context.fillStyle = particle.color;
    context.fillRect(particle.x - particle.size / 2, particle.y - particle.size / 2, particle.size, particle.size);
  });
  context.globalAlpha = 1;

  // 玩家（受伤后闪烁）
  if (state !== "over" && (invincible === 0 || Math.floor(invincible / 6) % 2 === 0)) {
    drawPlane(player.x, player.y, player.width, player.height, "#d8f45c");
    context.fillStyle = "#18231f";
    context.beginPath();
    context.arc(player.x, player.y - 4, 3, 0, Math.PI * 2);
    context.fill();
  }
}

function loop() {
  if (state === "running") update();
  draw();
  requestAnimationFrame(loop);
}

makeStars();
resetGame();
loop();
