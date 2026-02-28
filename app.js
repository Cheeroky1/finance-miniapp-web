const tg = window.Telegram?.WebApp;
if (tg) tg.expand();

const topTitle = document.getElementById("topTitle");
const topSubtitle = document.getElementById("topSubtitle");
const toastEl = document.getElementById("toast");

// ===== Toast =====
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
const LS = {
  ops: "fm_ops_iosdark_v1",
  goals: "fm_goals_iosdark_v1",
  piggyOpen: "fm_piggy_open_v1",
};

function loadJSON(key, fallback){
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
  catch { return fallback; }
}
function saveJSON(key, value){
  localStorage.setItem(key, JSON.stringify(value));
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
function monthKey(dIso){ return (dIso || "").slice(0,7); }

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

const EMOJI_CATALOG = [
  "🐷","💳","💻","🏝️","🛠️","🚗","🏠","📱","🎓","🧳","👗","💍",
  "🍼","🐶","🐱","🎮","🎁","🍽️","🧾","📦","🧠","💊","🏋️","📸",
  "🎧","🎬","🍀","🧸","🪙","💰","🚀","🌸","🧼","🪒","🪑","🧯",
];

// ===== Screens / Tabs =====
const screens = {
  month: document.getElementById("screen-month"),
  income: document.getElementById("screen-income"),
  expense: document.getElementById("screen-expense"),
  history: document.getElementById("screen-history"),
};

function showScreen(name){
  Object.values(screens).forEach(s => {
    s.classList.remove("active");
    s.classList.remove("visible");
  });
  const el = screens[name];
  el.classList.add("active");
  requestAnimationFrame(() => el.classList.add("visible"));

  // header
  const titles = { month:"Месяц", income:"Доход", expense:"Расход", history:"История" };
  topTitle.textContent = titles[name] || "";
  topSubtitle.textContent = name === "month" ? currentMonthLabel() : "";

  // render hooks
  if (name === "month") renderMonth();
  if (name === "history") renderHistory();

  // focus for forms
  if (name === "income") setTimeout(() => document.getElementById("incomeAmount")?.focus(), 120);
  if (name === "expense") setTimeout(() => document.getElementById("expenseAmount")?.focus(), 120);
}

function setActiveTab(name){
  document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t.dataset.tab === name));
}

document.querySelectorAll(".tab").forEach(btn => {
  btn.addEventListener("click", () => {
    const name = btn.dataset.tab;
    setActiveTab(name);
    showScreen(name);
    tg?.HapticFeedback?.selectionChanged();
  });
});

// ===== Modal =====
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
  modal.setAttribute("aria-hidden","false");
}

function closeModal(){
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden","true");
}

modal.addEventListener("click", (e) => {
  if (e.target === modal) closeModal();
});

function mkBtn(text, className, onClick){
  const b = document.createElement("button");
  b.type = "button";
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

// ===== Form helpers =====
function getNumberValue(id){
  const v = (document.getElementById(id).value || "").replace(",", ".");
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}
function getTextValue(id){ return (document.getElementById(id).value || "").trim(); }
function clearInputs(ids){ ids.forEach(id => (document.getElementById(id).value = "")); }

function wireAmountToButton(amountInputId, btnId){
  const input = document.getElementById(amountInputId);
  const btn = document.getElementById(btnId);
  const update = () => {
    const v = (input.value || "").trim();
    const n = Number(v.replace(",", "."));
    btn.disabled = !(Number.isFinite(n) && n > 0);
  };
  input.addEventListener("input", update);
  input.addEventListener("change", update);
  update();
}

// ===== Operations (local) =====
function loadOps(){ return loadJSON(LS.ops, []); }
function saveOps(v){ saveJSON(LS.ops, v); }

function addOperation({type, amount, category, comment}){
  const ops = loadOps();
  ops.push({
    id: uid(),
    ts: new Date().toISOString(),
    date: todayISO(),
    type,
    amount: Number(amount),
    currency: "RUB",
    category: category || (type === "income" ? "Доход" : "Прочее 🧩"),
    comment: comment || "",
  });
  saveOps(ops);
}

// ===== Income / Expense =====
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

fillCategories("expenseCategory");
document.getElementById("expenseCategory").value = "Продукты 🍎";

wireAmountToButton("incomeAmount", "incomeSave");
wireAmountToButton("expenseAmount", "expenseSave");

document.getElementById("incomeSave").addEventListener("click", () => {
  const amount = getNumberValue("incomeAmount");
  const comment = getTextValue("incomeComment");

  if (!amount || amount <= 0){
    tg?.HapticFeedback?.notificationOccurred("error");
    showToast("Введите сумму больше 0");
    return;
  }

  closeKeyboard();
  addOperation({ type:"income", amount, category:"Доход", comment });

  tg?.HapticFeedback?.notificationOccurred("success");
  showToast(`Доход: +${formatRUB(amount)} RUB`);

  clearInputs(["incomeAmount","incomeComment"]);
  wireAmountToButton("incomeAmount","incomeSave");
  showScreen("month");
  setActiveTab("month");
});

document.getElementById("expenseSave").addEventListener("click", () => {
  const amount = getNumberValue("expenseAmount");
  const category = document.getElementById("expenseCategory").value;
  const comment = getTextValue("expenseComment");

  if (!amount || amount <= 0){
    tg?.HapticFeedback?.notificationOccurred("error");
    showToast("Введите сумму больше 0");
    return;
  }

  closeKeyboard();
  addOperation({ type:"expense", amount, category, comment });

  tg?.HapticFeedback?.notificationOccurred("success");
  showToast(`Расход: −${formatRUB(amount)} RUB`);

  clearInputs(["expenseAmount","expenseComment"]);
  wireAmountToButton("expenseAmount","expenseSave");
  showScreen("month");
  setActiveTab("month");
});

// ===== History =====
const historyList = document.getElementById("historyList");

function renderHistory(){
  const ops = loadOps().slice().reverse().slice(0, 30);
  historyList.innerHTML = "";

  if (!ops.length){
    historyList.innerHTML = '<div class="item"><div class="muted">Пока пусто</div></div>';
    return;
  }

  for (const op of ops){
    const sign = op.type === "income" ? "+" : "−";
    const title = `${sign}${formatRUB(op.amount)} RUB`;

    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <div class="item__top">
        <div>
          <div class="item__title">${title}</div>
          <div class="item__meta">${escapeHtml(op.category)}${op.comment ? " • " + escapeHtml(op.comment) : ""}</div>
        </div>
        <span class="chip">${op.date}</span>
      </div>
      <div style="margin-top:10px;">
        <button class="btn btn--danger btn--sm" data-del="${op.id}">Удалить</button>
      </div>
    `;
    historyList.appendChild(div);
  }

  historyList.querySelectorAll("[data-del]").forEach(btn => {
    btn.addEventListener("click", () => confirmDeleteOp(btn.dataset.del));
  });
}

function confirmDeleteOp(id){
  const ops = loadOps();
  const op = ops.find(o => o.id === id);
  if (!op) return;

  const sign = op.type === "income" ? "+" : "−";
  const body = document.createElement("div");
  body.innerHTML = `
    <div class="muted">Удалить запись?</div>
    <div style="margin-top:10px;font-weight:950;">${sign}${formatRUB(op.amount)} RUB</div>
    <div class="muted" style="margin-top:6px;font-size:12px;">${escapeHtml(op.category)}${op.comment ? " • " + escapeHtml(op.comment) : ""}</div>
  `;

  const cancel = mkBtn("Отмена","btn btn--ghost", closeModal);
  const ok = mkBtn("Удалить","btn btn--danger", () => {
    saveOps(ops.filter(o => o.id !== id));
    closeModal();
    showToast("Удалено");
    renderHistory();
    renderMonth();
  });

  openModal({ title:"Удаление", bodyNode: body, actions:[cancel, ok] });
}

// ===== Month / Pie =====
const monthCats = document.getElementById("monthCats");
const monthMeta = document.getElementById("monthMeta");
const monthRefresh = document.getElementById("monthRefresh");

monthRefresh.addEventListener("click", () => {
  renderMonth();
  tg?.HapticFeedback?.selectionChanged();
});

function currentMonthLabel(){
  const now = new Date();
  return `Период: ${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
}

function renderMonth(){
  topSubtitle.textContent = currentMonthLabel();

  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
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

  document.getElementById("kpiIncome").textContent = formatRUB(inc);
  document.getElementById("kpiExpense").textContent = formatRUB(exp);
  document.getElementById("kpiBalance").textContent = formatRUB(inc - exp);

  monthMeta.textContent = exp > 0 ? `Всего: ${formatRUB(exp)} RUB` : "Пока нет расходов";

  const items = Object.entries(byCat).sort((a,b) => b[1]-a[1]);
  monthCats.innerHTML = "";

  if (!items.length){
    monthCats.innerHTML = '<div class="item"><div class="muted">Нет данных</div></div>';
    drawPie({ items: [], total: 0 });
  } else {
    for (const [cat, sum] of items.slice(0, 10)){
      const pct = exp > 0 ? Math.round((sum/exp)*100) : 0;
      const div = document.createElement("div");
      div.className = "item";
      div.innerHTML = `
        <div class="item__top">
          <div>
            <div class="item__title">${escapeHtml(cat)}</div>
            <div class="item__meta">${formatRUB(sum)} RUB • ${pct}%</div>
          </div>
          <span class="chip">${pct}%</span>
        </div>
      `;
      monthCats.appendChild(div);
    }
    drawPie({ items, total: exp });
  }

  renderPiggyMeta();
}

// Pie canvas (donut)
const pieCanvas = document.getElementById("pie");
const pieCtx = pieCanvas.getContext("2d");

function colorFromString(str){
  let hash = 0;
  for (let i=0;i<str.length;i++) hash = (hash*31 + str.charCodeAt(i)) >>> 0;
  const hue = hash % 360;
  return `hsl(${hue} 78% 62%)`;
}

function drawPie({items, total}){
  const w = pieCanvas.width;
  const h = pieCanvas.height;
  pieCtx.clearRect(0,0,w,h);

  const cx = w/2, cy = h/2;
  const r = Math.min(w,h)*0.42;

  if (!items.length || total <= 0){
    pieCtx.beginPath();
    pieCtx.arc(cx, cy, r, 0, Math.PI*2);
    pieCtx.fillStyle = "rgba(255,255,255,.06)";
    pieCtx.fill();

    pieCtx.fillStyle = "rgba(147,166,200,.85)";
    pieCtx.font = "800 14px system-ui";
    pieCtx.textAlign = "center";
    pieCtx.textBaseline = "middle";
    pieCtx.fillText("Нет расходов", cx, cy);
    return;
  }

  let start = -Math.PI/2;
  for (const [cat, sum] of items){
    const angle = (sum/total) * Math.PI*2;
    pieCtx.beginPath();
    pieCtx.moveTo(cx, cy);
    pieCtx.arc(cx, cy, r, start, start + angle);
    pieCtx.closePath();
    pieCtx.fillStyle = colorFromString(cat);
    pieCtx.fill();
    start += angle;
  }

  // hole
  pieCtx.beginPath();
  pieCtx.arc(cx, cy, r*0.58, 0, Math.PI*2);
  pieCtx.fillStyle = "rgba(7,11,20,.92)";
  pieCtx.fill();

  // center label
  pieCtx.fillStyle = "rgba(238,243,255,.95)";
  pieCtx.font = "950 16px system-ui";
  pieCtx.textAlign = "center";
  pieCtx.textBaseline = "middle";
  pieCtx.fillText(formatRUB(total), cx, cy - 8);

  pieCtx.fillStyle = "rgba(147,166,200,.85)";
  pieCtx.font = "900 11px system-ui";
  pieCtx.fillText("RUB расходов", cx, cy + 12);
}

// ===== Piggy (collapsible + swipe-to-delete) =====
const piggyToggle = document.getElementById("piggyToggle");
const piggyBody = document.getElementById("piggyBody");
const piggyChev = document.getElementById("piggyChev");
const piggyMeta = document.getElementById("piggyMeta");
const piggyAddGoal = document.getElementById("piggyAddGoal");
const piggyGoals = document.getElementById("piggyGoals");

function loadGoals(){ return loadJSON(LS.goals, []); }
function saveGoals(v){ saveJSON(LS.goals, v); }

function piggyIsOpen(){ return loadJSON(LS.piggyOpen, false); }
function setPiggyOpen(v){ saveJSON(LS.piggyOpen, v); }

function renderPiggyMeta(){
  const goals = loadGoals();
  const total = goals.reduce((a,g) => a + Number(g.balance||0), 0);
  piggyMeta.textContent = goals.length ? `Целей: ${goals.length} • Итого: ${formatRUB(total)} RUB` : "Нет целей";
}

function applyPiggyOpenState(){
  const open = piggyIsOpen();
  piggyBody.hidden = !open;
  piggyChev.classList.toggle("up", open);
  piggyChev.textContent = open ? "⌃" : "⌄";
}

piggyToggle.addEventListener("click", () => {
  const next = !piggyIsOpen();
  setPiggyOpen(next);
  applyPiggyOpenState();
  if (next) renderPiggy();
  tg?.HapticFeedback?.selectionChanged();
});

piggyAddGoal.addEventListener("click", () => openAddGoalModal());

function renderPiggy(){
  const goals = loadGoals();
  piggyGoals.innerHTML = "";

  if (!goals.length){
    piggyGoals.innerHTML = '<div class="item"><div class="muted">Пока нет целей. Нажми “+ Цель”.</div></div>';
    renderPiggyMeta();
    return;
  }

  for (const g of goals){
    const wrap = document.createElement("div");
    wrap.className = "swipe";
    wrap.dataset.goalId = g.id;

    wrap.innerHTML = `
      <div class="swipe__behind">
        <div class="swipe__delete">Удалить</div>
      </div>
      <div class="swipe__front">
        <div class="item">
          <div class="item__top">
            <div>
              <div class="item__title">${escapeHtml(g.emoji || "🐷")} ${escapeHtml(g.title)}</div>
              <div class="item__meta">Баланс: ${formatRUB(g.balance || 0)} RUB</div>
            </div>
            <span class="chip">${formatRUB(g.balance || 0)} RUB</span>
          </div>

          <div style="margin-top:10px; display:flex; gap:10px;">
            <button class="btn btn--primary btn--sm" data-add="${g.id}">+ Пополнить</button>
            <button class="btn btn--danger btn--sm" data-take="${g.id}">− Снять</button>
          </div>
        </div>
      </div>
    `;

    piggyGoals.appendChild(wrap);
    wireSwipeToDelete(wrap);
  }

  piggyGoals.querySelectorAll("[data-add]").forEach(b => b.addEventListener("click", () => openPiggyAmount(b.dataset.add, "add")));
  piggyGoals.querySelectorAll("[data-take]").forEach(b => b.addEventListener("click", () => openPiggyAmount(b.dataset.take, "take")));

  renderPiggyMeta();
}

function openAddGoalModal(){
  const body = document.createElement("div");

  const titleLbl = document.createElement("label");
  titleLbl.className = "label";
  titleLbl.textContent = "Название цели";
  const titleInput = document.createElement("input");
  titleInput.className = "input";
  titleInput.placeholder = "Например: Отпуск";
  titleInput.maxLength = 30;

  const iconLbl = document.createElement("label");
  iconLbl.className = "label";
  iconLbl.textContent = "Выбор иконки";

  const grid = document.createElement("div");
  grid.style.marginTop = "8px";
  grid.style.display = "grid";
  grid.style.gridTemplateColumns = "repeat(6, 1fr)";
  grid.style.gap = "8px";

  let selected = "🐷";
  const buttons = [];

  for (const e of EMOJI_CATALOG){
    const b = document.createElement("button");
    b.type = "button";
    b.style.border = "1px solid rgba(255,255,255,.10)";
    b.style.background = "rgba(0,0,0,.18)";
    b.style.color = "var(--text)";
    b.style.borderRadius = "14px";
    b.style.padding = "10px 0";
    b.style.fontSize = "18px";
    b.style.cursor = "pointer";
    b.textContent = e;

    b.addEventListener("click", () => {
      selected = e;
      buttons.forEach(x => x.style.boxShadow = "none");
      buttons.forEach(x => x.style.borderColor = "rgba(255,255,255,.10)");
      b.style.borderColor = "rgba(46,166,255,.55)";
      b.style.boxShadow = "0 0 0 4px rgba(46,166,255,.12)";
      tg?.HapticFeedback?.selectionChanged();
    });

    buttons.push(b);
    grid.appendChild(b);
  }

  // select first
  setTimeout(() => {
    const b = buttons[0];
    if (b){
      b.style.borderColor = "rgba(46,166,255,.55)";
      b.style.boxShadow = "0 0 0 4px rgba(46,166,255,.12)";
    }
  }, 0);

  body.appendChild(titleLbl);
  body.appendChild(titleInput);
  body.appendChild(iconLbl);
  body.appendChild(grid);

  const cancel = mkBtn("Отмена", "btn btn--ghost", closeModal);
  const ok = mkBtn("Добавить", "btn btn--primary", () => {
    const title = (titleInput.value || "").trim();
    if (!title){
      showToast("Введите название цели");
      return;
    }
    const goals = loadGoals();
    goals.push({ id: uid(), title, emoji: selected, balance: 0 });
    saveGoals(goals);
    closeModal();
    showToast("Цель добавлена");
    renderPiggy();
    renderPiggyMeta();
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

  const cancel = mkBtn("Отмена", "btn btn--ghost", closeModal);
  const ok = mkBtn(mode === "add" ? "Пополнить" : "Снять", mode === "add" ? "btn btn--primary" : "btn btn--danger", () => {
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
    renderPiggyMeta();
  });

  openModal({ title: `${goal.emoji || "🐷"} ${goal.title}`, bodyNode: body, actions: [cancel, ok] });
  setTimeout(() => input.focus(), 120);
}

function confirmDeleteGoal(goalId){
  const goals = loadGoals();
  const goal = goals.find(g => g.id === goalId);
  if (!goal) return;

  const body = document.createElement("div");
  body.innerHTML = `
    <div class="muted">Удалить цель?</div>
    <div style="margin-top:10px;font-weight:950;">${escapeHtml(goal.emoji || "🐷")} ${escapeHtml(goal.title)}</div>
    <div class="muted" style="margin-top:6px;font-size:12px;">Баланс: ${formatRUB(goal.balance || 0)} RUB</div>
  `;

  const cancel = mkBtn("Отмена", "btn btn--ghost", () => closeModal());
  const ok = mkBtn("Удалить", "btn btn--danger", () => {
    saveGoals(goals.filter(g => g.id !== goalId));
    closeModal();
    showToast("Цель удалена");
    renderPiggy();
    renderPiggyMeta();
  });

  openModal({ title: "Удаление цели", bodyNode: body, actions: [cancel, ok] });
}

/**
 * Swipe-to-delete (simple)
 * - swipe left to open
 * - tap red area to confirm delete (opens modal)
 * - swipe right / tap elsewhere closes
 */
function wireSwipeToDelete(container){
  const front = container.querySelector(".swipe__front");
  const behind = container.querySelector(".swipe__behind");
  const goalId = container.dataset.goalId;

  let startX = 0;
  let dx = 0;
  let dragging = false;

  function close(){
    container.classList.remove("open");
  }
  function open(){
    container.classList.add("open");
    tg?.HapticFeedback?.selectionChanged();
  }

  behind.addEventListener("click", () => {
    // when open, tap delete area triggers confirm modal
    confirmDeleteGoal(goalId);
  });

  front.addEventListener("touchstart", (e) => {
    if (!e.touches?.length) return;
    dragging = true;
    startX = e.touches[0].clientX;
    dx = 0;
  }, {passive:true});

  front.addEventListener("touchmove", (e) => {
    if (!dragging || !e.touches?.length) return;
    const x = e.touches[0].clientX;
    dx = x - startX;

    // only left
    if (dx < 0){
      // clamp
      const clamped = Math.max(dx, -110);
      front.style.transform = `translateX(${clamped}px)`;
    }
  }, {passive:true});

  front.addEventListener("touchend", () => {
    dragging = false;
    front.style.transform = "";

    if (dx < -45) open();
    else close();
  }, {passive:true});

  // close open swipe when tapping front (iOS-like)
  front.addEventListener("click", () => {
    if (container.classList.contains("open")){
      close();
    }
  });
}

// ===== Init =====
applyPiggyOpenState();
renderMonth();
setActiveTab("month");
showScreen("month");
