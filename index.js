//游戏列表库，请在添加/更新游戏时适当修改这里以及readme文件
const games = [
  {
    title: "俄罗斯方块",
    englishTitle: "TETRIS",
    category: "街机",
    tags: ["街机", "经典"],
    description: "旋转、排列，让每一行都刚刚好。",
    icon: "▦",
    path: "games/tetris/index.html",
    available: true,
  },
  {
    title: "五子棋",
    englishTitle: "GOMOKU",
    category: "棋类",
    tags: ["棋类", "对战"],
    description: "三分钟学会，下一盘需要一点策略。",
    icon: "◉",
    path: "games/gomoku/index.html",
    available: true,
  },
  {
    title: "贪吃蛇",
    englishTitle: "SNAKE",
    category: "益智",
    tags: ["益智", "反应"],
    description: "吃掉每一个方块，别撞到自己。",
    icon: "⌁",
    path: "games/snake/index.html",
    available: true,
  },
];

const gameGrid = document.querySelector("#game-grid");
const searchInput = document.querySelector("#game-search");
const clearSearch = document.querySelector("#clear-search");
const resetSearch = document.querySelector("#reset-search");
const emptyState = document.querySelector("#empty-state");
const gameCount = document.querySelector("#game-count");
const resultNote = document.querySelector("#result-note");
const filterButtons = document.querySelectorAll(".filter-button");

let activeFilter = "全部";

function cardTemplate(game, index) {
  const action = game.available
    ? `<a class="play-link" href="${game.path}">开始游戏 <span aria-hidden="true">↗</span></a>`
    : `<span class="play-link disabled">即将上线</span>`;

  return `
    <article class="game-card" style="animation-delay: ${index * 70}ms">
      <div class="game-visual">
        <span class="visual-pattern"></span>
        <span class="game-label">${game.englishTitle}</span>
        <span class="visual-icon" aria-hidden="true">${game.icon}</span>
      </div>
      <div class="game-content">
        <div class="game-meta">
          <span>01 / 03</span>
          <span>${game.available ? "可游玩" : "准备中"}</span>
        </div>
        <h3 class="game-title">${game.title}</h3>
        <p class="game-description">${game.description}</p>
        <div class="game-footer">
          <div class="tags">
            ${game.tags.map((tag) => `<span class="tag">${tag}</span>`).join("")}
          </div>
          ${action}
        </div>
      </div>
    </article>`;
}

function renderGames() {
  const keyword = searchInput.value.trim().toLowerCase();
  const visibleGames = games.filter((game) => {
    const matchesFilter = activeFilter === "全部" || game.category === activeFilter;
    const searchText = `${game.title} ${game.englishTitle} ${game.description} ${game.tags.join(" ")}`.toLowerCase();

    return matchesFilter && searchText.includes(keyword);
  });

  gameGrid.innerHTML = visibleGames.map(cardTemplate).join("");
  emptyState.hidden = visibleGames.length !== 0;
  gameCount.textContent = String(visibleGames.length).padStart(2, "0");
  resultNote.textContent = keyword || activeFilter !== "全部"
    ? `找到 ${visibleGames.length} 款小游戏`
    : `探索 ${games.length} 款小游戏`;
  clearSearch.hidden = !keyword;
}

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    filterButtons.forEach((item) => item.classList.toggle("active", item === button));
    renderGames();
  });
});

searchInput.addEventListener("input", renderGames);

clearSearch.addEventListener("click", () => {
  searchInput.value = "";
  searchInput.focus();
  renderGames();
});

resetSearch.addEventListener("click", () => {
  activeFilter = "全部";
  searchInput.value = "";
  filterButtons.forEach((button) => button.classList.toggle("active", button.dataset.filter === "全部"));
  renderGames();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "/" && document.activeElement !== searchInput) {
    event.preventDefault();
    searchInput.focus();
  }
});

renderGames();
