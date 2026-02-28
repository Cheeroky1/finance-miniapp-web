const output = document.getElementById("output");
const testBtn = document.getElementById("testBtn");

// Проверяем, есть ли Telegram WebApp
const tg = window.Telegram?.WebApp;

if (tg) {
    tg.expand(); // раскрыть на весь экран внутри Telegram
}

testBtn.addEventListener("click", () => {
    if (!tg) {
        output.innerHTML = "⚠️ Открыто НЕ внутри Telegram";
        return;
    }

    const user = tg.initDataUnsafe?.user;

    if (user) {
        output.innerHTML = `
            ✅ Открыто внутри Telegram<br><br>
            ID: ${user.id}<br>
            Имя: ${user.first_name}<br>
            Username: ${user.username || "нет"}
        `;
    } else {
        output.innerHTML = "⚠️ Telegram обнаружен, но данных пользователя нет";
    }
});