/* =========================================================
   Темна тема
   Підключається в <head> до стилів, щоб тема ввімкнулась
   ще до відмальовування сторінки (без «спалаху» світлої теми).

   - Вибір зберігається в localStorage і діє на всіх сторінках.
   - Якщо користувач ще не обирав, береться тема системи.
   - Кнопки перемикання: будь-який елемент з [data-theme-toggle].
   ========================================================= */

(function () {
  'use strict';

  const KEY = 'retrorent-theme';
  const root = document.documentElement;
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)');

  // localStorage може бути недоступний (приватний режим) — тоді просто не зберігаємо
  function getSaved() {
    try { return localStorage.getItem(KEY); } catch (error) { return null; }
  }
  function save(theme) {
    try { localStorage.setItem(KEY, theme); } catch (error) { /* не критично */ }
  }

  function updateButtons() {
    const dark = root.classList.contains('dark');
    document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
      button.setAttribute('aria-pressed', String(dark));
      button.setAttribute('aria-label', dark ? 'Увімкнути світлу тему' : 'Увімкнути темну тему');
      const label = button.querySelector('[data-theme-label]');
      if (label) label.textContent = dark ? 'Світла тема' : 'Темна тема';
    });
  }

  function apply(theme) {
    root.classList.toggle('dark', theme === 'dark');
    root.style.colorScheme = theme; // системні елементи (календар, скролбар) теж темніють
    updateButtons();
  }

  apply(getSaved() || (systemDark.matches ? 'dark' : 'light'));

  // Змінилась тема системи, а користувач сам не обирав — підлаштовуємось
  systemDark.addEventListener('change', (event) => {
    if (!getSaved()) apply(event.matches ? 'dark' : 'light');
  });

  // Тему змінили в іншій вкладці сайту
  window.addEventListener('storage', (event) => {
    if (event.key === KEY && event.newValue) apply(event.newValue);
  });

  document.addEventListener('DOMContentLoaded', () => {
    updateButtons();
    document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
      button.addEventListener('click', () => {
        const next = root.classList.contains('dark') ? 'light' : 'dark';
        save(next);
        apply(next);
      });
    });
  });
})();
