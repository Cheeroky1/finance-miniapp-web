// Finance Mini App (iOS-dark) — v3
(function(){
  const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
  try { tg && tg.ready && tg.ready(); } catch {}
  try { tg && tg.expand && tg.expand(); } catch {}

  // Disable zoom (iOS)
  document.addEventListener("gesturestart", (e) => e.preventDefault());
  document.addEventListener("gesturechange", (e) => e.preventDefault());
  document.addEventListener("gestureend", (e) => e.preventDefault());
  let lastTouchEnd = 0;
  document.addEventListener("touchend", (e) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 250) e.preventDefault();
    lastTouchEnd = now;
  }, { passive: false });
  document.addEventListener("touchmove", (e) => {
    if (e.scale && e.scale !== 1) e.preventDefault();
  }, { passive: false });

  const topTitle = document.getElementById("topTitle");
  const topSubtitle = document.getElementById("topSubtitle");
  const toastEl = document.getElementById("toast");
  const errBanner = document.getElementById("errBanner");
  const errText = document.getElementById("errText");
  const monthInsight = document.getElementById("monthInsight");

  function showError(msg){
    try{ errText.textContent = String(msg || "Unknown error"); errBanner.hidden = false; }catch{}
  }
  window.addEventListener("error", (e) => showError(e?.message || "JS error"));
  window.addEventListener("unhandledrejection", (e) => showError(e?.reason?.message || e?.reason || "Promise error"));

  function showToast(text){
    toastEl.textContent = text;
    toastEl.classList.add("show");
    setTimeout(() => toastEl.classList.remove("show"), 2000);
  }
  function closeKeyboard(){
    const el = document.activeElement;
    if (el && typeof el.blur === "function") el.blur();
  }

  const LS = { ops:"fm_ops_iosdark_v3", goals:"fm_goals_iosdark_v3", piggyOpen:"fm_piggy_open_v3" };
  function loadJSON(key, fallback){
    try{ const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }catch{ return fallback; }
  }
  function saveJSON(key, value){ localStorage.setItem(key, JSON.stringify(value)); }
  function uid(){
    try{ if (crypto && crypto.randomUUID) return crypto.randomUUID(); }catch{}
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }
  function formatRUB(n){
    const v = Number(n || 0);
    try { return Math.round(v).toLocaleString("ru-RU"); } catch { return String(Math.round(v)); }
  }
  function todayISO(){
    const d = new Date();
    const pad = (x) => String(x).padStart(2, "0");
    return d.getFullYear() + "-" + pad(d.getMonth()+1) + "-" + pad(d.getDate());
  }
  function monthKey(dIso){ return String(dIso || "").slice(0,7); }
  function currentYM(){
    const now = new Date();
    return now.getFullYear() + "-" + String(now.getMonth()+1).padStart(2,"0");
  }
  function monthLabelRu(ym){
    const y = Number(String(ym).slice(0,4));
    const m = Number(String(ym).slice(5,7));
    const names = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
    const name = names[Math.max(1, Math.min(12, m)) - 1] || "Месяц";
    return name + " " + y;
  }
  function escapeHtml(s){
    const str = String(s);
    return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
  }

  const CATEGORIES = ["Продукты 🍎","Коммунальные услуги 🏠","Транспорт 🚕","Связь/интернет 🛜","Животные 🐱","Здоровье 💊","Привычки 🚬","Красота 🪒","Кредиты 💳","Развлечения 🎭","Прочее 🧩"];
  const EMOJI_CATALOG = ["🐷","💳","💻","🏝️","🛠️","🚗","🏠","📱","🎓","🧳","👗","💍","🍼","🐶","🐱","🎮","🎁","🍽️","🧾","📦","🧠","💊","🏋️","📸","🎧","🎬","🍀","🧸","🪙","💰","🚀","🌸","🧼","🪒","🪑","🧯"];

  const screens = {
    month: document.getElementById("screen-month"),
    income: document.getElementById("screen-income"),
    expense: document.getElementById("screen-expense"),
    history: document.getElementById("screen-history"),
  };

  function setActiveTab(name){
    document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t.dataset.tab === name));
  }

  function showScreen(name){
    Object.keys(screens).forEach(k => { screens[k].classList.remove("active"); screens[k].classList.remove("visible"); });
    const el = screens[name];
    el.classList.add("active");
    requestAnimationFrame(() => el.classList.add("visible"));

    const titles = { month:"Месяц", income:"Доход", expense:"Расход", history:"История" };
    topTitle.textContent = titles[name] || "";
    topSubtitle.textContent = name === "month" ? monthLabelRu(currentYM()) : "";

    if (name === "month") renderMonth();
    if (name === "history") renderHistory();
    if (name === "income") setTimeout(() => document.getElementById("incomeAmount")?.focus(), 120);
    if (name === "expense") setTimeout(() => document.getElementById("expenseAmount")?.focus(), 120);
  }

  // Modal
  const modal = document.getElementById("modal");
  const modalTitle = document.getElementById("modalTitle");
  const modalBody = document.getElementById("modalBody");
  const modalActions = document.getElementById("modalActions");

  function mkBtn(text, className, onClick){
    const b = document.createElement("button");
    b.type = "button";
    b.className = className;
    b.textContent = text;
    b.addEventListener("click", onClick);
    return b;
  }
  function openModal({title, bodyNode, actions}){
    modalTitle.textContent = title || "";
    modalBody.innerHTML = "";
    modalBody.appendChild(bodyNode);
    modalActions.innerHTML = "";
    actions.forEach(a => modalActions.appendChild(a));
    modal.classList.add("show");
    modal.setAttribute("aria-hidden","false");
  }
  function closeModal(){ modal.classList.remove("show"); modal.setAttribute("aria-hidden","true"); }
  modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });

  function getNumFromEl(el){
    const v = (el.value || "").replace(",", ".");
    const n = Number(v);
    return Number.isFinite(n) ? n : NaN;
  }
  function wireAmountToButton(inputEl, btnEl){
    const update = () => {
      const n = getNumFromEl(inputEl);
      btnEl.disabled = !(Number.isFinite(n) && n > 0);
    };
    inputEl.addEventListener("input", update);
    inputEl.addEventListener("change", update);
    update();
  }
  function addAppear(el, delayMs){
    el.classList.add("appear");
    el.style.animationDelay = (delayMs || 0) + "ms";
  }

  // Ops
  function loadOps(){ return loadJSON(LS.ops, []); }
  function saveOps(v){ saveJSON(LS.ops, v); }
  function addOperation({type, amount, category, comment}){
    const ops = loadOps();
    ops.push({ id: uid(), ts: new Date().toISOString(), date: todayISO(), type, amount: Number(amount), currency:"RUB", category: category || (type==="income"?"Доход":"Прочее 🧩"), comment: comment || "" });
    saveOps(ops);
  }

  // Forms
  const incomeAmount = document.getElementById("incomeAmount");
  const incomeComment = document.getElementById("incomeComment");
  const incomeSave = document.getElementById("incomeSave");

  const expenseAmount = document.getElementById("expenseAmount");
  const expenseCategory = document.getElementById("expenseCategory");
  const expenseComment = document.getElementById("expenseComment");
  const expenseSave = document.getElementById("expenseSave");

  expenseCategory.innerHTML = "";
  CATEGORIES.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c; opt.textContent = c;
    expenseCategory.appendChild(opt);
  });
  expenseCategory.value = "Продукты 🍎";

  wireAmountToButton(incomeAmount, incomeSave);
  wireAmountToButton(expenseAmount, expenseSave);

  incomeSave.addEventListener("click", () => {
    const amount = getNumFromEl(incomeAmount);
    const comment = (incomeComment.value || "").trim();
    if (!amount || amount <= 0){ tg?.HapticFeedback?.notificationOccurred("error"); showToast("Введите сумму больше 0"); return; }
    closeKeyboard();
    addOperation({ type:"income", amount, category:"Доход", comment });
    tg?.HapticFeedback?.notificationOccurred("success");
    showToast("Доход: +" + formatRUB(amount) + " RUB");
    incomeAmount.value = ""; incomeComment.value = "";
    wireAmountToButton(incomeAmount, incomeSave);
    setActiveTab("month"); showScreen("month");
  });

  expenseSave.addEventListener("click", () => {
    const amount = getNumFromEl(expenseAmount);
    const category = expenseCategory.value;
    const comment = (expenseComment.value || "").trim();
    if (!amount || amount <= 0){ tg?.HapticFeedback?.notificationOccurred("error"); showToast("Введите сумму больше 0"); return; }
    closeKeyboard();
    addOperation({ type:"expense", amount, category, comment });
    tg?.HapticFeedback?.notificationOccurred("success");
    showToast("Расход: −" + formatRUB(amount) + " RUB");
    expenseAmount.value = ""; expenseComment.value = "";
    wireAmountToButton(expenseAmount, expenseSave);
    setActiveTab("month"); showScreen("month");
  });

  // History
  const historyList = document.getElementById("historyList");
  function confirmDeleteOp(id){
    const ops = loadOps();
    const op = ops.find(o => o.id === id);
    if (!op) return;
    const sign = op.type === "income" ? "+" : "−";
    const body = document.createElement("div");
    body.innerHTML = '<div class="muted">Удалить запись?</div>'
      + '<div style="margin-top:10px;font-weight:950;">' + sign + formatRUB(op.amount) + ' RUB</div>'
      + '<div class="muted" style="margin-top:6px;font-size:12px;">' + escapeHtml(op.category) + (op.comment ? " • " + escapeHtml(op.comment) : "") + '</div>';
    const cancel = mkBtn("Отмена","btn btn--ghost", closeModal);
    const ok = mkBtn("Удалить","btn btn--danger", () => {
      saveOps(ops.filter(o => o.id !== id));
      closeModal(); showToast("Удалено"); renderHistory(); renderMonth();
    });
    openModal({ title:"Удаление", bodyNode: body, actions:[cancel, ok] });
  }
  function renderHistory(){
    const ops = loadOps().slice().reverse().slice(0, 30);
    historyList.innerHTML = "";
    if (!ops.length){
      const empty = document.createElement("div");
      empty.className = "item";
      empty.innerHTML = '<div class="muted">Пока пусто</div>';
      historyList.appendChild(empty);
      addAppear(empty, 0);
      return;
    }
    ops.forEach((op, i) => {
      const sign = op.type === "income" ? "+" : "−";
      const title = sign + formatRUB(op.amount) + " RUB";
      const div = document.createElement("div");
      div.className = "item";
      div.innerHTML =
        '<div class="item__top"><div><div class="item__title">' + title + '</div><div class="item__meta">'
        + escapeHtml(op.category) + (op.comment ? " • " + escapeHtml(op.comment) : "") + '</div></div><span class="chip">' + op.date + '</span></div>'
        + '<div style="margin-top:10px;"><button class="btn btn--danger btn--sm" data-del="' + op.id + '">Удалить</button></div>';
      historyList.appendChild(div);
      addAppear(div, i * 22);
    });
    historyList.querySelectorAll("[data-del]").forEach(b => b.addEventListener("click", () => confirmDeleteOp(b.dataset.del)));
  }

  // Month + Pie
  const monthCats = document.getElementById("monthCats");
  const monthMeta = document.getElementById("monthMeta");
  document.getElementById("monthRefresh").addEventListener("click", () => { renderMonth(); tg?.HapticFeedback?.selectionChanged(); });

  const pieCanvas = document.getElementById("pie");
  const pieCtx = pieCanvas.getContext("2d");
  function colorFromString(str){
    let hash = 0;
    for (let i=0;i<str.length;i++) hash = (hash*31 + str.charCodeAt(i)) >>> 0;
    const hue = hash % 360;
    return "hsl(" + hue + " 78% 62%)";
  }
  function drawPie(items, total){
    const w = pieCanvas.width, h = pieCanvas.height;
    pieCtx.clearRect(0,0,w,h);
    const cx=w/2, cy=h/2, r=Math.min(w,h)*0.42;

    if (!items.length || total<=0){
      pieCtx.beginPath(); pieCtx.arc(cx,cy,r,0,Math.PI*2);
      pieCtx.fillStyle="rgba(255,255,255,.06)"; pieCtx.fill();
      pieCtx.fillStyle="rgba(147,166,200,.85)"; pieCtx.font="800 14px system-ui";
      pieCtx.textAlign="center"; pieCtx.textBaseline="middle";
      pieCtx.fillText("Нет расходов", cx, cy);
      return;
    }

    let start=-Math.PI/2;
    items.forEach(([cat,sum]) => {
      const ang=(sum/total)*Math.PI*2;
      pieCtx.beginPath(); pieCtx.moveTo(cx,cy);
      pieCtx.arc(cx,cy,r,start,start+ang);
      pieCtx.closePath(); pieCtx.fillStyle=colorFromString(cat); pieCtx.fill();
      start+=ang;
    });

    pieCtx.beginPath(); pieCtx.arc(cx,cy,r*0.58,0,Math.PI*2);
    pieCtx.fillStyle="rgba(7,11,20,.92)"; pieCtx.fill();
    pieCtx.fillStyle="rgba(238,243,255,.95)"; pieCtx.font="950 16px system-ui";
    pieCtx.textAlign="center"; pieCtx.textBaseline="middle";
    pieCtx.fillText(formatRUB(total), cx, cy-8);
    pieCtx.fillStyle="rgba(147,166,200,.85)"; pieCtx.font="900 11px system-ui";
    pieCtx.fillText("RUB расходов", cx, cy+12);
  }

  function renderMonth(){
    topSubtitle.textContent = monthLabelRu(currentYM());
    const ym = currentYM();
    const ops = loadOps().filter(o => monthKey(o.date) === ym);

    let inc=0, exp=0;
    const byCat = {};
    ops.forEach(o => {
      if (o.type === "income") inc += Number(o.amount || 0);
      else {
        exp += Number(o.amount || 0);
        byCat[o.category || "Прочее 🧩"] = (byCat[o.category || "Прочее 🧩"] || 0) + Number(o.amount || 0);
      }
    });

    document.getElementById("kpiIncome").textContent = formatRUB(inc);
    document.getElementById("kpiExpense").textContent = formatRUB(exp);
    document.getElementById("kpiBalance").textContent = formatRUB(inc - exp);
    monthMeta.textContent = exp > 0 ? ("Всего: " + formatRUB(exp) + " RUB") : "Пока нет расходов";

    const items = Object.entries(byCat).sort((a,b) => b[1]-a[1]);
    monthCats.innerHTML = "";

    // Insight
    if (exp > 0 && items.length){
      const [cat, sum] = items[0];
      const pctTop = Math.round((sum/exp)*100);
      monthInsight.hidden = false;
      monthInsight.innerHTML = 'Больше всего: <span>' + escapeHtml(cat) + '</span> — ' + pctTop + '% (' + formatRUB(sum) + ' RUB)';
    } else {
      monthInsight.hidden = true;
      monthInsight.textContent = "";
    }

    if (!items.length){
      const empty = document.createElement("div");
      empty.className = "item";
      empty.innerHTML = '<div class="muted">Нет данных</div>';
      monthCats.appendChild(empty);
      addAppear(empty, 0);
      drawPie([], 0);
      renderPiggyMeta();
      return;
    }

    items.slice(0,10).forEach(([cat,sum], i) => {
      const pct = exp>0 ? Math.round((sum/exp)*100) : 0;
      const color = colorFromString(cat);
      const div = document.createElement("div");
      div.className = "item accent";
      div.style.setProperty("--accent", color);
      div.innerHTML =
        '<div class="item__top"><div><div class="item__title">' + escapeHtml(cat) + '</div>'
        + '<div class="item__meta">' + formatRUB(sum) + ' RUB • ' + pct + '%</div></div>'
        + '<span class="chip" style="border-color:' + color + '55;background:' + color + '22;color:rgba(238,243,255,.92)">' + pct + '%</span></div>';
      monthCats.appendChild(div);
      addAppear(div, i * 22);
    });

    drawPie(items, exp);
    renderPiggyMeta();
  }

  // Piggy
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

  function applyPiggyOpenState(){
    const open = piggyIsOpen();
    piggyBody.hidden = !open;
    piggyChev.classList.toggle("up", open);
    piggyChev.textContent = open ? "⌃" : "⌄";
  }
  function renderPiggyMeta(){
    const goals = loadGoals();
    let total=0;
    goals.forEach(g => total += Number(g.balance || 0));
    piggyMeta.textContent = goals.length ? ("Целей: " + goals.length + " • Итого: " + formatRUB(total) + " RUB") : "Нет целей";
  }

  piggyToggle.addEventListener("click", () => {
    const next = !piggyIsOpen();
    setPiggyOpen(next);
    applyPiggyOpenState();
    if (next) renderPiggy();
    tg?.HapticFeedback?.selectionChanged();
  });

  function confirmDeleteGoal(goalId){
    const goals = loadGoals();
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;
    const body = document.createElement("div");
    body.innerHTML = '<div class="muted">Удалить цель?</div>'
      + '<div style="margin-top:10px;font-weight:950;">' + escapeHtml(goal.emoji || "🐷") + " " + escapeHtml(goal.title) + '</div>'
      + '<div class="muted" style="margin-top:6px;font-size:12px;">Баланс: ' + formatRUB(goal.balance || 0) + ' RUB</div>';
    const cancel = mkBtn("Отмена","btn btn--ghost", closeModal);
    const ok = mkBtn("Удалить","btn btn--danger", () => {
      saveGoals(goals.filter(g => g.id !== goalId));
      closeModal(); showToast("Цель удалена"); renderPiggy(); renderPiggyMeta();
    });
    openModal({ title:"Удаление цели", bodyNode: body, actions:[cancel, ok] });
  }

  function wireSwipeToDelete(container){
    const front = container.querySelector(".swipe__front");
    const behind = container.querySelector(".swipe__behind");
    const goalId = container.dataset.goalId;

    let startX=0, dx=0, dragging=false;
    const close = () => container.classList.remove("open");
    const open = () => { container.classList.add("open"); tg?.HapticFeedback?.selectionChanged(); };

    behind.addEventListener("click", () => confirmDeleteGoal(goalId));

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
      if (dx < 0){
        const clamped = Math.max(dx, -110);
        front.style.transform = "translateX(" + clamped + "px)";
      }
    }, {passive:true});

    front.addEventListener("touchend", () => {
      dragging = false;
      front.style.transform = "";
      if (dx < -45) open(); else close();
    }, {passive:true});

    front.addEventListener("click", () => { if (container.classList.contains("open")) close(); });
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

    const targetLbl = document.createElement("label");
    targetLbl.className = "label";
    targetLbl.textContent = "Сумма цели (RUB)";
    const targetInput = document.createElement("input");
    targetInput.className = "input";
    targetInput.type = "number";
    targetInput.inputMode = "decimal";
    targetInput.min = "0";
    targetInput.step = "0.01";
    targetInput.placeholder = "Например: 50000";

    let selected = "🐷";
    const buttons = [];

    function setSelected(btn, emoji){
      selected = emoji;
      buttons.forEach(x => { x.style.boxShadow="none"; x.style.borderColor="rgba(255,255,255,.10)"; });
      btn.style.borderColor="rgba(46,166,255,.55)";
      btn.style.boxShadow="0 0 0 4px rgba(46,166,255,.12)";
      tg?.HapticFeedback?.selectionChanged();
    }

    EMOJI_CATALOG.forEach((e) => {
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
      b.addEventListener("click", () => setSelected(b, e));
      buttons.push(b);
      grid.appendChild(b);
    });

    body.appendChild(titleLbl);
    body.appendChild(titleInput);
    body.appendChild(iconLbl);
    body.appendChild(grid);
    body.appendChild(targetLbl);
    body.appendChild(targetInput);

    const cancel = mkBtn("Отмена", "btn btn--ghost", closeModal);
    const ok = mkBtn("Добавить", "btn btn--primary", () => {
      const title = (titleInput.value || "").trim();
      const target = getNumFromEl(targetInput);
      if (!title){ showToast("Введите название цели"); return; }
      if (!Number.isFinite(target) || target <= 0){ showToast("Введите сумму цели"); return; }
      const goals = loadGoals();
      goals.push({ id: uid(), title, emoji: selected, balance: 0, target: Number(target), completed: false });
      saveGoals(goals);
      closeModal();
      showToast("Цель добавлена");
      renderPiggy();
      renderPiggyMeta();
    });

    openModal({ title:"Новая цель", bodyNode: body, actions:[cancel, ok] });
    setTimeout(() => titleInput.focus(), 120);
    setTimeout(() => { if (buttons[0]) setSelected(buttons[0], EMOJI_CATALOG[0]); }, 0);
  }

  piggyAddGoal.addEventListener("click", () => openAddGoalModal());

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
      const val = getNumFromEl(input);
      if (!Number.isFinite(val) || val <= 0){ showToast("Введите сумму больше 0"); return; }

      const prevBalance = Number(goal.balance || 0);
      const delta = mode === "add" ? val : -val;

      if (mode === "take" && prevBalance + delta < 0){
        showToast("Недостаточно средств в цели");
        tg?.HapticFeedback?.notificationOccurred("error");
        return;
      }

      goal.balance = prevBalance + delta;

      const target = Number(goal.target || 0);
      const wasCompleted = !!goal.completed;
      const nowCompleted = target > 0 ? (goal.balance >= target) : false;
      goal.completed = nowCompleted;

      saveGoals(goals);

      // Add to operations
      const absAmount = Math.abs(val);
      const goalTitle = (goal.title || "").trim();
      if (mode === "add"){
        addOperation({ type:"expense", amount: absAmount, category:"Копилка 🐷", comment:"Копилка → " + goalTitle });
      } else {
        addOperation({ type:"income", amount: absAmount, category:"Копилка 🐷", comment:"Копилка ← " + goalTitle });
      }

      closeModal();

      if (!wasCompleted && nowCompleted){
        tg?.HapticFeedback?.notificationOccurred("success");
        showToast("Цель достигнута ✅");
      }else{
        tg?.HapticFeedback?.notificationOccurred("success");
        showToast(mode === "add" ? "Пополнено" : "Снято");
      }

      renderPiggy();
      renderPiggyMeta();
      renderMonth();
    });

    openModal({ title:(goal.emoji || "🐷") + " " + goal.title, bodyNode: body, actions:[cancel, ok] });
    setTimeout(() => input.focus(), 120);
  }

  function renderPiggy(){
    const goals = loadGoals();
    piggyGoals.innerHTML = "";
    if (!goals.length){
      const empty = document.createElement("div");
      empty.className = "item";
      empty.innerHTML = '<div class="muted">Пока нет целей. Нажми “+ Цель”.</div>';
      piggyGoals.appendChild(empty);
      addAppear(empty, 0);
      renderPiggyMeta();
      return;
    }

    goals.forEach((g, i) => {
      const balance = Number(g.balance || 0);
      const target = Number(g.target || 0);
      const pct = target > 0 ? Math.max(0, Math.min(100, Math.round((balance/target)*100))) : 0;
      const done = target > 0 ? (balance >= target) : false;

      const wrap = document.createElement("div");
      wrap.className = "swipe";
      wrap.dataset.goalId = g.id;

      const goalClass = done ? "item goal--done" : "item";
      const badge = done ? '<span class="badge badge--done">✓ Цель достигнута</span>' : '<span class="badge">Цель: ' + formatRUB(target) + ' RUB</span>';

      wrap.innerHTML =
        '<div class="swipe__behind"><div class="swipe__delete">Удалить</div></div>'
        + '<div class="swipe__front"><div class="' + goalClass + '">'
        + '<div class="item__top"><div><div class="item__title">' + escapeHtml(g.emoji || "🐷") + " " + escapeHtml(g.title) + '</div>'
        + '<div class="item__meta">Баланс: ' + formatRUB(balance) + ' / ' + formatRUB(target) + ' RUB • ' + pct + '%</div></div>'
        + '<div style="display:flex;flex-direction:column;gap:8px;align-items:flex-end;">' + badge + '</div></div>'
        + '<div class="progress"><div class="progress__fill" style="width:' + pct + '%"></div></div>'
        + '<div style="margin-top:10px; display:flex; gap:10px;">'
        + '<button class="btn btn--primary btn--sm" data-add="' + g.id + '">+ Пополнить</button>'
        + '<button class="btn btn--danger btn--sm" data-take="' + g.id + '">− Снять</button>'
        + '</div></div></div>';

      piggyGoals.appendChild(wrap);
      wireSwipeToDelete(wrap);
      addAppear(wrap, i * 22);
    });

    piggyGoals.querySelectorAll("[data-add]").forEach(b => b.addEventListener("click", () => openPiggyAmount(b.dataset.add, "add")));
    piggyGoals.querySelectorAll("[data-take]").forEach(b => b.addEventListener("click", () => openPiggyAmount(b.dataset.take, "take")));
    renderPiggyMeta();
  }

  // Init
  applyPiggyOpenState();
  renderPiggyMeta();
  setActiveTab("month");
  showScreen("month");

  // Tabs
  document.querySelectorAll(".tab").forEach(t => t.addEventListener("click", () => {
    const name = t.dataset.tab;
    setActiveTab(name);
    showScreen(name);
    tg?.HapticFeedback?.selectionChanged();
  }));
})();
setActiveTab("month");
showScreen("month");

