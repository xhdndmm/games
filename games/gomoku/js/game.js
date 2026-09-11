const canvas = document.querySelector("#board");
const context = canvas.getContext("2d");
const statusElement = document.querySelector("#status");
const movesElement = document.querySelector("#moves");
const turnDot = document.querySelector("#turn-dot");
const ruleText = document.querySelector("#rule-text");
const modeButtons = document.querySelectorAll(".mode-button");
const size = 15;
const padding = 30;
const spacing = (canvas.width - padding * 2) / (size - 1);

let board;
let currentPlayer;
let moveCount;
let gameOver;
let gameMode;
let aiTimer;

function resetGame() {
  board = Array.from({ length: size }, () => Array(size).fill(0));
  currentPlayer = 1;
  moveCount = 0;
  gameOver = false;
  clearTimeout(aiTimer);
  aiTimer = null;
  updateModeText();
  updateTurnStatus();
  draw();
}

function updateModeText() {
  ruleText.textContent = gameMode === "ai" ? "黑方：你 / 白方：电脑，黑方先手" : "黑方先手";
  modeButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.mode === gameMode);
  });
}

function updateTurnStatus() {
  if (gameOver) return;
  const status = currentPlayer === 1 ? "黑方回合" : "白方回合";
  statusElement.textContent = gameMode === "ai" && currentPlayer === 2 ? "电脑思考中..." : status;
  movesElement.textContent = `第 ${moveCount + 1} 手`;
  turnDot.className = `turn-dot ${currentPlayer === 1 ? "black" : "white"}`;
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

function countDirection(row, column, rowStep, columnStep, player) {
  let count = 0;
  let nextRow = row + rowStep;
  let nextColumn = column + columnStep;

  while (
    nextRow >= 0
    && nextRow < size
    && nextColumn >= 0
    && nextColumn < size
    && board[nextRow][nextColumn] === player
  ) {
    count += 1;
    nextRow += rowStep;
    nextColumn += columnStep;
  }

  return count;
}

function hasWon(row, column, player) {
  return [[1, 0], [0, 1], [1, 1], [1, -1]].some(([rowStep, columnStep]) => (
    1
    + countDirection(row, column, rowStep, columnStep, player)
    + countDirection(row, column, -rowStep, -columnStep, player)
    >= 5
  ));
}

function getEmptyCells() {
  const cells = [];

  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      if (!board[row][column]) {
        cells.push({ row, column });
      }
    }
  }

  return cells;
}

function getLineScore(row, column, player) {
  let score = 0;

  [[1, 0], [0, 1], [1, 1], [1, -1]].forEach(([rowStep, columnStep]) => {
    let count = 1;
    let openEnds = 0;

    for (const direction of [1, -1]) {
      let nextRow = row + rowStep * direction;
      let nextColumn = column + columnStep * direction;

      while (
        nextRow >= 0
        && nextRow < size
        && nextColumn >= 0
        && nextColumn < size
        && board[nextRow][nextColumn] === player
      ) {
        count += 1;
        nextRow += rowStep * direction;
        nextColumn += columnStep * direction;
      }

      if (
        nextRow >= 0
        && nextRow < size
        && nextColumn >= 0
        && nextColumn < size
        && board[nextRow][nextColumn] === 0
      ) {
        openEnds += 1;
      }
    }

    if (count >= 5) {
      score += 100000;
    } else if (count === 4 && openEnds >= 1) {
      score += 5000;
    } else if (count === 3 && openEnds >= 1) {
      score += 500;
    } else if (count === 2 && openEnds >= 1) {
      score += 50;
    } else if (count === 1) {
      score += 5;
    }
  });

  return score;
}

function getWinningMoves(player) {
  const winningMoves = [];

  getEmptyCells().forEach(({ row, column }) => {
    board[row][column] = player;
    if (hasWon(row, column, player)) {
      winningMoves.push({ row, column });
    }
    board[row][column] = 0;
  });

  return winningMoves;
}

function chooseBestMove() {
  const aiPlayer = 2;
  const humanPlayer = 1;
  const immediateWin = getWinningMoves(aiPlayer);
  if (immediateWin.length > 0) {
    return immediateWin[0];
  }

  const blockingMoves = getWinningMoves(humanPlayer);
  if (blockingMoves.length > 0) {
    return blockingMoves.sort((left, right) => {
      const leftDistance = Math.abs(left.row - 7) + Math.abs(left.column - 7);
      const rightDistance = Math.abs(right.row - 7) + Math.abs(right.column - 7);
      return leftDistance - rightDistance;
    })[0];
  }

  const candidates = getEmptyCells().map(({ row, column }) => {
    let score = getLineScore(row, column, aiPlayer) - getLineScore(row, column, humanPlayer) * 1.4;
    score += 18 - (Math.abs(row - 7) + Math.abs(column - 7));
    return { row, column, score };
  });

  candidates.sort((left, right) => right.score - left.score);
  return candidates[0] || null;
}

function applyMove(row, column, player) {
  if (gameOver || row < 0 || row >= size || column < 0 || column >= size || board[row][column]) {
    return false;
  }

  board[row][column] = player;
  moveCount += 1;
  draw();

  if (hasWon(row, column, player)) {
    gameOver = true;
    statusElement.textContent = player === 1 ? "黑方获胜" : "白方获胜";
    movesElement.textContent = `第 ${moveCount} 手`;
    turnDot.className = `turn-dot ${player === 1 ? "black" : "white"}`;
    return true;
  }

  if (moveCount === size * size) {
    gameOver = true;
    statusElement.textContent = "和棋";
    return true;
  }

  currentPlayer = currentPlayer === 1 ? 2 : 1;
  updateTurnStatus();
  return true;
}

function scheduleAiMove() {
  if (gameOver || gameMode !== "ai" || currentPlayer !== 2) {
    return;
  }

  clearTimeout(aiTimer);
  aiTimer = setTimeout(() => {
    const move = chooseBestMove();
    if (!move) return;

    applyMove(move.row, move.column, 2);
    if (!gameOver && gameMode === "ai" && currentPlayer === 1) {
      updateTurnStatus();
    }
  }, 300);
}

function placeStone(event) {
  if (gameOver || gameMode === "ai" && currentPlayer === 2) return;
  const bounds = canvas.getBoundingClientRect();
  const scale = canvas.width / bounds.width;
  const column = Math.round(((event.clientX - bounds.left) * scale - padding) / spacing);
  const row = Math.round(((event.clientY - bounds.top) * scale - padding) / spacing);

  if (!applyMove(row, column, currentPlayer)) return;

  if (!gameOver && gameMode === "ai" && currentPlayer === 2) {
    scheduleAiMove();
  }
}

function setGameMode(mode) {
  gameMode = mode;
  updateModeText();
  resetGame();
}

canvas.addEventListener("click", placeStone);
document.querySelector("#restart").addEventListener("click", () => resetGame());
modeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setGameMode(button.dataset.mode);
  });
});

gameMode = "pvp";
resetGame();
