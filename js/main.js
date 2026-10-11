/* =========================================================
   RetroRent — спільний JS для всіх сторінок
   1. Мобільне меню ("Меню" → випадний список)
   2. Стан "обрано" для кнопок після кліку
   3. Плейсхолдери для зображень, яких ще немає
   ========================================================= */

(function () {
  'use strict';

  /* ---------- 1. Мобільне меню ---------- */
  const nav = document.querySelector('[data-nav]');

  if (nav) {
    const toggle = nav.querySelector('[data-nav-toggle]');

    const setOpen = (open) => {
      nav.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
    };

    toggle.addEventListener('click', () => {
      setOpen(!nav.classList.contains('is-open'));
    });

    // Клік поза меню — закрити
    document.addEventListener('click', (event) => {
      if (!nav.contains(event.target)) setOpen(false);
    });

    // Esc — закрити і повернути фокус на кнопку
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && nav.classList.contains('is-open')) {
        setOpen(false);
        toggle.focus();
      }
    });

    // Перехід по пункту — закрити
    nav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => setOpen(false));
    });

    // Повернулись на широкий екран — закрити
    window.matchMedia('(min-width: 769px)').addEventListener('change', (event) => {
      if (event.matches) setOpen(false);
    });
  }

  /* ---------- 2. Стан "обрано" після кліку ---------- */
  document.querySelectorAll('.btn--primary, .btn--light').forEach((button) => {
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
