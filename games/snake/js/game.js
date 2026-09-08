const canvas = document.querySelector("#board");
const context = canvas.getContext("2d");
const overlay = document.querySelector("#overlay");
const overlayTitle = document.querySelector("#overlay-title");
const overlayCopy = document.querySelector("#overlay-copy");
const scoreElement = document.querySelector("#score");
const bestElement = document.querySelector("#best");
const cells = 16;
const cellSize = canvas.width / cells;

let snake;
let food;
let direction;
let nextDirection;
let score;
let best = Number(localStorage.getItem("snake-best") || 0);
let timer;
let playing = false;

bestElement.textContent = best;

function randomFood() {
  let position;
  do {
    position = {
      x: Math.floor(Math.random() * cells),
      y: Math.floor(Math.random() * cells),
    };
  } while (snake.some((part) => part.x === position.x && part.y === position.y));
  return position;
}

function drawCell(position, color, radius = 4) {
  context.fillStyle = color;
  context.beginPath();
  context.roundRect(position.x * cellSize + 3, position.y * cellSize + 3, cellSize - 6, cellSize - 6, radius);
  context.fill();
}

function draw() {
  context.clearRect(0, 0, canvas.width, canvas.height);
  drawCell(food, "#f7c84b", 8);
  snake.forEach((part, index) => drawCell(part, index === 0 ? "#d8f45c" : "#49b5a5", 5));
}

function startGame() {
  clearInterval(timer);
  snake = [{ x: 7, y: 8 }, { x: 6, y: 8 }, { x: 5, y: 8 }];
  direction = { x: 1, y: 0 };
  nextDirection = direction;
  score = 0;
  scoreElement.textContent = "0";
  food = randomFood();
  playing = true;
  overlay.hidden = true;
  draw();
  timer = setInterval(tick, 125);
}

function finishGame() {
  clearInterval(timer);
  playing = false;
  overlayTitle.textContent = "游戏结束";
  overlayCopy.textContent = `本局得分 ${score}`;
  overlay.querySelector("#start").textContent = "再来一局";
  overlay.hidden = false;
}

function tick() {
  direction = nextDirection;
  const head = {
    x: snake[0].x + direction.x,
    y: snake[0].y + direction.y,
  };
  const hitWall = head.x < 0 || head.x >= cells || head.y < 0 || head.y >= cells;
  const hitSelf = snake.some((part) => part.x === head.x && part.y === head.y);

  if (hitWall || hitSelf) {
    finishGame();
    return;
  }

  snake.unshift(head);
  if (head.x === food.x && head.y === food.y) {
    score += 10;
    scoreElement.textContent = score;
    if (score > best) {
      best = score;
      bestElement.textContent = best;
      localStorage.setItem("snake-best", best);
    }
    food = randomFood();
  } else {
    snake.pop();
  }
  draw();
}

function setDirection(name) {
  const directions = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  };
  const selected = directions[name];
  if (!selected || (selected.x === -direction.x && selected.y === -direction.y)) return;
  nextDirection = selected;
  if (!playing) startGame();
}

document.querySelector("#start").addEventListener("click", startGame);
document.querySelector("#restart").addEventListener("click", startGame);
document.querySelectorAll("[data-direction]").forEach((button) => {
  button.addEventListener("click", () => setDirection(button.dataset.direction));
});
document.addEventListener("keydown", (event) => {
  const keys = {
    ArrowUp: "up",
    w: "up",
    ArrowDown: "down",
    s: "down",
    ArrowLeft: "left",
    a: "left",
    ArrowRight: "right",
    d: "right",
  };
  if (keys[event.key]) {
    event.preventDefault();
    setDirection(keys[event.key]);
  }
});

snake = [{ x: 7, y: 8 }, { x: 6, y: 8 }, { x: 5, y: 8 }];
food = { x: 11, y: 8 };
draw();
