const canvas = document.querySelector("#board");
const context = canvas.getContext("2d");
const nextCanvas = document.querySelector("#next");
const nextContext = nextCanvas.getContext("2d");
const overlay = document.querySelector("#overlay");
const overlayTitle = document.querySelector("#overlay-title");
const overlayCopy = document.querySelector("#overlay-copy");
const scoreElement = document.querySelector("#score");
const linesElement = document.querySelector("#lines");

const columns = 10;
const rows = 20;
const cellSize = 30;
const colors = [null, "#f1745f", "#f7c84b", "#d8f45c", "#49b5a5", "#7b8ff2", "#e988c0", "#f7a34b"];
const shapes = [
  [[1, 1, 1, 1]],
  [[2, 2], [2, 2]],
  [[0, 3, 0], [3, 3, 3]],
  [[0, 4, 4], [4, 4, 0]],
  [[5, 5, 0], [0, 5, 5]],
  [[6, 0, 0], [6, 6, 6]],
  [[0, 0, 7], [7, 7, 7]],
];

let board;
let piece;
let nextPiece;
let score;
let lines;
let dropCounter;
let lastTime;
let animationFrame;
let playing = false;

function createBoard() {
  return Array.from({ length: rows }, () => Array(columns).fill(0));
}

function createPiece() {
  const shape = shapes[Math.floor(Math.random() * shapes.length)].map((row) => [...row]);
  return {
    shape,
    x: Math.floor((columns - shape[0].length) / 2),
    y: 0,
  };
}

function drawCell(target, x, y, color, size = cellSize) {
  target.fillStyle = color;
  target.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
}

function drawMatrix(target, matrix, offset, size = cellSize) {
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) drawCell(target, x + offset.x, y + offset.y, colors[value], size);
    });
  });
}

function draw() {
  context.clearRect(0, 0, canvas.width, canvas.height);
  drawMatrix(context, board, { x: 0, y: 0 });
  drawMatrix(context, piece.shape, piece);
}

function drawNext() {
  nextContext.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  const offset = {
    x: (4 - nextPiece.shape[0].length) / 2,
    y: (3 - nextPiece.shape.length) / 2,
  };
  drawMatrix(nextContext, nextPiece.shape, offset, 25);
}

function collides() {
  return piece.shape.some((row, y) => row.some((value, x) => (
    value && (
      board[y + piece.y]?.[x + piece.x] !== 0
      || x + piece.x < 0
      || x + piece.x >= columns
      || y + piece.y >= rows
    )
  )));
}

function merge() {
  piece.shape.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) board[y + piece.y][x + piece.x] = value;
    });
  });
}

function rotate() {
  const matrix = piece.shape.map((_, index) => piece.shape.map((row) => row[index]).reverse());
  const oldShape = piece.shape;
  piece.shape = matrix;
  if (collides()) piece.shape = oldShape;
}

function clearLines() {
  let cleared = 0;

  for (let y = rows - 1; y >= 0; y -= 1) {
    if (board[y].every(Boolean)) {
      board.splice(y, 1);
      board.unshift(Array(columns).fill(0));
      cleared += 1;
      y += 1;
    }
  }

  if (cleared) {
    lines += cleared;
    score += [0, 100, 300, 500, 800][cleared];
    scoreElement.textContent = score;
    linesElement.textContent = lines;
  }
}

function drop() {
  piece.y += 1;
  if (collides()) {
    piece.y -= 1;
    merge();
    clearLines();
    piece = nextPiece;
    nextPiece = createPiece();
    drawNext();
    if (collides()) endGame();
  }
  dropCounter = 0;
}

function startGame() {
  cancelAnimationFrame(animationFrame);
  board = createBoard();
  piece = createPiece();
  nextPiece = createPiece();
  score = 0;
  lines = 0;
  dropCounter = 0;
  lastTime = 0;
  playing = true;
  scoreElement.textContent = "0";
  linesElement.textContent = "0";
  overlay.hidden = true;
  drawNext();
  update();
}

function endGame() {
  playing = false;
  overlayTitle.textContent = "游戏结束";
  overlayCopy.textContent = `最终得分 ${score}`;
  overlay.querySelector("#start").textContent = "再来一局";
  overlay.hidden = false;
}

function update(time = 0) {
  if (!playing) return;
  const delta = time - lastTime;
  lastTime = time;
  dropCounter += delta;
  if (dropCounter > Math.max(120, 800 - lines * 35)) drop();
  draw();
  animationFrame = requestAnimationFrame(update);
}

document.querySelector("#start").addEventListener("click", startGame);
document.querySelector("#restart").addEventListener("click", startGame);
document.addEventListener("keydown", (event) => {
  if (!playing && ["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", " "].includes(event.key)) {
    startGame();
    return;
  }
  if (!playing) return;
  if (["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", " "].includes(event.key)) event.preventDefault();
  if (event.key === "ArrowLeft") { piece.x -= 1; if (collides()) piece.x += 1; }
  if (event.key === "ArrowRight") { piece.x += 1; if (collides()) piece.x -= 1; }
  if (event.key === "ArrowDown") drop();
  if (event.key === "ArrowUp") rotate();
  if (event.key === " ") { while (!collides()) piece.y += 1; piece.y -= 1; drop(); }
  draw();
});

board = createBoard();
piece = createPiece();
nextPiece = createPiece();
draw();
drawNext();
