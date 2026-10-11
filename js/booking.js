/* =========================================================
   Бронювання на сторінці авто
   1. Два календарі: дата отримання / дата повернення
   2. Перерахунок вартості (ціна × кількість діб)
   3. Чекбокс КАСКО
   4. Кнопка "Забронювати" → завантаження → модалка "Бронювання підтверджено!"

   Ціна і назва авто беруться з атрибутів форми:
     <form data-booking data-car="Mercedes-Benz C140" data-price="299">
   ========================================================= */

(function () {
  'use strict';

  const form = document.querySelector('[data-booking]');
  if (!form) return;

  /* ---------- Довідники ---------- */
  const MONTHS = ['Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень',
    'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень'];
  const MONTHS_GEN = ['січня', 'лютого', 'березня', 'квітня', 'травня', 'червня',
    'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня'];
  const MONTHS_SHORT = ['січ', 'лют', 'бер', 'квіт', 'трав', 'черв',
    'лип', 'серп', 'вер', 'жовт', 'лист', 'груд'];
  const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];

  const DEFAULT_START_OFFSET = 1; // отримання — завтра
  const DEFAULT_DURATION = 3;     // за замовчуванням 3 доби
  const FAKE_REQUEST_MS = 1200;   // імітація запиту на сервер

  /* ---------- Утиліти для дат ---------- */
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const isSameDay = (a, b) => a.getTime() === b.getTime();
  const diffDays = (a, b) => Math.round((b - a) / 86400000);
  const pad = (n) => String(n).padStart(2, '0');

  const formatShort = (d) => `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
  const formatLong = (d) => `${d.getDate()} ${MONTHS_GEN[d.getMonth()]} ${d.getFullYear()}`;
  const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  // 1 доба, 2 доби, 5 діб, 11 діб, 21 доба
  function pluralDays(n) {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return 'доба';
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'доби';
    return 'діб';
  }

  const formatMoney = (n) => `${n.toLocaleString('uk-UA')}$`;

  /* ---------- Стан ---------- */
  const price = Number(form.dataset.price) || 0;
  const today = startOfDay(new Date());

  const state = {
    pickup: addDays(today, DEFAULT_START_OFFSET),
    return: addDays(today, DEFAULT_START_OFFSET + DEFAULT_DURATION),
    kasko: true,
  };

  /* ---------- Елементи ---------- */
  const noteEl = form.querySelector('[data-booking-note]');
  const rentLabelEl = form.querySelector('[data-summary-rent-label]');
  const rentEl = form.querySelector('[data-summary-rent]');
  const kaskoEl = form.querySelector('[data-summary-kasko]');
  const totalEl = form.querySelector('[data-summary-total]');
  const kaskoInput = form.querySelector('[data-kasko]');
  const submitBtn = form.querySelector('[type="submit"]');

  /* =========================================================
     Календар
     ========================================================= */
  const pickers = [];

  function createPicker(root) {
    const key = root.dataset.datepicker; // "pickup" | "return"
    const field = root.querySelector('.datepicker__field');
    const valueEl = root.querySelector('[data-datepicker-value]');
    const input = root.querySelector('input[type="hidden"]');
    const popover = root.querySelector('.datepicker__popover');
    let view = null; // перше число місяця, що зараз показаний

    const minDate = () => (key === 'pickup' ? today : addDays(state.pickup, 1));
    const selected = () => state[key];

    function render() {
      const year = view.getFullYear();
      const month = view.getMonth();
      const offset = (new Date(year, month, 1).getDay() + 6) % 7; // тиждень з понеділка
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const min = minDate();
      const canGoBack = new Date(year, month, 0) >= min;

      let html = `
        <div class="calendar__head">
          <button type="button" class="calendar__nav" data-step="-1" aria-label="Попередній місяць" ${canGoBack ? '' : 'disabled'}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <span class="calendar__title" aria-live="polite">${MONTHS[month]} ${year}</span>
          <button type="button" class="calendar__nav" data-step="1" aria-label="Наступний місяць">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
          </button>
        </div>
        <div class="calendar__weekdays">${WEEKDAYS.map((d) => `<span>${d}</span>`).join('')}</div>
        <div class="calendar__grid">`;

      for (let i = 0; i < offset; i += 1) html += '<span></span>';

      for (let day = 1; day <= daysInMonth; day += 1) {
        const date = new Date(year, month, day);
        const isSelected = isSameDay(date, state.pickup) || isSameDay(date, state.return);
        const inRange = date > state.pickup && date < state.return;
        const classes = ['calendar__day'];
        if (isSameDay(date, today)) classes.push('is-today');
        if (isSelected) classes.push('is-selected');
        if (inRange) classes.push('is-range');

        html += `<button type="button" class="${classes.join(' ')}" data-day="${day}"
          aria-label="${formatLong(date)}" aria-pressed="${isSelected}" ${date < min ? 'disabled' : ''}>${day}</button>`;
      }

      html += '</div>';
      popover.innerHTML = html;
    }

    function open() {
      pickers.forEach((p) => p !== api && p.close());
      const s = selected();
      view = new Date(s.getFullYear(), s.getMonth(), 1);
      render();
      popover.hidden = false;
      root.classList.add('is-open');
      field.setAttribute('aria-expanded', 'true');
      const current = popover.querySelector('.calendar__day.is-selected:not([disabled])');
      if (current) current.focus();
    }

    function close() {
      if (popover.hidden) return;
      popover.hidden = true;
      root.classList.remove('is-open');
      field.setAttribute('aria-expanded', 'false');
    }

    function sync() {
      valueEl.textContent = formatShort(selected());
      input.value = toISO(selected());
    }

    field.addEventListener('click', () => (popover.hidden ? open() : close()));

    popover.addEventListener('click', (event) => {
      const stepBtn = event.target.closest('[data-step]');
      if (stepBtn) {
        view = new Date(view.getFullYear(), view.getMonth() + Number(stepBtn.dataset.step), 1);
        render();
        return;
      }

      const dayBtn = event.target.closest('[data-day]');
      if (dayBtn && !dayBtn.disabled) {
        selectDate(key, new Date(view.getFullYear(), view.getMonth(), Number(dayBtn.dataset.day)));
        close();
        field.focus();
      }
    });

    const api = { root, open, close, sync };
    return api;
  }

  function selectDate(key, date) {
    if (key === 'pickup') {
      const duration = Math.max(diffDays(state.pickup, state.return), 1);
      state.pickup = date;
      // Якщо повернення стало раніше за отримання — зсуваємо, зберігаючи тривалість
      if (state.return <= date) state.return = addDays(date, duration);
    } else {
      state.return = date;
    }
    update();
  }

  form.querySelectorAll('[data-datepicker]').forEach((root) => pickers.push(createPicker(root)));

  // Клік поза календарем — закрити.
  // composedPath, бо після перемальовування календаря event.target вже не в DOM.
  document.addEventListener('click', (event) => {
    const path = event.composedPath();
    pickers.forEach((p) => {
      if (!path.includes(p.root)) p.close();
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    pickers.forEach((p) => {
      if (p.root.classList.contains('is-open')) {
        p.close();
        p.root.querySelector('.datepicker__field').focus();
      }
    });
  });

  /* =========================================================
     Підрахунок вартості
     ========================================================= */
  function update() {
    const days = diffDays(state.pickup, state.return);
    const word = pluralDays(days);
    const rent = price * days;

    pickers.forEach((p) => p.sync());

    noteEl.textContent = `${days} ${word} · повернення в той самий час`;
    rentLabelEl.textContent = `Оренда · ${price}$ × ${days} ${word}`;
    rentEl.textContent = formatMoney(rent);
    kaskoEl.textContent = state.kasko ? 'Включено' : 'Без КАСКО';
    totalEl.textContent = formatMoney(rent);
  }

  kaskoInput.addEventListener('change', () => {
    state.kasko = kaskoInput.checked;
    update();
  });

  update();

  /* =========================================================
     Відправка + модалка
     ========================================================= */
  const modal = document.querySelector('[data-modal]');
  let lastFocused = null;

  function openModal() {
    lastFocused = document.activeElement;
    modal.hidden = false;
    document.documentElement.classList.add('is-locked');
    requestAnimationFrame(() => modal.classList.add('is-visible'));
    modal.querySelector('[data-modal-focus]').focus();
  }

  function closeModal() {
    modal.classList.remove('is-visible');
    document.documentElement.classList.remove('is-locked');
    window.setTimeout(() => { modal.hidden = true; }, 250);
    if (lastFocused) lastFocused.focus();
  }

  if (modal) {
    modal.addEventListener('click', (event) => {
      if (event.target === modal) closeModal();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !modal.hidden) closeModal();
    });
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (submitBtn.classList.contains('is-loading')) return;

    submitBtn.classList.add('is-loading');
    submitBtn.setAttribute('aria-busy', 'true');

    /*
      TODO (бекенд): тут буде реальний запит, наприклад:
      fetch('/api/bookings', { method: 'POST', body: new FormData(form) })
      У FormData вже є: pickup, return (YYYY-MM-DD), kasko, car.
    */
    window.setTimeout(() => {
      submitBtn.classList.remove('is-loading');
      submitBtn.removeAttribute('aria-busy');
      openModal();
    }, FAKE_REQUEST_MS);
  });
})();
