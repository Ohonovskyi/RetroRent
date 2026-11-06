/* =========================================================
   Галерея на сторінці авто: клік по мініатюрі міняє велике фото.
   [data-gallery-main] — велике фото, [data-gallery-thumb] — мініатюри.
   ========================================================= */

(function () {
  'use strict';

  const main = document.querySelector('[data-gallery-main]');
  if (!main) return;

  const mainImg = main.querySelector('img');
  const thumbs = document.querySelectorAll('[data-gallery-thumb]');

  // Фото ще немає: показуємо той самий сірий плейсхолдер, що й на всьому сайті
  mainImg.addEventListener('error', () => main.classList.add('media--empty'));

  thumbs.forEach((thumb) => {
    thumb.addEventListener('click', () => {
      main.classList.remove('media--empty');
      mainImg.src = thumb.querySelector('img').getAttribute('src');
      thumbs.forEach((item) => item.setAttribute('aria-pressed', String(item === thumb)));
    });
  });
})();
