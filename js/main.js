/* =========================================================
   RetroRent — спільний JS для всіх сторінок
   1. Мобільне меню ("Меню" → випадний список)
   2. Стан "обрано" для кнопок після кліку (.js-press)
   3. Плейсхолдери для зображень, яких ще немає
   ========================================================= */

(function () {
  'use strict';

  /* ---------- 1. Мобільне меню ----------
     Список має класи "hidden md:flex": на мобільному схований,
     з md (768px) і ширше — завжди видно. JS лише перемикає hidden. */
  const nav = document.querySelector('[data-nav]');

  if (nav) {
    const toggle = nav.querySelector('[data-nav-toggle]');
    const list = nav.querySelector('[data-nav-list]');

    const isOpen = () => toggle.getAttribute('aria-expanded') === 'true';
    const setOpen = (open) => {
      list.classList.toggle('hidden', !open);
      toggle.setAttribute('aria-expanded', String(open));
    };

    toggle.addEventListener('click', () => setOpen(!isOpen()));

    // Клік поза меню — закрити
    document.addEventListener('click', (event) => {
      if (isOpen() && !nav.contains(event.target)) setOpen(false);
    });

    // Esc — закрити і повернути фокус на кнопку
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && isOpen()) {
        setOpen(false);
        toggle.focus();
      }
    });

    // Перехід по пункту — закрити
    list.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => setOpen(false));
    });

    // Повернулись на широкий екран — скинути стан
    window.matchMedia('(min-width: 768px)').addEventListener('change', (event) => {
      if (event.matches) setOpen(false);
    });
  }

  /* ---------- 2. Стан "обрано" після кліку ---------- */
  document.querySelectorAll('.js-press').forEach((button) => {
    button.addEventListener('click', () => {
      button.classList.add('is-pressed');
      window.setTimeout(() => button.classList.remove('is-pressed'), 600);
    });
  });

  /* ---------- 3. Плейсхолдери зображень ---------- */
  document.querySelectorAll('.media img').forEach((img) => {
    const markEmpty = () => img.closest('.media').classList.add('media--empty');

    if (img.complete && img.naturalWidth === 0) {
      markEmpty();
    } else {
      img.addEventListener('error', markEmpty, { once: true });
    }
  });
})();
