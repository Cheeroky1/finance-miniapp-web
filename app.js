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
