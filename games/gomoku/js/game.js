const canvas = document.querySelector("#board");
const context = canvas.getContext("2d");
const statusElement = document.querySelector("#status");
const movesElement = document.querySelector("#moves");
const turnDot = document.querySelector("#turn-dot");
const size = 15;
const padding = 30;
const spacing = (canvas.width - padding * 2) / (size - 1);

let board;
let currentPlayer;
let moveCount;
let gameOver;

function resetGame() {
  board = Array.from({ length: size }, () => Array(size).fill(0));
  currentPlayer = 1;
  moveCount = 0;
  gameOver = false;
  statusElement.textContent = "黑方回合";
  movesElement.textContent = "第 1 手";
  turnDot.className = "turn-dot black";
  draw();
}

function drawBoard() {
  context.fillStyle = "#eecb91";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "rgba(62,45,25,.65)";
  context.lineWidth = 1;

  for (let index = 0; index < size; index += 1) {
    const position = padding + index * spacing;
    context.beginPath();
    context.moveTo(padding, position);
    context.lineTo(canvas.width - padding, position);
    context.stroke();
    context.beginPath();
    context.moveTo(position, padding);
    context.lineTo(position, canvas.height - padding);
    context.stroke();
  }

  [3, 7, 11].forEach((index) => {
    context.beginPath();
    context.arc(padding + index * spacing, padding + index * spacing, 4, 0, Math.PI * 2);
    context.fillStyle = "#3e2d19";
    context.fill();
  });
}

function drawStone(row, column, player) {
  const x = padding + column * spacing;
  const y = padding + row * spacing;
  const gradient = context.createRadialGradient(x - 4, y - 5, 2, x, y, 15);
  gradient.addColorStop(0, player === 1 ? "#5d6e66" : "#fff");
  gradient.addColorStop(1, player === 1 ? "#18231f" : "#cbd1ca");
  context.beginPath();
  context.arc(x, y, 15, 0, Math.PI * 2);
  context.fillStyle = gradient;
  context.fill();
  context.strokeStyle = player === 1 ? "#101916" : "#aab4ad";
  context.stroke();
}

function draw() {
  drawBoard();
  board.forEach((row, rowIndex) => {
    row.forEach((player, columnIndex) => {
      if (player) drawStone(rowIndex, columnIndex, player);
    });
  });
}

function countDirection(row, column, rowStep, columnStep) {
  let count = 0;
  let nextRow = row + rowStep;
  let nextColumn = column + columnStep;

  while (
    nextRow >= 0
    && nextRow < size
    && nextColumn >= 0
    && nextColumn < size
    && board[nextRow][nextColumn] === currentPlayer
  ) {
    count += 1;
    nextRow += rowStep;
    nextColumn += columnStep;
  }

  return count;
}

function hasWon(row, column) {
  return [[1, 0], [0, 1], [1, 1], [1, -1]].some(([rowStep, columnStep]) => (
    1
    + countDirection(row, column, rowStep, columnStep)
    + countDirection(row, column, -rowStep, -columnStep)
    >= 5
  ));
}

function placeStone(event) {
  if (gameOver) return;
  const bounds = canvas.getBoundingClientRect();
  const scale = canvas.width / bounds.width;
  const column = Math.round(((event.clientX - bounds.left) * scale - padding) / spacing);
  const row = Math.round(((event.clientY - bounds.top) * scale - padding) / spacing);

  if (row < 0 || row >= size || column < 0 || column >= size || board[row][column]) return;
  board[row][column] = currentPlayer;
  moveCount += 1;
  draw();

  if (hasWon(row, column)) {
    gameOver = true;
    statusElement.textContent = currentPlayer === 1 ? "黑方获胜" : "白方获胜";
    return;
  }
  if (moveCount === size * size) {
    gameOver = true;
    statusElement.textContent = "和棋";
    return;
  }

  currentPlayer = currentPlayer === 1 ? 2 : 1;
  statusElement.textContent = currentPlayer === 1 ? "黑方回合" : "白方回合";
  movesElement.textContent = `第 ${moveCount + 1} 手`;
  turnDot.className = `turn-dot ${currentPlayer === 1 ? "black" : "white"}`;
}

canvas.addEventListener("click", placeStone);
document.querySelector("#restart").addEventListener("click", resetGame);
resetGame();
