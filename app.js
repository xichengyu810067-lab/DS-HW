const els = {
  home: document.querySelector("#home"),
  game: document.querySelector("#game"),
  playerName: document.querySelector("#player-name"),
  startArray: document.querySelector("#start-array"),
  startList: document.querySelector("#start-list"),
  playerLine: document.querySelector("#player-line"),
  modeTitle: document.querySelector("#mode-title"),
  score: document.querySelector("#score"),
  phaseLabel: document.querySelector("#phase-label"),
  taskTitle: document.querySelector("#task-title"),
  taskText: document.querySelector("#task-text"),
  checkTask: document.querySelector("#check-task"),
  hintTask: document.querySelector("#hint-task"),
  prevStep: document.querySelector("#prev-step"),
  resetMode: document.querySelector("#reset-mode"),
  backHome: document.querySelector("#back-home"),
  legend: document.querySelector("#legend"),
  gridWrap: document.querySelector("#grid-wrap"),
  message: document.querySelector("#message"),
};

const state = {
  player: "",
  mode: "",
  score: 0,
  board: new Map(),
  palette: [],
  actionHistory: [],
  stepHistory: [],
  array: null,
  list: null,
};

els.startArray.addEventListener("click", () => startGame("array"));
els.startList.addEventListener("click", () => startGame("list"));
els.checkTask.addEventListener("click", checkCurrentTask);
els.hintTask.addEventListener("click", showHint);
els.prevStep.addEventListener("click", goBackOneStep);
els.resetMode.addEventListener("click", () => startGame(state.mode));
els.backHome.addEventListener("click", showHome);

function startGame(mode) {
  state.player = els.playerName.value.trim() || "玩家";
  state.mode = mode;
  state.score = 0;
  state.board = new Map();
  state.palette = [];
  state.actionHistory = [];
  state.stepHistory = [];
  updateScore();
  setMessage("");
  els.checkTask.disabled = false;
  els.checkTask.textContent = "檢查";
  updatePrevButton();
  els.home.classList.add("hidden");
  els.game.classList.remove("hidden");
  els.playerLine.textContent = `玩家：${state.player}`;

  if (mode === "array") {
    startArrayMode();
  } else {
    startListMode();
  }
}

function showHome() {
  els.game.classList.add("hidden");
  els.home.classList.remove("hidden");
  setMessage("");
}

function addScore(points) {
  state.score = Math.min(100, state.score + points);
  updateScore();
}

function updateScore() {
  els.score.textContent = state.score;
}

function setMessage(text, type = "") {
  els.message.textContent = text;
  els.message.className = `message ${type}`.trim();
}

function clonePlain(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function cloneArrayState(arrayState) {
  if (!arrayState) return null;
  return {
    phase: arrayState.phase,
    data: [...arrayState.data],
    task: clonePlain(arrayState.task),
    highlights: new Map(arrayState.highlights),
  };
}

function cloneListState(listState) {
  if (!listState) return null;
  return {
    phase: listState.phase,
    nodes: listState.nodes.map((node) => ({ ...node })),
    task: clonePlain(listState.task),
    highlights: new Map(listState.highlights),
  };
}

function createSnapshot() {
  return {
    mode: state.mode,
    score: state.score,
    board: new Map(state.board),
    palette: [...state.palette],
    array: cloneArrayState(state.array),
    list: cloneListState(state.list),
    phaseLabel: els.phaseLabel.textContent,
    taskTitle: els.taskTitle.textContent,
    taskText: els.taskText.textContent,
    checkDisabled: els.checkTask.disabled,
    checkText: els.checkTask.textContent,
  };
}

function restoreSnapshot(snapshot) {
  state.mode = snapshot.mode;
  state.score = snapshot.score;
  state.board = new Map(snapshot.board);
  state.palette = [...snapshot.palette];
  state.array = cloneArrayState(snapshot.array);
  state.list = cloneListState(snapshot.list);
  els.modeTitle.textContent = state.mode === "array" ? "陣列模式" : "鏈結串列模式";
  els.phaseLabel.textContent = snapshot.phaseLabel;
  els.taskTitle.textContent = snapshot.taskTitle;
  els.taskText.textContent = snapshot.taskText;
  els.checkTask.disabled = snapshot.checkDisabled;
  els.checkTask.textContent = snapshot.checkText;
  updateScore();
  renderCurrentGrid();
  updatePrevButton();
}

function rememberAction() {
  state.actionHistory.push(createSnapshot());
  updatePrevButton();
}

function rememberStep() {
  state.stepHistory.push(createSnapshot());
  state.actionHistory = [];
  updatePrevButton();
}

function clearActionHistory() {
  state.actionHistory = [];
  updatePrevButton();
}

function updatePrevButton() {
  els.prevStep.disabled = state.actionHistory.length === 0 && state.stepHistory.length === 0;
}

function goBackOneStep() {
  const snapshot = state.actionHistory.pop() || state.stepHistory.pop();
  if (!snapshot) {
    setMessage("目前沒有可以回復的上一步。", "error");
    updatePrevButton();
    return;
  }
  restoreSnapshot(snapshot);
  setMessage("已回到上一步。", "ok");
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomItem(items) {
  return items[randomInt(0, items.length - 1)];
}

function uniqueNumber(existing, min = 16, max = 99) {
  let value = randomInt(min, max);
  while (existing.includes(value)) {
    value = randomInt(min, max);
  }
  return value;
}

function keyOf(x, y) {
  return `${x},${y}`;
}

function setLegend(items) {
  els.legend.innerHTML = items
    .map(
      (item) => `
        <span class="legend-item">
          <span class="legend-swatch" style="background:${item.color}; border-color:${item.border || item.color}"></span>
          ${item.label}
        </span>
      `
    )
    .join("");
}

function setTask(title, text, phaseLabel) {
  els.phaseLabel.textContent = phaseLabel;
  els.taskTitle.textContent = title;
  els.taskText.textContent = text;
}

function makeDragPayload(source, value, key = "") {
  return JSON.stringify({ source, value: String(value), key });
}

function readDragPayload(event) {
  try {
    return JSON.parse(event.dataTransfer.getData("application/json"));
  } catch {
    return null;
  }
}

function createTile(value, source, key = "") {
  const tile = document.createElement("div");
  tile.className = "tile";
  tile.textContent = value;
  tile.draggable = true;
  tile.addEventListener("dragstart", (event) => {
    event.dataTransfer.effectAllowed = source === "cell" ? "move" : "copy";
    event.dataTransfer.setData("application/json", makeDragPayload(source, value, key));
    event.dataTransfer.setData("text/plain", String(value));
    tile.classList.add("dragging");
  });
  tile.addEventListener("dragend", () => tile.classList.remove("dragging"));
  return tile;
}

function allowDrop(event) {
  event.preventDefault();
  event.currentTarget.classList.add("drop-hover");
}

function clearDropHover(event) {
  event.currentTarget.classList.remove("drop-hover");
}

function dropOnCell(event) {
  event.preventDefault();
  clearDropHover(event);
  const payload = readDragPayload(event);
  const key = event.currentTarget.dataset.key;
  if (!payload || !key) return;

  if (payload.source === "cell" && payload.key === key) return;
  rememberAction();
  state.board.set(key, payload.value);
  if (payload.source === "cell") {
    state.board.delete(payload.key);
  }
  renderCurrentGrid();
  setMessage("已移動方塊，完成後按檢查。");
}

function dropOnTrash(event) {
  event.preventDefault();
  clearDropHover(event);
  const payload = readDragPayload(event);
  if (!payload || payload.source !== "cell") return;
  rememberAction();
  state.board.delete(payload.key);
  renderCurrentGrid();
  setMessage("已清空一格，完成後按檢查。");
}

function renderToolbox(instruction = "拖曳任務方塊到格子中。") {
  const toolbox = document.createElement("section");
  toolbox.className = "toolbox";
  toolbox.innerHTML = `<p>${instruction}</p>`;

  const tiles = document.createElement("div");
  tiles.className = "tool-tiles";
  state.palette.forEach((value) => tiles.append(createTile(value, "palette")));

  const trash = document.createElement("div");
  trash.className = "trash-zone";
  trash.textContent = "清空區";
  trash.addEventListener("dragover", allowDrop);
  trash.addEventListener("dragleave", clearDropHover);
  trash.addEventListener("drop", dropOnTrash);

  toolbox.append(tiles, trash);
  return toolbox;
}

function renderCurrentGrid() {
  if (state.mode === "array") {
    renderArrayGrid();
  } else {
    renderListGrid();
  }
}

function makeCell(key, coord, classes = []) {
  const cell = document.createElement("div");
  cell.className = ["cell", ...classes].filter(Boolean).join(" ");
  cell.dataset.key = key;
  cell.dataset.coord = coord;
  cell.addEventListener("dragover", allowDrop);
  cell.addEventListener("dragleave", clearDropHover);
  cell.addEventListener("drop", dropOnCell);

  const value = state.board.get(key);
  if (value) {
    cell.append(createTile(value, "cell", key));
  }
  return cell;
}

function boardMatches(expected) {
  for (const key of expected.keys()) {
    if ((state.board.get(key) || "") !== expected.get(key)) return false;
  }
  for (const key of state.board.keys()) {
    if (!expected.has(key) && state.board.get(key)) return false;
  }
  return true;
}

function describeCell(key) {
  if (state.mode === "array") return `第 ${Number(key) + 1} 格`;
  return `座標 ${key}`;
}

function findBoardMismatch(expected) {
  const keys = new Set([...expected.keys(), ...state.board.keys()]);
  const orderedKeys = [...keys].sort((a, b) => {
    if (state.mode === "array") return Number(a) - Number(b);
    const [ax, ay] = a.split(",").map(Number);
    const [bx, by] = b.split(",").map(Number);
    return ay - by || ax - bx;
  });

  for (const key of orderedKeys) {
    const actualValue = state.board.get(key) || "";
    const expectedValue = expected.get(key) || "";
    if (actualValue === expectedValue) continue;
    if (!expectedValue) return `${describeCell(key)} 應該是空的，目前是 ${actualValue}，請拖到清空區。`;
    if (!actualValue) return `${describeCell(key)} 少了 ${expectedValue}，請把 ${expectedValue} 拖到這一格。`;
    return `${describeCell(key)} 應該是 ${expectedValue}，目前是 ${actualValue}。`;
  }

  return "";
}

function expectedArrayTaskMap() {
  const task = state.array.task;
  const nextData = [...state.array.data];
  if (state.array.phase === "append") nextData.push(task.value);
  if (state.array.phase === "modify") nextData[task.index] = task.value;
  if (state.array.phase === "delete") nextData.splice(task.index, 1);
  if (state.array.phase === "insert") nextData.splice(task.index, 0, task.value);
  return arrayExpectedMap(nextData);
}

function arrayDataFromMap(map) {
  const values = [];
  for (let i = 0; i < 25; i += 1) {
    const value = map.get(String(i));
    if (value) values.push(Number(value));
  }
  return values;
}

function expectedListTaskMap() {
  const phase = state.list.phase;
  const task = state.list.task;
  const expected = state.list.nodes.map((node) => ({ ...node }));

  if (phase === "append") {
    expected.push({ value: task.value, x: task.target.x, y: task.target.y });
  }
  if (phase === "modify") {
    expected[task.index].value = task.value;
  }
  if (phase === "delete") {
    if (task.deleteStage === "link") return linkedBeforeDeleteCells(state.list.nodes, task.index);
    expected.splice(task.index, 1);
  }
  if (phase === "insert") {
    expected.splice(task.index + 1, 0, { value: task.value, x: task.target.x, y: task.target.y });
  }

  return nodeCells(expected);
}

function showHint() {
  if (els.checkTask.disabled) {
    setMessage("任務已完成，沒有需要修正的地方。", "ok");
    return;
  }

  const expected = state.mode === "array" ? expectedArrayTaskMap() : expectedListTaskMap();
  const mismatch = findBoardMismatch(expected);
  if (!mismatch) {
    setMessage("目前狀態看起來正確，可以按「檢查」。", "ok");
    return;
  }

  if (state.mode === "list" && state.list.phase === "delete" && state.list.task.deleteStage === "link") {
    setMessage(`提示：刪除要先建立新連結，指定節點還不能清空。${mismatch}`, "error");
    return;
  }

  setMessage(`提示：${mismatch}`, "error");
}

function arrayExpectedMap(data) {
  const expected = new Map();
  data.forEach((value, index) => expected.set(String(index), String(value)));
  return expected;
}

function arrayBoardData() {
  const values = [];
  for (let i = 0; i < 25; i += 1) {
    const value = state.board.get(String(i));
    if (value) values.push(Number(value));
  }
  return values;
}

function startArrayMode() {
  const initialData = Array.from({ length: 15 }, (_, index) => index + 1);
  state.array = {
    phase: "append",
    data: initialData,
    task: null,
    highlights: new Map(),
  };
  state.board = arrayExpectedMap(initialData);
  els.modeTitle.textContent = "陣列模式";
  setLegend([
    { color: "#fff", border: "#cdd8ca", label: "一般格" },
    { color: "#fff3d8", border: "#b77b21", label: "目標格" },
    { color: "#dceee5", border: "#2f7d5a", label: "指定空格" },
  ]);
  setArrayAppendTask();
}

function renderArrayGrid() {
  const fragment = document.createDocumentFragment();
  fragment.append(renderToolbox("系統已自動填好 1 到 15。只能拖拉方塊，不能鍵盤輸入；需要刪除內容時，把方塊拖到清空區。"));

  const grid = document.createElement("div");
  grid.className = "array-grid";
  for (let i = 0; i < 25; i += 1) {
    grid.append(makeCell(String(i), i + 1, [state.array?.highlights.get(String(i)) || ""]));
  }

  fragment.append(grid);
  els.gridWrap.innerHTML = "";
  els.gridWrap.append(fragment);
}

function setArrayAppendTask() {
  const data = state.array.data;
  const index = data.length;
  const value = uniqueNumber(data);
  state.board = arrayExpectedMap(data);
  state.palette = [String(value)];
  state.array.phase = "append";
  state.array.task = { index, value };
  state.array.highlights = new Map([[String(index), "empty-target"]]);
  setTask("新增號碼 Append", `請把新號碼 ${value} 拖到第 ${index + 1} 格，模擬陣列尾端新增。`, "任務 1 / 4");
  renderArrayGrid();
}

function setArrayModifyTask() {
  const data = state.array.data;
  const index = randomInt(0, data.length - 1);
  const value = uniqueNumber(data);
  state.board = arrayExpectedMap(data);
  state.palette = [String(value)];
  state.array.phase = "modify";
  state.array.task = { index, oldValue: data[index], value };
  state.array.highlights = new Map([[String(index), "target"]]);
  setTask("更改號碼 Modify", `請把新號碼 ${value} 拖到第 ${index + 1} 格，取代原本的 ${data[index]}。`, "任務 2 / 4");
  renderArrayGrid();
}

function setArrayDeleteTask() {
  const data = state.array.data;
  const index = randomInt(2, data.length - 3);
  state.board = arrayExpectedMap(data);
  state.palette = [];
  state.array.phase = "delete";
  state.array.task = { index, value: data[index] };
  state.array.highlights = new Map([[String(index), "target"]]);
  setTask("刪除號碼 Delete", `請刪除號碼 ${data[index]}，並把後方所有方塊逐一往左拖一格，最後一格拖到清空區。`, "任務 3 / 4");
  renderArrayGrid();
}

function setArrayInsertTask() {
  const data = state.array.data;
  const index = randomInt(1, Math.min(data.length - 2, 14));
  const value = uniqueNumber(data);
  state.board = arrayExpectedMap(data);
  state.palette = [String(value)];
  state.array.phase = "insert";
  state.array.task = { index, value };
  state.array.highlights = new Map([[String(index), "target"]]);
  setTask("插入號碼 Insert", `請先從尾端開始把第 ${index + 1} 格及後方資料往右拖一格，再把新號碼 ${value} 拖入第 ${index + 1} 格。`, "任務 4 / 4");
  renderArrayGrid();
}

function checkArrayTask() {
  const expectedMap = expectedArrayTaskMap();

  if (!boardMatches(expectedMap)) {
    setMessage("目前陣列狀態還不正確，請用拖拉完成必要的取代、搬移或清空。", "error");
    return;
  }

  rememberStep();
  state.array.data = arrayDataFromMap(expectedMap);
  addScore(25);
  setMessage("任務完成。", "ok");

  if (state.array.phase === "append") setArrayModifyTask();
  else if (state.array.phase === "modify") setArrayDeleteTask();
  else if (state.array.phase === "delete") setArrayInsertTask();
  else finishMode("陣列模式完成：你已用拖拉方式模擬新增、修改、刪除與插入。");
}

function startListMode() {
  const nodes = createInitialNodes();
  state.list = {
    phase: "append",
    nodes,
    task: null,
    highlights: new Map(),
  };
  state.board = nodeCells(nodes);
  els.modeTitle.textContent = "鏈結串列模式";
  setLegend([
    { color: "#fdfefe", border: "#cdd8ca", label: "Data 格" },
    { color: "#eef5ff", border: "#b7c9e7", label: "Pointer 格" },
    { color: "#e9e0ff", border: "#7b61c9", label: "HEAD 指向的第一筆資料" },
    { color: "#fff3d8", border: "#b77b21", label: "需要修改" },
    { color: "#dceee5", border: "#2f7d5a", label: "指定空地" },
  ]);
  setListAppendTask();
}

function createInitialNodes() {
  const occupied = new Set();
  const nodes = [];

  for (let i = 1; i <= 15; i += 1) {
    let x = randomInt(1, 9);
    let y = randomInt(1, 10);
    while (occupied.has(keyOf(x, y)) || occupied.has(keyOf(x + 1, y))) {
      x = randomInt(1, 9);
      y = randomInt(1, 10);
    }
    occupied.add(keyOf(x, y));
    occupied.add(keyOf(x + 1, y));
    nodes.push({ value: i, x, y });
  }

  return nodes;
}

function nodePointer(nodes, index) {
  const next = nodes[index + 1];
  return next ? keyOf(next.x, next.y) : "NULL";
}

function nodeCells(nodes) {
  const map = new Map();
  nodes.forEach((node, index) => {
    map.set(keyOf(node.x, node.y), String(node.value));
    map.set(keyOf(node.x + 1, node.y), nodePointer(nodes, index));
  });
  return map;
}

function linkedBeforeDeleteCells(nodes, index) {
  const map = nodeCells(nodes);
  const prev = nodes[index - 1];
  const next = nodes[index + 1];
  map.set(keyOf(prev.x + 1, prev.y), keyOf(next.x, next.y));
  return map;
}

function occupiedKeys(nodes) {
  const keys = new Set();
  nodes.forEach((node) => {
    keys.add(keyOf(node.x, node.y));
    keys.add(keyOf(node.x + 1, node.y));
  });
  return keys;
}

function findEmptyPair(nodes) {
  const occupied = occupiedKeys(nodes);
  const candidates = [];
  for (let y = 1; y <= 10; y += 1) {
    for (let x = 1; x <= 9; x += 1) {
      if (!occupied.has(keyOf(x, y)) && !occupied.has(keyOf(x + 1, y))) {
        candidates.push({ x, y });
      }
    }
  }
  return randomItem(candidates);
}

function renderListGrid() {
  const fragment = document.createDocumentFragment();
  const head = state.list.nodes[0];
  fragment.append(renderToolbox(`HEAD 指向第一筆資料：座標 ${keyOf(head.x, head.y)}。串列模式由系統自動填好 1 到 15；玩家只能拖拉任務方塊與既有方塊。`));

  const pointerKeys = new Set();
  const dataKeys = new Set();
  state.list.nodes.forEach((node) => {
    dataKeys.add(keyOf(node.x, node.y));
    pointerKeys.add(keyOf(node.x + 1, node.y));
  });

  const grid = document.createElement("div");
  grid.className = "list-grid";
  for (let y = 1; y <= 10; y += 1) {
    for (let x = 1; x <= 10; x += 1) {
      const key = keyOf(x, y);
      const classes = [];
      if (dataKeys.has(key)) classes.push("data-cell");
      if (pointerKeys.has(key)) classes.push("pointer-cell");
      if (key === keyOf(head.x, head.y)) classes.push("head-cell");
      if (state.list.highlights.has(key)) classes.push(state.list.highlights.get(key));
      grid.append(makeCell(key, key, classes));
    }
  }

  fragment.append(grid);
  els.gridWrap.innerHTML = "";
  els.gridWrap.append(fragment);
}

function existingListNumbers() {
  return state.list.nodes.map((node) => node.value);
}

function setListAppendTask() {
  const nodes = state.list.nodes;
  const tail = nodes[nodes.length - 1];
  const target = findEmptyPair(nodes);
  const value = uniqueNumber(existingListNumbers());
  state.board = nodeCells(nodes);
  state.palette = [String(value), keyOf(target.x, target.y), "NULL"];
  state.list.phase = "append";
  state.list.task = { target, value };
  state.list.highlights = new Map([
    [keyOf(target.x, target.y), "empty-target"],
    [keyOf(target.x + 1, target.y), "empty-target"],
    [keyOf(tail.x + 1, tail.y), "target"],
  ]);
  setTask("新增節點 Append", `系統已建立 1 到 15。請把 ${value} 拖到 ${keyOf(target.x, target.y)}，把 ${keyOf(target.x, target.y)} 拖到原最後節點指標格，並把 NULL 拖到新節點右格。`, "任務 1 / 4");
  renderListGrid();
}

function setListModifyTask() {
  const nodes = state.list.nodes;
  const index = randomInt(0, nodes.length - 1);
  const node = nodes[index];
  const value = uniqueNumber(existingListNumbers());
  state.board = nodeCells(nodes);
  state.palette = [String(value)];
  state.list.phase = "modify";
  state.list.task = { index, oldValue: node.value, value };
  state.list.highlights = new Map([[keyOf(node.x, node.y), "target"]]);
  setTask("更改節點 Modify", `請把新號碼 ${value} 拖到座標 ${keyOf(node.x, node.y)}，取代原本的 ${node.value}。`, "任務 2 / 4");
  renderListGrid();
}

function setListDeleteTask() {
  const nodes = state.list.nodes;
  const index = randomInt(1, nodes.length - 2);
  const prev = nodes[index - 1];
  const node = nodes[index];
  const next = nodes[index + 1];
  state.board = nodeCells(nodes);
  state.palette = [keyOf(next.x, next.y)];
  state.list.phase = "delete";
  state.list.task = { index, deleteStage: "link" };
  state.list.highlights = new Map([
    [keyOf(prev.x + 1, prev.y), "target"],
  ]);
  setTask("刪除節點 Delete：建立新連結", `第一步先建立 Bypass：請把 ${keyOf(next.x, next.y)} 拖到前一節點 ${prev.value} 的 Pointer 格。節點 ${node.value} 目前不能刪，必須先保留。`, "任務 3 / 4");
  renderListGrid();
}

function setListDeleteClearStage() {
  const nodes = state.list.nodes;
  const index = state.list.task.index;
  const prev = nodes[index - 1];
  const node = nodes[index];
  state.palette = [];
  state.list.task.deleteStage = "clear";
  state.list.highlights = new Map([
    [keyOf(prev.x + 1, prev.y), "target"],
    [keyOf(node.x, node.y), "deleted-cell"],
    [keyOf(node.x + 1, node.y), "deleted-cell"],
  ]);
  setTask("刪除節點 Delete：刪除指定資料", `第二步再刪除節點 ${node.value}：請把它的 Data 與 Pointer 方塊拖到清空區。`, "任務 3 / 4");
  renderListGrid();
}

function setListInsertTask() {
  const nodes = state.list.nodes;
  const index = randomInt(0, nodes.length - 2);
  const a = nodes[index];
  const b = nodes[index + 1];
  const target = findEmptyPair(nodes);
  const value = uniqueNumber(existingListNumbers());
  state.board = nodeCells(nodes);
  state.palette = [String(value), keyOf(target.x, target.y), keyOf(b.x, b.y)];
  state.list.phase = "insert";
  state.list.task = { index, target, value };
  state.list.highlights = new Map([
    [keyOf(a.x + 1, a.y), "target"],
    [keyOf(target.x, target.y), "empty-target"],
    [keyOf(target.x + 1, target.y), "empty-target"],
  ]);
  setTask("插入節點 Insert", `請在節點 ${a.value} 與 ${b.value} 之間插入 ${value}：新節點左格放 ${value}，節點 ${a.value} 指向 ${keyOf(target.x, target.y)}，新節點指向 ${keyOf(b.x, b.y)}。`, "任務 4 / 4");
  renderListGrid();
}

function checkListTask() {
  const phase = state.list.phase;
  const task = state.list.task;
  const expected = state.list.nodes.map((node) => ({ ...node }));

  if (phase === "append") {
    expected.push({ value: task.value, x: task.target.x, y: task.target.y });
  }
  if (phase === "modify") {
    expected[task.index].value = task.value;
  }
  if (phase === "delete") {
    if (task.deleteStage === "link") {
      if (!boardMatches(linkedBeforeDeleteCells(state.list.nodes, task.index))) {
        setMessage("刪除順序不正確：請先只改前一節點的 Pointer，指定節點的 Data 與 Pointer 仍要保留。", "error");
        return;
      }

      rememberStep();
      setListDeleteClearStage();
      setMessage("新連結已建立。現在可以刪除指定節點。", "ok");
      return;
    }
    expected.splice(task.index, 1);
  }
  if (phase === "insert") {
    expected.splice(task.index + 1, 0, { value: task.value, x: task.target.x, y: task.target.y });
  }

  if (!boardMatches(expectedListTaskMap())) {
    setMessage("目前鏈結串列狀態還不正確，請確認資料格、指標格、清空格都已用拖拉完成。", "error");
    return;
  }

  rememberStep();
  state.list.nodes = expected;
  addScore(25);
  setMessage("任務完成。", "ok");

  if (phase === "append") setListModifyTask();
  else if (phase === "modify") setListDeleteTask();
  else if (phase === "delete") setListInsertTask();
  else finishMode("鏈結串列模式完成：你已用拖拉方式模擬新增、修改、刪除與插入時的指標變更。");
}

function finishMode(text) {
  state.palette = [];
  els.phaseLabel.textContent = "完成";
  els.taskTitle.textContent = "所有任務完成";
  els.taskText.textContent = text;
  els.checkTask.disabled = true;
  els.checkTask.textContent = "已完成";
  renderCurrentGrid();
  setMessage("可以重新開始同一模式，或回首頁切換模式。", "ok");
}

function checkCurrentTask() {
  if (state.mode === "array") {
    checkArrayTask();
  } else if (state.mode === "list") {
    checkListTask();
  }
}
