/* =========================================================
   Плагіни головної сторінки (CDN jsDelivr)
   1. Swiper.js — слайдер автопарку
   2. Fancybox v5 — галерея з переглядом на весь екран
   3. Typed.js — ефект друку тексту в Hero

   ЛР №12 (Performance): Swiper і Fancybox не потрібні для першого екрана,
   тому їхні CSS і JS завантажуються лише тоді, коли слайдер чи галерея
   наближаються до видимої області (IntersectionObserver). Так 80+ KB
   стороннього коду більше не блокують відображення сторінки.
   Typed.js (3 KB) потрібен у Hero одразу і підключений у index.html з defer.
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  // Якщо в системі ввімкнено «зменшити рух», вимикаємо автопрокрутку й анімацію друку
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const CDN = {
    swiperCss: 'https://cdn.jsdelivr.net/npm/swiper@11.1.14/swiper-bundle.min.css',
    swiperJs: 'https://cdn.jsdelivr.net/npm/swiper@11.1.14/swiper-bundle.min.js',
    fancyboxCss: 'https://cdn.jsdelivr.net/npm/@fancyapps/ui@5.0.36/dist/fancybox/fancybox.css',
    fancyboxJs: 'https://cdn.jsdelivr.net/npm/@fancyapps/ui@5.0.36/dist/fancybox/fancybox.umd.js',
  };

  /* ---------- Завантаження за потреби ---------- */
  function loadStyle(href) {
    if (document.querySelector(`link[href="${href}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.prepend(link); // перед style.css, щоб власні стилі могли уточнювати плагін
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Не вдалося завантажити ${src}`));
      document.body.append(script);
    });
  }

  // Викликає callback один раз, коли елемент за 400 px від видимої області
  function whenNear(element, callback) {
    if (!element) return;
    if (typeof window.IntersectionObserver !== 'function') { callback(); return; } // старий браузер — одразу
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer.disconnect();
        callback();
      }
    }, { rootMargin: '400px 0px' });
    observer.observe(element);
  }

  /* ---------- 1. Swiper.js ---------- */
  function initSwiper() {
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

  whenNear(document.querySelector('.cars-swiper'), () => {
    loadStyle(CDN.swiperCss);
    loadScript(CDN.swiperJs)
      .then(initSwiper)
      .catch((error) => console.warn('[Слайдер]', error.message)); // без Swiper картки просто гортаються свайпом
  });

  /* ---------- 2. Fancybox v5 ---------- */
  // Поки Fancybox не завантажився, клік по фото відкриває саме зображення — галерея не «ламається»
  whenNear(document.querySelector('[data-fancybox="retro-gallery"]'), () => {
    loadStyle(CDN.fancyboxCss);
    loadScript(CDN.fancyboxJs)
      .then(() => {
        Fancybox.bind('[data-fancybox="retro-gallery"]', {
          Carousel: { transition: 'fade' },      // плавне згасання між фото
          Images: { Panzoom: { maxScale: 3 } },  // наближення до 3×
        });
      })
      .catch((error) => console.warn('[Галерея]', error.message));
  });

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
