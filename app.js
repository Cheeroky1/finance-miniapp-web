const tg = window.Telegram?.WebApp;
if (tg) tg.expand();

const subtitle = document.getElementById("subtitle");
const toastEl = document.getElementById("toast");

function showToast(text){
  toastEl.textContent = text;
  toastEl.classList.add("show");
  setTimeout(() => toastEl.classList.remove("show"), 2000);
}

function closeKeyboard(){
  const el = document.activeElement;
  if (el && typeof el.blur === "function") el.blur();
}

// ===== Storage =====
const LS_KEYS = {
  ops: "fm_ops_v1",
  goals: "fm_goals_v1",
};

function loadOps(){
  try { return JSON.parse(localStorage.getItem(LS_KEYS.ops) || "[]"); }
  catch { return []; }
}

function saveOps(ops){
  localStorage.setItem(LS_KEYS.ops, JSON.stringify(ops));
}

function loadGoals(){
  try { return JSON.parse(localStorage.getItem(LS_KEYS.goals) || "[]"); }
  catch { return []; }
}

function saveGoals(goals){
  localStorage.setItem(LS_KEYS.goals, JSON.stringify(goals));
}

function uid(){
  return (crypto?.randomUUID?.() || (Date.now().toString(36) + Math.random().toString(36).slice(2)));
}

function formatRUB(n){
  const v = Number(n || 0);
  return Math.round(v).toLocaleString("ru-RU");
}

function todayISO(){
  const d = new Date();
  const pad = (x) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

function monthKey(dIso){
  return (dIso || "").slice(0,7);
}

const CATEGORIES = [
  "Продукты 🍎",
  "Коммунальные услуги 🏠",
  "Транспорт 🚕",
  "Связь/интернет 🛜",
  "Животные 🐱",
  "Здоровье 💊",
  "Привычки 🚬",
  "Красота 🪒",
  "Кредиты 💳",
  "Развлечения 🎭",
  "Прочее 🧩",
];

function fillCategories(selectId){
  const sel = document.getElementById(selectId);
  sel.innerHTML = "";
  for (const c of CATEGORIES){
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    sel.appendChild(opt);
  }
}

// ===== Screens =====
const screens = {
  menu: document.getElementById("screen-menu"),
  month: document.getElementById("screen-month"),
  income: document.getElementById("screen-income"),
  expense: document.getElementById("screen-expense"),
  history: document.getElementById("screen-history"),
  piggy: document.getElementById("screen-piggy"),
};

const titles = {
  menu: "Меню",
  month: "Месяц",
  income: "Доход",
  expense: "Расход",
  history: "История",
  piggy: "Копилка",
};

function showScreen(name){
  Object.values(screens).forEach(s => {
    s.classList.remove("active");
    s.classList.remove("visible");
  });

  const el = screens[name];
  el.classList.add("active");
  requestAnimationFrame(() => el.classList.add("visible"));
  subtitle.textContent = titles[name] || "";
}

document.querySelectorAll("[data-nav]").forEach(btn => {
  btn.addEventListener("click", () => {
    const name = btn.getAttribute("data-nav");
    showScreen(name);
    tg?.HapticFeedback?.selectionChanged();

    // small UX touches
    if (name === "income") setTimeout(() => document.getElementById("incomeAmount")?.focus(), 120);
    if (name === "expense") setTimeout(() => document.getElementById("expenseAmount")?.focus(), 120);
    if (name === "month") renderMonth();
    if (name === "history") renderHistory();
    if (name === "piggy") renderPiggy();
  });
});

document.querySelectorAll("[data-back]").forEach(btn => {
  btn.addEventListener("click", () => {
    showScreen("menu");
    tg?.HapticFeedback?.selectionChanged();
  });
});

// ===== Modal (minimal) =====
const modal = document.getElementById("modal");
const modalTitle = document.getElementById("modalTitle");
const modalBody = document.getElementById("modalBody");
const modalActions = document.getElementById("modalActions");

function openModal({title, bodyNode, actions}){
  modalTitle.textContent = title || "";
  modalBody.innerHTML = "";
  modalBody.appendChild(bodyNode);

  modalActions.innerHTML = "";
  actions.forEach(a => modalActions.appendChild(a));

  modal.classList.add("show");
}

function closeModal(){
  modal.classList.remove("show");
}

modal.addEventListener("click", (e) => {
  if (e.target === modal) closeModal();
});

// ===== Form helpers =====
function getNumberValue(id){
  const v = (document.getElementById(id).value || "").replace(",", ".");
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

function getTextValue(id){
  return (document.getElementById(id).value || "").trim();
}

function clearInputs(ids){
  ids.forEach(id => (document.getElementById(id).value = ""));
}

function setEnabled(btn, enabled){
  btn.disabled = !enabled;
}

function wireAmountToButton(amountInputId, btnId){
  const input = document.getElementById(amountInputId);
  const btn = document.getElementById(btnId);

  const update = () => {
    const v = (input.value || "").trim();
    const n = Number(v.replace(",", "."));
    setEnabled(btn, Number.isFinite(n) && n > 0);
  };

  input.addEventListener("input", update);
  input.addEventListener("change", update);
  update();
}

// ===== Create operation (local only for now) =====
function addOperation({type, amount, category, comment}){
  const ops = loadOps();
  ops.push({
    id: uid(),
    ts: new Date().toISOString(),
    date: todayISO(),
    type,
    amount: Number(amount),
    currency: "RUB",
    category,
    comment: comment || "",
  });
  saveOps(ops);
}

// ===== Income / Expense =====
fillCategories("incomeCategory");
fillCategories("expenseCategory");

// Preselect sensible defaults
document.getElementById("incomeCategory").value = "Прочее 🧩";
document.getElementById("expenseCategory").value = "Продукты 🍎";

wireAmountToButton("incomeAmount", "incomeSave");
wireAmountToButton("expenseAmount", "expenseSave");

document.getElementById("incomeSave").addEventListener("click", () => {
  const amount = getNumberValue("incomeAmount");
  const category = document.getElementById("incomeCategory").value;
  const comment = getTextValue("incomeComment");

  if (!amount || amount <= 0) {
    tg?.HapticFeedback?.notificationOccurred("error");
    showToast("Введите сумму больше 0");
    return;
  }

  closeKeyboard();
  addOperation({ type:"income", amount, category, comment });

  tg?.HapticFeedback?.notificationOccurred("success");
  showToast(`Доход добавлен: +${formatRUB(amount)} RUB`);

  clearInputs(["incomeAmount", "incomeComment"]);
  wireAmountToButton("incomeAmount", "incomeSave");
  showScreen("menu");
});

document.getElementById("expenseSave").addEventListener("click", () => {
  const amount = getNumberValue("expenseAmount");
  const category = document.getElementById("expenseCategory").value;
  const comment = getTextValue("expenseComment");

  if (!amount || amount <= 0) {
    tg?.HapticFeedback?.notificationOccurred("error");
    showToast("Введите сумму больше 0");
    return;
  }

  closeKeyboard();
  addOperation({ type:"expense", amount, category, comment });

  tg?.HapticFeedback?.notificationOccurred("success");
  showToast(`Расход добавлен: -${formatRUB(amount)} RUB`);

  clearInputs(["expenseAmount", "expenseComment"]);
  wireAmountToButton("expenseAmount", "expenseSave");
  showScreen("menu");
});

// ===== History =====
const historyList = document.getElementById("historyList");
const historyClear = document.getElementById("historyClear");

function renderHistory(){
  const ops = loadOps().slice().reverse().slice(0, 30);

  historyList.innerHTML = "";
  if (!ops.length){
    const empty = document.createElement("div");
    empty.className = "item";
    empty.innerHTML = '<div class="muted">Пока пусто</div>';
    historyList.appendChild(empty);
    return;
  }

  for (const op of ops){
    const div = document.createElement("div");
    div.className = "item";

    const sign = op.type === "income" ? "+" : "−";
    const title = `${sign}${formatRUB(op.amount)} RUB`;

    div.innerHTML = `
      <div class="item__top">
        <div>
          <div class="item__title">${title}</div>
          <div class="item__meta">${op.category}${op.comment ? " • " + escapeHtml(op.comment) : ""}</div>
        </div>
        <span class="chip">${op.date}</span>
      </div>
      <div class="actions-row">
        <button class="btn btn-small btn-danger" data-del="${op.id}">🗑 Удалить</button>
      </div>
    `;
    historyList.appendChild(div);
  }

  historyList.querySelectorAll("[data-del]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-del");
      confirmDeleteOp(id);
    });
  });
}

historyClear.addEventListener("click", () => {
  const body = document.createElement("div");
  body.innerHTML = '<div class="muted">Удалить все записи из истории?</div>';

  const cancel = mkBtn("Отмена", "btn btn-ghost", () => closeModal());
  const ok = mkBtn("Удалить", "btn btn-danger", () => {
    saveOps([]);
    closeModal();
    showToast("История очищена");
    renderHistory();
    renderMonth();
  });

  openModal({ title: "Очистить историю", bodyNode: body, actions: [cancel, ok] });
});

// ===== Month summary + pie chart =====
const monthPeriod = document.getElementById("monthPeriod");
const kpiIncome = document.getElementById("kpiIncome");
const kpiExpense = document.getElementById("kpiExpense");
const kpiBalance = document.getElementById("kpiBalance");
const monthCats = document.getElementById("monthCats");
const monthTotalExpense = document.getElementById("monthTotalExpense");
const monthRefresh = document.getElementById("monthRefresh");

monthRefresh.addEventListener("click", () => {
  renderMonth();
  tg?.HapticFeedback?.selectionChanged();
});

function renderMonth(){
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
  monthPeriod.textContent = `Период: ${ym}`;

  const ops = loadOps().filter(o => monthKey(o.date) === ym);

  let inc = 0, exp = 0;
  const byCat = {};
  for (const o of ops){
    if (o.type === "income") inc += Number(o.amount || 0);
    else {
      exp += Number(o.amount || 0);
      byCat[o.category] = (byCat[o.category] || 0) + Number(o.amount || 0);
    }
  }

  kpiIncome.textContent = formatRUB(inc);
  kpiExpense.textContent = formatRUB(exp);
  kpiBalance.textContent = formatRUB(inc - exp);
  monthTotalExpense.textContent = exp > 0 ? `Всего: ${formatRUB(exp)} RUB` : "Пока нет расходов";

  const items = Object.entries(byCat).sort((a,b) => b[1]-a[1]);
  monthCats.innerHTML = "";

  if (!items.length){
    const empty = document.createElement("div");
    empty.className = "item";
    empty.innerHTML = '<div class="muted">Нет данных для диаграммы</div>';
    monthCats.appendChild(empty);
    drawPie({ items: [], total: 0 });
    return;
  }

  for (const [cat, sum] of items.slice(0, 10)){
    const pct = exp > 0 ? Math.round((sum/exp)*100) : 0;
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <div class="item__top">
        <div>
          <div class="item__title">${cat}</div>
          <div class="item__meta">${formatRUB(sum)} RUB • ${pct}%</div>
        </div>
        <span class="chip">${pct}%</span>
      </div>
    `;
    monthCats.appendChild(div);
  }

  drawPie({ items, total: exp });
}

// Simple pie chart without external libs (stable for GitHub Pages)
const pieCanvas = document.getElementById("pie");
const pieCtx = pieCanvas.getContext("2d");

function drawPie({items, total}){
  const w = pieCanvas.width;
  const h = pieCanvas.height;
  pieCtx.clearRect(0,0,w,h);

  // background ring
  const cx = w/2, cy = h/2;
  const r = Math.min(w,h)*0.42;

  if (!items.length || total <= 0){
    pieCtx.beginPath();
    pieCtx.arc(cx, cy, r, 0, Math.PI*2);
    pieCtx.fillStyle = "#eef1f4";
    pieCtx.fill();

    pieCtx.fillStyle = "#9aa3af";
    pieCtx.font = "700 14px system-ui";
    pieCtx.textAlign = "center";
    pieCtx.textBaseline = "middle";
    pieCtx.fillText("Нет расходов", cx, cy);
    return;
  }

  // deterministic pastel colors per category
  const slices = items.map(([cat,sum]) => ({
    cat, sum,
    color: colorFromString(cat),
  }));

  let start = -Math.PI/2;
  for (const s of slices){
    const angle = (s.sum/total) * Math.PI*2;
    pieCtx.beginPath();
    pieCtx.moveTo(cx, cy);
    pieCtx.arc(cx, cy, r, start, start + angle);
    pieCtx.closePath();
    pieCtx.fillStyle = s.color;
    pieCtx.fill();
    start += angle;
  }

  // inner hole (donut)
  pieCtx.beginPath();
  pieCtx.arc(cx, cy, r*0.58, 0, Math.PI*2);
  pieCtx.fillStyle = "#fff";
  pieCtx.fill();

  // center label
  pieCtx.fillStyle = "#111";
  pieCtx.font = "900 16px system-ui";
  pieCtx.textAlign = "center";
  pieCtx.textBaseline = "middle";
  pieCtx.fillText(formatRUB(total), cx, cy - 8);
  pieCtx.fillStyle = "#6b7280";
  pieCtx.font = "800 11px system-ui";
  pieCtx.fillText("RUB расходов", cx, cy + 12);
}

function colorFromString(str){
  // hash -> HSL pastel
  let hash = 0;
  for (let i=0;i<str.length;i++){
    hash = (hash*31 + str.charCodeAt(i)) >>> 0;
  }
  const hue = hash % 360;
  return `hsl(${hue} 70% 70%)`;
}

// ===== Piggy goals (local only) =====
const piggyGoalsEl = document.getElementById("piggyGoals");
const piggyAddGoalBtn = document.getElementById("piggyAddGoal");

function renderPiggy(){
  const goals = loadGoals();
  piggyGoalsEl.innerHTML = "";

  if (!goals.length){
    const empty = document.createElement("div");
    empty.className = "item";
    empty.innerHTML = '<div class="muted">Пока нет целей. Нажми “+ Цель”.</div>';
    piggyGoalsEl.appendChild(empty);
    return;
  }

  for (const g of goals){
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <div class="item__top">
        <div>
          <div class="item__title">${escapeHtml(g.emoji || "🐷")} ${escapeHtml(g.title)}</div>
          <div class="item__meta">Баланс: ${formatRUB(g.balance || 0)} RUB</div>
        </div>
        <span class="chip">${formatRUB(g.balance || 0)} RUB</span>
      </div>
      <div class="actions-row">
        <button class="btn btn-small btn-primary" data-add="${g.id}">+ Пополнить</button>
        <button class="btn btn-small btn-danger" data-take="${g.id}">− Снять</button>
      </div>
    `;
    piggyGoalsEl.appendChild(div);
  }

  piggyGoalsEl.querySelectorAll("[data-add]").forEach(b => b.addEventListener("click", () => openPiggyAmount(b.getAttribute("data-add"), "add")));
  piggyGoalsEl.querySelectorAll("[data-take]").forEach(b => b.addEventListener("click", () => openPiggyAmount(b.getAttribute("data-take"), "take")));
}

piggyAddGoalBtn.addEventListener("click", () => openAddGoal());

function openAddGoal(){
  const body = document.createElement("div");

  const titleLbl = document.createElement("label");
  titleLbl.className = "label";
  titleLbl.textContent = "Название цели";
  const titleInput = document.createElement("input");
  titleInput.className = "input";
  titleInput.placeholder = "Например: Отпуск";
  titleInput.maxLength = 30;

  const emojiLbl = document.createElement("label");
  emojiLbl.className = "label";
  emojiLbl.textContent = "Emoji";
  const emojiInput = document.createElement("input");
  emojiInput.className = "input input-small";
  emojiInput.placeholder = "🏝️";
  emojiInput.maxLength = 4;

  body.appendChild(titleLbl);
  body.appendChild(titleInput);
  body.appendChild(emojiLbl);
  body.appendChild(emojiInput);

  const cancel = mkBtn("Отмена", "btn btn-ghost", () => closeModal());
  const ok = mkBtn("Добавить", "btn btn-primary", () => {
    const title = (titleInput.value || "").trim();
    const emoji = (emojiInput.value || "").trim() || "🐷";
    if (!title){
      showToast("Введите название цели");
      return;
    }
    const goals = loadGoals();
    goals.push({ id: uid(), title, emoji, balance: 0 });
    saveGoals(goals);
    closeModal();
    showToast("Цель добавлена");
    renderPiggy();
  });

  openModal({ title: "Новая цель", bodyNode: body, actions: [cancel, ok] });
  setTimeout(() => titleInput.focus(), 120);
}

function openPiggyAmount(goalId, mode){
  const goals = loadGoals();
  const goal = goals.find(g => g.id === goalId);
  if (!goal) return;

  const body = document.createElement("div");

  const lbl = document.createElement("label");
  lbl.className = "label";
  lbl.textContent = mode === "add" ? "Сумма пополнения (RUB)" : "Сумма снятия (RUB)";
  const input = document.createElement("input");
  input.className = "input";
  input.type = "number";
  input.inputMode = "decimal";
  input.min = "0";
  input.step = "0.01";
  input.placeholder = "Например: 500";

  body.appendChild(lbl);
  body.appendChild(input);

  const cancel = mkBtn("Отмена", "btn btn-ghost", () => closeModal());
  const ok = mkBtn(mode === "add" ? "Пополнить" : "Снять", mode === "add" ? "btn btn-primary" : "btn btn-danger", () => {
    const val = Number((input.value || "").replace(",", "."));
    if (!val || val <= 0){
      showToast("Введите сумму больше 0");
      return;
    }
    const delta = mode === "add" ? val : -val;
    goal.balance = Number(goal.balance || 0) + delta;
    saveGoals(goals);
    closeModal();
    showToast(mode === "add" ? "Пополнено" : "Снято");
    renderPiggy();
  });

  openModal({ title: `${goal.emoji || "🐷"} ${goal.title}`, bodyNode: body, actions: [cancel, ok] });
  setTimeout(() => input.focus(), 120);
}

// ===== Delete op =====
function confirmDeleteOp(id){
  const ops = loadOps();
  const op = ops.find(o => o.id === id);
  if (!op) return;

  const body = document.createElement("div");
  const sign = op.type === "income" ? "+" : "−";
  body.innerHTML = `
    <div class="muted">Удалить запись?</div>
    <div style="margin-top:10px;font-weight:900;">${sign}${formatRUB(op.amount)} RUB</div>
    <div class="muted small" style="margin-top:6px;">${op.category}${op.comment ? " • " + escapeHtml(op.comment) : ""}</div>
  `;

  const cancel = mkBtn("Отмена", "btn btn-ghost", () => closeModal());
  const ok = mkBtn("Удалить", "btn btn-danger", () => {
    const next = ops.filter(o => o.id !== id);
    saveOps(next);
    closeModal();
    showToast("Удалено");
    renderHistory();
    renderMonth();
  });

  openModal({ title: "Удаление", bodyNode: body, actions: [cancel, ok] });
}

// ===== Helpers =====
function mkBtn(text, className, onClick){
  const b = document.createElement("button");
  b.className = className;
  b.textContent = text;
  b.addEventListener("click", onClick);
  return b;
}

function escapeHtml(s){
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

// ===== Init =====
document.getElementById("monthRefresh").addEventListener("click", renderMonth);
showScreen("menu");
renderMonth();
