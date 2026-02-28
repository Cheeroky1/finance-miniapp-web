const tg = window.Telegram?.WebApp;
if (tg) tg.expand();

const subtitle = document.getElementById("subtitle");

const screens = {
  menu: document.getElementById("screen-menu"),
  month: document.getElementById("screen-month"),
  income: document.getElementById("screen-income"),
  expense: document.getElementById("screen-expense"),
  last: document.getElementById("screen-last"),
  pig: document.getElementById("screen-pig"),
  undo: document.getElementById("screen-undo"),
};

const titles = {
  menu: "Меню",
  month: "Месяц",
  income: "Доход",
  expense: "Расход",
  last: "Последние",
  pig: "Копилка",
  undo: "Отмена последней",
};

function showScreen(name){
  Object.values(screens).forEach(s => s.classList.remove("active"));
  screens[name].classList.add("active");
  subtitle.textContent = titles[name] || "";
}

document.querySelectorAll("[data-nav]").forEach(btn => {
  btn.addEventListener("click", () => {
    const name = btn.getAttribute("data-nav");
    showScreen(name);
    tg?.HapticFeedback?.selectionChanged();
  });
});

document.querySelectorAll("[data-back]").forEach(btn => {
  btn.addEventListener("click", () => {
    showScreen("menu");
    tg?.HapticFeedback?.selectionChanged();
  });
});

// стартовый экран
showScreen("menu");

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

document.getElementById("incomeSave").addEventListener("click", () => {
  const amount = getNumberValue("incomeAmount");
  const comment = getTextValue("incomeComment");

  if (!amount || amount <= 0) {
    tg?.HapticFeedback?.notificationOccurred("error");
    showToast("Введите сумму больше 0");
    return;
  }

  // Пока просто подтверждение (следующим шагом отправим в бота)
  tg?.HapticFeedback?.notificationOccurred("success");
  showToast(`Доход сохранён: +${amount} RUB${comment ? "\n" + comment : ""}`);

  clearInputs(["incomeAmount", "incomeComment"]);
  showScreen("menu");
});

document.getElementById("expenseSave").addEventListener("click", () => {
  const amount = getNumberValue("expenseAmount");
  const comment = getTextValue("expenseComment");

  if (!amount || amount <= 0) {
    tg?.HapticFeedback?.notificationOccurred("error");
    showToast("Введите сумму больше 0");
    return;
  }

  tg?.HapticFeedback?.notificationOccurred("success");
  showToast(`Расход сохранён: -${amount} RUB${comment ? "\n" + comment : ""}`);

  clearInputs(["expenseAmount", "expenseComment"]);
  showScreen("menu");
});


