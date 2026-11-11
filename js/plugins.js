/* =========================================================
   Плагіни головної сторінки (підключені через CDN у index.html)
   1. Swiper.js — слайдер автопарку
   2. Fancybox v5 — галерея з переглядом на весь екран
   3. Typed.js — ефект друку тексту в Hero
   Ініціалізація чекає завантаження DOM (DOMContentLoaded).
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  // Якщо в системі ввімкнено «зменшити рух», вимикаємо автопрокрутку й анімацію друку
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. Swiper.js ---------- */
  if (window.Swiper && document.querySelector('.cars-swiper')) {
    new Swiper('.cars-swiper', {
      loop: true,                 // після останнього авто знову перше
      spaceBetween: 24,           // відступ між картками, px
      speed: 600,                 // тривалість анімації перегортання, мс
      grabCursor: true,

      autoplay: reduceMotion ? false : {
        delay: 3500,              // пауза між перегортаннями, мс
        disableOnInteraction: false,
        pauseOnMouseEnter: true,  // зупинка, поки курсор на слайдері
      },

      pagination: {
        el: '.cars-pagination',
        clickable: true,
      },

      navigation: {
        prevEl: '.cars-prev',
        nextEl: '.cars-next',
      },

      keyboard: {
        enabled: true,            // стрілки клавіатури, коли слайдер на екрані
        onlyInViewport: true,
      },

      a11y: {
        prevSlideMessage: 'Попереднє авто',
        nextSlideMessage: 'Наступне авто',
        paginationBulletMessage: 'Перейти до авто {{index}}',
        slideLabelMessage: '{{index}} з {{slidesLength}}',
      },

      // Адаптивність: скільки карток видно на різних екранах
      breakpoints: {
        320: { slidesPerView: 1 },
        768: { slidesPerView: 2 },
        1024: { slidesPerView: 3 },
      },
    });
  }

  /* ---------- 2. Fancybox v5 ---------- */
  if (window.Fancybox) {
    Fancybox.bind('[data-fancybox="retro-gallery"]', {
      Carousel: { transition: 'fade' },      // плавне згасання між фото
      Images: { Panzoom: { maxScale: 3 } },  // наближення до 3×
    });
  }

  /* ---------- 3. Typed.js ---------- */
  const typedEl = document.getElementById('typed-text');
  const STRINGS = ['Весілля мрії.', 'Стильна фотосесія.', 'Вікенд за кермом.', 'Кліп або реклама.'];

  if (typedEl && window.Typed) {
    if (reduceMotion) {
      typedEl.textContent = STRINGS[0];
    } else {
      new Typed('#typed-text', {
        strings: STRINGS,
        typeSpeed: 50,    // швидкість друку, мс на символ
        backSpeed: 30,    // швидкість стирання
        backDelay: 1800,  // пауза перед стиранням
        loop: true,       // по колу
      });
    }
  }
});
