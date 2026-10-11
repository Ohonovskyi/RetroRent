/* =========================================================
   Фільтр каталогу по класах: Усі / Весілля / Фотосесія / Self-drive
   Розмітка:
     [data-filter-root]          — обгортка
     [data-filter="wedding"]     — кнопка фільтра
     [data-category="wedding"]   — картка авто
   Підтримує посилання виду cars.html?category=wedding
   ========================================================= */

(function () {
  'use strict';

  const root = document.querySelector('[data-filter-root]');
  if (!root) return;

  const buttons = root.querySelectorAll('[data-filter]');
  const cards = root.querySelectorAll('[data-category]');
  const empty = root.querySelector('[data-filter-empty]');

  function apply(category, updateUrl) {
    let visible = 0;

    buttons.forEach((button) => {
      const active = button.dataset.filter === category;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });

    cards.forEach((card) => {
      const show = category === 'all' || card.dataset.category === category;
      card.hidden = !show;
      if (show) visible += 1;
    });

    if (empty) empty.hidden = visible > 0;

    if (updateUrl) {
      try {
        const url = new URL(window.location.href);
        if (category === 'all') url.searchParams.delete('category');
        else url.searchParams.set('category', category);
        window.history.replaceState(null, '', url);
      } catch (error) {
        // file:// у деяких браузерах не дозволяє змінювати URL — не критично
      }
    }
  }

  buttons.forEach((button) => {
    button.addEventListener('click', () => apply(button.dataset.filter, true));
  });

  const fromUrl = new URLSearchParams(window.location.search).get('category');
  const isValid = Array.from(buttons).some((button) => button.dataset.filter === fromUrl);

  apply(isValid ? fromUrl : 'all', false);
})();
