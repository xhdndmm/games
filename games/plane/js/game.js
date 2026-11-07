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
const weaponElement = document.querySelector("#weapon");
const shieldElement = document.querySelector("#shield");
const missilesElement = document.querySelector("#missiles");
const difficultyButtons = document.querySelectorAll(".difficulty-button");

const width = canvas.width;
const height = canvas.height;

// 难度参数：敌机生成间隔(帧)、敌机速度、同时存活上限、敌弹速度
const difficultyConfig = {
  easy: { spawnEvery: 55, speed: 1.6, maxEnemies: 6, enemyBulletSpeed: 2.8 },
  normal: { spawnEvery: 40, speed: 2.2, maxEnemies: 9, enemyBulletSpeed: 3.6 },
  hard: { spawnEvery: 26, speed: 3.0, maxEnemies: 14, enemyBulletSpeed: 4.4 },
};

const enemyTypes = [
  { name: "scout", width: 34, height: 30, hp: 1, points: 10, color: "#f1745f" },
  { name: "fighter", width: 42, height: 38, hp: 2, points: 25, color: "#f7c84b", fireEvery: 95 },
  { name: "bomber", width: 56, height: 52, hp: 4, points: 60, color: "#8fb6a9", fireEvery: 60 },
];

// 道具：火=升火力 / 盾=挡一次击 / 命=加一条命 / 导=追踪导弹
const powerUpTypes = [
  { name: "weapon", label: "火", color: "#d8f45c", text: "#18231f" },
  { name: "shield", label: "盾", color: "#0e6b62", text: "#ffffff" },
  { name: "life", label: "命", color: "#f1745f", text: "#ffffff" },
  { name: "missile", label: "导", color: "#f7c84b", text: "#18231f" },
];
const maxWeapon = 3;
const maxLives = 5;
const maxMissiles = 6;
const missileCdMax = 75; // 两枚导弹间隔 1.25 秒
const shieldDuration = 480; // 帧（8 秒）
const enemyFireAfter = 1800; // 30 秒后敌机开始还击

let player;
let bullets = [];
let enemies = [];
let particles = [];
let stars = [];
let powerUps = [];
let enemyBullets = [];
let missiles = [];
let missileCount = 0;
let missileCd = 0;
let score = 0;
let lives = 3;
let weaponLevel = 1;
let shield = 0;
let powerUpTimer = 240;
let shownWeapon = 1;
let shownShield = "—";
let shownMissiles = 0;
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
  powerUps = [];
  enemyBullets = [];
  missiles = [];
  missileCount = 0;
  missileCd = 0;
  score = 0;
  lives = 3;
  weaponLevel = 1;
  shield = 0;
  powerUpTimer = 240;
  frameCount = 0;
  invincible = 0;
  scoreElement.textContent = "0";
  renderLives();
  updateHud();
}

function renderLives() {
  livesElement.textContent = "✈ ".repeat(Math.max(lives, 0)).trim() || "—";
}

function updateHud() {
  if (weaponLevel !== shownWeapon) {
    weaponElement.textContent = String(weaponLevel);
    shownWeapon = weaponLevel;
  }
  const shieldText = shield > 0 ? `${Math.ceil(shield / 60)}s` : "—";
  if (shieldText !== shownShield) {
    shieldElement.textContent = shieldText;
    shownShield = shieldText;
  }
  if (missileCount !== shownMissiles) {
    missilesElement.textContent = String(missileCount);
    shownMissiles = missileCount;
  }
}

function addScore(amount) {
  score += amount;
  scoreElement.textContent = String(score);
  if (score > best) {
    best = score;
    bestElement.textContent = String(best);
    localStorage.setItem("plane-best", String(best));
  }
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
    name: type.name,
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
    fireEvery: type.fireEvery || 0,
    fireCd: type.fireEvery ? type.fireEvery * (0.5 + Math.random() * 0.7) : 0,
  });
}

// 道具从天而降：火力升级 / 护盾 / 加命
function spawnPowerUp() {
  const roll = Math.random();
  let type = roll < 0.4 ? "weapon" : roll < 0.6 ? "shield" : roll < 0.8 ? "missile" : "life";
  if (type === "life" && lives >= maxLives) type = "weapon";
  powerUps.push({
    x: 24 + Math.random() * (width - 48),
    y: -20,
    width: 28,
    height: 28,
    type,
    phase: Math.random() * Math.PI * 2,
  });
}

function applyPowerUp(powerUp) {
  if (powerUp.type === "weapon") {
    if (weaponLevel < maxWeapon) weaponLevel += 1;
    else addScore(50); // 火力已满，折算分数
  } else if (powerUp.type === "shield") {
    shield = shieldDuration;
  } else if (powerUp.type === "missile") {
    if (missileCount < maxMissiles) missileCount += 3;
    else addScore(50); // 导弹已满，折算分数
  } else if (lives < maxLives) {
    lives += 1;
    renderLives();
  } else {
    addScore(100); // 命数已满，折算分数
  }
  spawnExplosion(powerUp.x, powerUp.y, powerUp.type === "life" ? "#f1745f" : powerUp.type === "shield" ? "#0e6b62" : powerUp.type === "missile" ? "#f7c84b" : "#d8f45c", 12);
  updateHud();
}

// 距离 (x, y) 最近的屏幕内敌机
function nearestEnemy(x, y) {
  let nearest = null;
  let nearestDist = Infinity;
  for (const enemy of enemies) {
    if (enemy.y < -10) continue;
    const dist = Math.hypot(enemy.x - x, enemy.y - y);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearest = enemy;
    }
  }
  return nearest;
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

// 火力等级：1=双发 2=三发 3=五发，等级越高射速越快
const fireRates = [0, 8, 7, 6];
const weaponSpreads = [
  null,
  [-8, 8],
  [-11, 0, 11],
  [-15, -7, 0, 7, 15],
];

function fire() {
  weaponSpreads[weaponLevel].forEach((offset) => {
    bullets.push({ x: player.x + offset, y: player.y - 18, width: 3, height: 12, vx: 0 });
  });
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

  if (frameCount % fireRates[weaponLevel] === 0) fire();
  bullets = bullets.filter((bullet) => {
    bullet.x += bullet.vx || 0;
    bullet.y -= 8;
    return bullet.y > -20 && bullet.x > -20 && bullet.x < width + 20;
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
          addScore(enemy.points);
        }
        break;
      }
    }
  }

  // 道具下落与拾取
  powerUpTimer -= 1;
  if (powerUpTimer <= 0) {
    spawnPowerUp();
    powerUpTimer = 240 + Math.random() * 240; // 每 4-8 秒一件
  }
  powerUps.forEach((powerUp) => {
    powerUp.y += 1.6;
    powerUp.x += Math.sin(frameCount * 0.04 + powerUp.phase) * 0.5;
  });
  powerUps = powerUps.filter((powerUp) => powerUp.y < height + 30);
  for (const powerUp of [...powerUps]) {
    if (Math.abs(powerUp.x - player.x) < 30 && Math.abs(powerUp.y - player.y) < 30) {
      powerUps.splice(powerUps.indexOf(powerUp), 1);
      applyPowerUp(powerUp);
    }
  }

  // 追踪导弹：有目标时自动齐射（每 1.25 秒一枚）
  if (missileCount > 0) {
    if (missileCd > 0) missileCd -= 1;
    if (missileCd === 0 && enemies.some((enemy) => enemy.y > -10)) {
      missileCount -= 1;
      missileCd = missileCdMax;
      missiles.push({ x: player.x, y: player.y - 20, vx: 0, vy: -5, speed: 5, target: null });
      updateHud();
    }
  }
  missiles = missiles.filter((missile) => {
    if (!enemies.includes(missile.target)) missile.target = null;
    if (!missile.target) missile.target = nearestEnemy(missile.x, missile.y);
    if (missile.target) {
      const desired = Math.atan2(missile.target.y - missile.y, missile.target.x - missile.x);
      const current = Math.atan2(missile.vy, missile.vx);
      let diff = desired - current;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      const turn = Math.max(-0.09, Math.min(0.09, diff));
      const next = current + turn;
      missile.vx = Math.cos(next) * missile.speed;
      missile.vy = Math.sin(next) * missile.speed;
    }
    let hit = false;
    for (const enemy of [...enemies]) {
      if (Math.hypot(missile.x - enemy.x, missile.y - enemy.y) < enemy.width / 2 + 10) {
        enemy.hp -= 4;
        spawnExplosion(missile.x, missile.y, "#f7c84b", 26);
        addScore(20);
        if (enemy.hp <= 0) {
          enemies.splice(enemies.indexOf(enemy), 1);
          spawnExplosion(enemy.x, enemy.y, enemy.color, 18);
          addScore(enemy.points);
        }
        hit = true;
        break;
      }
    }
    if (hit) return false;
    if (frameCount % 3 === 0) {
      particles.push({ x: missile.x, y: missile.y, vx: 0, vy: 0.4, life: 12, size: 2.5, color: "#ffffff" });
    }
    missile.x += missile.vx;
    missile.y += missile.vy;
    return missile.y > -40 && missile.x > -40 && missile.x < width + 40;
  });

  // 后期还击：战斗机直射、轰炸机瞄准玩家
  if (frameCount > enemyFireAfter) {
    enemies.forEach((enemy) => {
      if (!enemy.fireEvery) return;
      enemy.fireCd -= 1;
      if (enemy.fireCd <= 0 && enemy.y > 40 && enemy.y < height - 140) {
        const speed = config.enemyBulletSpeed;
        if (enemy.name === "bomber") {
          const dx = player.x - enemy.x;
          const dy = player.y - enemy.y;
          const distance = Math.hypot(dx, dy) || 1;
          enemyBullets.push({ x: enemy.x, y: enemy.y + enemy.height / 2, width: 3, height: 10, vx: (dx / distance) * speed, vy: (dy / distance) * speed });
        } else {
          enemyBullets.push({ x: enemy.x, y: enemy.y + enemy.height / 2, width: 3, height: 10, vx: 0, vy: speed });
        }
        enemy.fireCd = enemy.fireEvery + Math.random() * 40;
      }
    });
  }
  enemyBullets = enemyBullets.filter((bullet) => {
    bullet.x += bullet.vx;
    bullet.y += bullet.vy;
    return bullet.y < height + 20 && bullet.x > -20 && bullet.x < width + 20;
  });

  if (invincible > 0) invincible -= 1;
  if (shield > 0) shield -= 1;

  // 敌机撞玩家
  for (const enemy of [...enemies]) {
    if (invincible === 0 && collides(enemy, player)) {
      enemies.splice(enemies.indexOf(enemy), 1);
      spawnExplosion(enemy.x, enemy.y, enemy.color, 18);
      hitPlayer();
      if (state === "over") break;
    }
  }

  // 敌弹打中玩家
  if (state === "running" && invincible === 0) {
    for (const bullet of [...enemyBullets]) {
      if (collides(bullet, player)) {
        enemyBullets.splice(enemyBullets.indexOf(bullet), 1);
        hitPlayer();
        break;
      }
    }
  }
}

// 玩家受击：护盾挡一次，否则扣命
function hitPlayer() {
  if (shield > 0) {
    shield = 0;
    invincible = 45; // 护盾碎掉后 0.75 秒宽限
    spawnExplosion(player.x, player.y, "#0e6b62", 16);
    updateHud();
    return;
  }
  lives -= 1;
  renderLives();
  if (lives <= 0) {
    spawnExplosion(player.x, player.y, "#f1745f", 40);
    state = "over";
    showGameOver();
  } else {
    invincible = 90;
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

  // 敌弹
  context.fillStyle = "#f1745f";
  enemyBullets.forEach((bullet) => {
    context.fillRect(bullet.x - bullet.width / 2, bullet.y - bullet.height / 2, bullet.width, bullet.height);
  });

  // 道具
  powerUps.forEach((powerUp) => {
    const type = powerUpTypes.find((item) => item.name === powerUp.type);
    context.fillStyle = type.color;
    context.beginPath();
    context.arc(powerUp.x, powerUp.y, 14, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = type.text;
    context.font = 'bold 14px "Noto Sans SC", sans-serif';
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(type.label, powerUp.x, powerUp.y + 1);
  });

  // 追踪导弹
  missiles.forEach((missile) => {
    context.save();
    context.translate(missile.x, missile.y);
    context.rotate(Math.atan2(missile.vy, missile.vx) + Math.PI / 2);
    context.fillStyle = "#f7c84b";
    context.fillRect(-2.5, -8, 5, 14); // 弹体
    context.beginPath();
    context.moveTo(-2.5, -8);
    context.lineTo(0, -13);
    context.lineTo(2.5, -8);
    context.closePath();
    context.fill(); // 弹头
    context.fillRect(-5, 2, 3, 5);
    context.fillRect(2, 2, 3, 5); // 尾翼
    context.fillStyle = "#18231f";
    context.fillRect(-1, -4, 2, 4); // 弹窗
    context.restore();
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

  // 护盾光环
  if (shield > 0) {
    context.strokeStyle = `rgba(14, 107, 98, ${0.55 + 0.35 * Math.sin(frameCount * 0.15)})`;
    context.lineWidth = 3;
    context.beginPath();
    context.arc(player.x, player.y, 27, 0, Math.PI * 2);
    context.stroke();
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
