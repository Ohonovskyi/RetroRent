/* =========================================================
   Бронювання на сторінці авто
   1. Два календарі: дата отримання / дата повернення
   2. Хто за кермом: самостійно (потрібна перевірка посвідчення) або з водієм
   3. Страхування: чотири рівні, кожен змінює ціну, франшизу й заставу
   4. Перерахунок вартості в доларах і гривнях (курс НБУ)
   5. Контакти клієнта: ім'я й телефон, на який передзвонить менеджер
   6. Кнопка "Забронювати" → завантаження → модалка "Бронювання підтверджено!"

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

  /* ---------- Умови оренди ----------
     Усі ціни та умови страхування задаються тут.
     percent — надбавка до ціни за добу, %.
     franchise, deposit — скільки добових ставок авто становлять франшиза й застава
     (franchise: null означає, що всю шкоду клієнт покриває сам). */
  const DRIVER_PRICE = 50; // послуга водія, $ за добу

  const INSURANCE = [
    {
      id: 'none', name: 'Без страхування', percent: 0, franchise: null, deposit: 6,
      covers: 'Лише обов’язкове ОСЦПВ. Шкоду авто ви покриваєте самостійно.',
    },
    {
      id: 'basic', name: 'Базове КАСКО', percent: 10, franchise: 2, deposit: 3,
      covers: 'ДТП та викрадення.',
    },
    {
      id: 'full', name: 'Повне КАСКО', percent: 20, franchise: 1, deposit: 1.5,
      covers: 'ДТП, викрадення, скло, шини, вандалізм і стихія.',
    },
    {
      id: 'premium', name: 'Преміум', percent: 30, franchise: 0, deposit: 0.5, featured: true,
      covers: 'Усе з Повного КАСКО, а ще евакуатор 24/7 і підмінне авто.',
    },
  ];
  const DEFAULT_INSURANCE = 'basic';

  /* ---------- Курс долара ----------
     Офіційний курс НБУ. Якщо запит не вдався, працює запасний курс. */
  const RATE_URL = 'https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?valcode=USD&json';
  const FALLBACK_RATE = 45;

  /* ---------- Класи Tailwind для календаря ---------- */
  const NAV_BTN = 'grid h-8 w-8 place-items-center rounded-full transition-colors hover:bg-gray-100 '
    + 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange '
    + 'disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent';
  const DAY_BTN = 'aspect-square text-[13px] transition-colors '
    + 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-orange '
    + 'disabled:cursor-not-allowed disabled:bg-transparent disabled:text-gray-300';

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
  const roundToTen = (n) => Math.round(n / 10) * 10;

  /* ---------- Стан ---------- */
  const price = Number(form.dataset.price) || 0;
  const today = startOfDay(new Date());

  const state = {
    pickup: addDays(today, DEFAULT_START_OFFSET),
    return: addDays(today, DEFAULT_START_OFFSET + DEFAULT_DURATION),
    insurance: DEFAULT_INSURANCE,
    mode: form.dataset.defaultMode || 'driver', // 'self' | 'driver'
    rate: FALLBACK_RATE,
    rateNote: `Орієнтовний курс: ${FALLBACK_RATE} ₴ за 1$`,
  };

  const formatUah = (usd) => `${Math.round(usd * state.rate).toLocaleString('uk-UA')} ₴`;

  /* ---------- Елементи ---------- */
  const noteEl = form.querySelector('[data-booking-note]');
  const rentLabelEl = form.querySelector('[data-summary-rent-label]');
  const rentEl = form.querySelector('[data-summary-rent]');
  const insuranceLabelEl = form.querySelector('[data-summary-insurance-label]');
  const insuranceEl = form.querySelector('[data-summary-insurance]');
  const driverRow = form.querySelector('[data-summary-driver-row]');
  const driverLabelEl = form.querySelector('[data-summary-driver-label]');
  const driverEl = form.querySelector('[data-summary-driver]');
  const totalEl = form.querySelector('[data-summary-total]');
  const totalUahEl = form.querySelector('[data-summary-total-uah]');
  const rateNoteEl = form.querySelector('[data-rate-note]');
  const priceUahEl = form.querySelector('[data-price-uah]');
  const optionsEl = form.querySelector('[data-insurance-options]');
  const termsEl = form.querySelector('[data-insurance-terms]');
  const licenseBlock = form.querySelector('[data-license-block]');
  const submitBtn = form.querySelector('[type="submit"]');

  /* =========================================================
     Календар
     ========================================================= */
  const pickers = [];

  function createPicker(root) {
    const key = root.dataset.datepicker; // "pickup" | "return"
    const field = root.querySelector('[data-datepicker-field]');
    const valueEl = root.querySelector('[data-datepicker-value]');
    const input = root.querySelector('input[type="hidden"]');
    const popover = root.querySelector('[data-datepicker-popover]');
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
        <div class="mb-2.5 flex items-center justify-between">
          <button type="button" class="${NAV_BTN}" data-step="-1" aria-label="Попередній місяць" ${canGoBack ? '' : 'disabled'}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <span class="font-head text-base font-extrabold" aria-live="polite">${MONTHS[month]} ${year}</span>
          <button type="button" class="${NAV_BTN}" data-step="1" aria-label="Наступний місяць">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
          </button>
        </div>
        <div class="grid grid-cols-7">${WEEKDAYS.map((d) => `<span class="py-1 text-center text-xs font-semibold text-gray-500">${d}</span>`).join('')}</div>
        <div class="grid grid-cols-7 gap-y-0.5">`;

      for (let i = 0; i < offset; i += 1) html += '<span></span>';

      for (let day = 1; day <= daysInMonth; day += 1) {
        const date = new Date(year, month, day);
        const isSelected = isSameDay(date, state.pickup) || isSameDay(date, state.return);
        const inRange = date > state.pickup && date < state.return;
        const isToday = isSameDay(date, today);

        // Класи Tailwind для стану дня (не змішуємо конфліктні класи)
        let look = 'rounded-md hover:bg-gray-100';
        if (isSelected) look = 'rounded-md bg-navy text-white';
        else if (inRange) look = 'rounded-none bg-brand-blue-soft';
        if (isToday) look += isSelected ? ' font-extrabold' : ' font-extrabold text-royal';

        html += `<button type="button" class="${DAY_BTN} ${look}" data-day="${day}"
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
      const current = popover.querySelector('[data-day][aria-pressed="true"]:not([disabled])');
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
        p.root.querySelector('[data-datepicker-field]').focus();
      }
    });
  });

  /* =========================================================
     Підрахунок вартості
     ========================================================= */
  function franchiseText(plan) {
    if (plan.franchise === null) return 'уся сума збитків';
    if (plan.franchise === 0) return 'немає';
    return formatMoney(roundToTen(price * plan.franchise));
  }

  function update() {
    const days = diffDays(state.pickup, state.return);
    const word = pluralDays(days);
    const plan = INSURANCE.find((item) => item.id === state.insurance);
    const insuranceDay = Math.round((price * plan.percent) / 100);
    const driverDay = state.mode === 'driver' ? DRIVER_PRICE : 0;
    const total = (price + insuranceDay + driverDay) * days;
    const deposit = roundToTen(price * plan.deposit);

    pickers.forEach((p) => p.sync());

    noteEl.textContent = `${days} ${word} · повернення в той самий час`;
    rentLabelEl.textContent = `Оренда · ${price}$ × ${days} ${word}`;
    rentEl.textContent = formatMoney(price * days);

    insuranceLabelEl.textContent = insuranceDay
      ? `${plan.name} · ${insuranceDay}$ × ${days} ${word}`
      : plan.name;
    insuranceEl.textContent = formatMoney(insuranceDay * days);

    driverRow.hidden = !driverDay;
    driverLabelEl.textContent = `Водій · ${driverDay}$ × ${days} ${word}`;
    driverEl.textContent = formatMoney(driverDay * days);

    termsEl.textContent = `${plan.covers} Франшиза: ${franchiseText(plan)}. Застава: ${formatMoney(deposit)} (повертається).`;

    totalEl.textContent = formatMoney(total);
    totalUahEl.textContent = `≈ ${formatUah(total)}`;
    priceUahEl.textContent = `≈ ${formatUah(price)}`;
    rateNoteEl.textContent = state.rateNote;

    licenseBlock.hidden = state.mode !== 'self';
  }

  /* Варіанти страхування малюються з масиву INSURANCE.
     План із featured: true виглядає як преміальний: темний із золотою рамкою. */
  const TILE_REGULAR = {
    tile: 'border-gray-200 hover:border-gray-400 has-[:checked]:border-navy has-[:checked]:bg-gray-100',
    radio: 'accent-navy',
    price: 'text-gray-500',
  };
  const TILE_PREMIUM = {
    tile: 'border-brand-orange/60 bg-gradient-to-br from-navy to-royal text-white hover:border-brand-orange hover:shadow-lg has-[:checked]:border-brand-orange has-[:checked]:ring-2 has-[:checked]:ring-brand-orange',
    radio: 'accent-brand-orange',
    price: 'text-brand-orange',
  };

  function renderInsurance() {
    optionsEl.innerHTML = INSURANCE.map((plan) => {
      const perDay = Math.round((price * plan.percent) / 100);
      const look = plan.featured ? TILE_PREMIUM : TILE_REGULAR;
      return `
        <label class="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm transition duration-200 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-orange ${look.tile}">
          <input class="h-4 w-4 flex-none focus:outline-none ${look.radio}" type="radio" name="insurance" value="${plan.id}" ${plan.id === state.insurance ? 'checked' : ''}>
          <span class="min-w-0 leading-tight">
            <b class="block">${plan.featured ? '<span class="text-brand-orange" aria-hidden="true">★</span> ' : ''}${plan.name}</b>
            <small class="text-xs ${look.price}">${perDay ? `+${perDay}$/доба` : 'без доплати'}</small>
          </span>
        </label>`;
    }).join('');
  }

  renderInsurance();

  form.querySelector(`input[name="mode"][value="${state.mode}"]`).checked = true;

  form.addEventListener('change', (event) => {
    if (event.target.name === 'insurance') state.insurance = event.target.value;
    else if (event.target.name === 'mode') state.mode = event.target.value;
    else return;
    update();
  });

  update();

  fetch(RATE_URL)
    .then((response) => (response.ok ? response.json() : Promise.reject(response.status)))
    .then(([usd]) => {
      if (!usd || !(usd.rate > 0)) return;
      state.rate = usd.rate;
      state.rateNote = `Курс НБУ на ${usd.exchangedate}: ${usd.rate.toFixed(2).replace('.', ',')} ₴ за 1$`;
      update();
    })
    .catch(() => {
      // Немає зв'язку з НБУ: лишається запасний курс і підпис «Орієнтовний курс»
    });

  /* =========================================================
     Контакти клієнта
     ========================================================= */
  const REGEX_NAME = /^\p{L}+(?:[\s'’-]+\p{L}+)*$/u;
  const REGEX_PHONE = /^\+380\d{9}$/;

  const contactRules = {
    bookingName(value) {
      const name = value.trim().normalize('NFC');
      if (!name) return 'Вкажіть ваше ім’я.';
      if (Array.from(name).length < 2) return 'Ім’я має містити щонайменше 2 символи.';
      return REGEX_NAME.test(name) ? '' : 'Ім’я може містити лише літери, пробіл, апостроф і дефіс.';
    },
    bookingPhone(value) {
      const phone = value.trim();
      if (!phone) return 'Вкажіть номер, щоб менеджер міг вам зателефонувати.';
      return REGEX_PHONE.test(phone) ? '' : 'Формат: +380 та 9 цифр (наприклад, +380971234567).';
    },
  };

  const contactInputs = Object.keys(contactRules).map((id) => document.getElementById(id));

  function checkContact(input) {
    const message = contactRules[input.id](input.value);
    input.classList.toggle('border-red-500', Boolean(message));
    input.classList.toggle('bg-red-50', Boolean(message));
    input.classList.toggle('border-gray-300', !message);
    input.setAttribute('aria-invalid', String(Boolean(message)));
    document.getElementById(`${input.id}Error`).textContent = message;
    return !message;
  }

  contactInputs.forEach((input) => {
    input.addEventListener('blur', () => checkContact(input));
    input.addEventListener('input', () => {
      if (input.getAttribute('aria-invalid') === 'true') checkContact(input);
    });
  });

  /* =========================================================
     Відправка + модалка
     ========================================================= */
  const modal = document.querySelector('[data-modal]');
  let lastFocused = null;

  function openModal() {
    lastFocused = document.activeElement;
    modal.querySelector('[data-modal-phone]').textContent = form.elements.bookingPhone.value.trim();
    modal.hidden = false;
    document.documentElement.classList.add('overflow-hidden'); // блокуємо скрол сторінки
    requestAnimationFrame(() => modal.classList.add('is-visible'));
    modal.querySelector('[data-modal-focus]').focus();
  }

  function closeModal() {
    modal.classList.remove('is-visible');
    document.documentElement.classList.remove('overflow-hidden');
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

  // Посвідчення має бути чинним до дати повернення (дані записує js/license.js)
  function isLicenseValid() {
    const { licenseVerified, licenseExpiry } = form.dataset;
    return licenseVerified === 'true' && licenseExpiry >= toISO(state.return);
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (submitBtn.classList.contains('is-loading')) return;

    // Без контактів менеджеру нікуди телефонувати
    const invalidContact = contactInputs.filter((input) => !checkContact(input))[0];
    if (invalidContact) {
      invalidContact.focus();
      return;
    }

    // Self-drive: без перевіреного посвідчення бронювання не відправляємо
    if (state.mode === 'self' && !isLicenseValid()) {
      form.dispatchEvent(new CustomEvent('license:request'));
      return;
    }

    submitBtn.classList.add('is-loading');
    submitBtn.setAttribute('aria-busy', 'true');

    /*
      TODO (бекенд): тут буде реальний запит, наприклад:
      fetch('/api/bookings', { method: 'POST', body: new FormData(form) })
      У FormData вже є: pickup, return (YYYY-MM-DD), mode, insurance, car, bookingName, bookingPhone.
    */
    window.setTimeout(() => {
      submitBtn.classList.remove('is-loading');
      submitBtn.removeAttribute('aria-busy');
      openModal();
    }, FAKE_REQUEST_MS);
  });
})();
