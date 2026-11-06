/* =========================================================
   Перевірка водійського посвідчення для self-drive
   Вікно відкривається кнопкою «Перевірити посвідчення» або
   подією license:request, якщо бронювання натиснули без перевірки.

   Це лише попередня перевірка формату й умов оренди.
   Дані нікуди не надсилаються й не зберігаються: на формі
   бронювання лишається тільки позначка і дата закінчення дії.
   Оригінал посвідчення менеджер звіряє при видачі авто.
   ========================================================= */

(function () {
  'use strict';

  const booking = document.querySelector('[data-booking]');
  const modal = document.getElementById('licenseModal');
  if (!booking || !modal) return;

  /* ---------- Умови self-drive ---------- */
  const MIN_AGE = 21;
  const MIN_EXPERIENCE_YEARS = 2;

  // Українське посвідчення: 3 великі кириличні літери й 6 цифр
  const REGEX_LICENSE = /^[А-ЩЬЮЯҐЄІЇ]{3}\d{6}$/;
  const REGEX_NAME = /^\p{L}+(?:[\s'’-]+\p{L}+)+$/u; // щонайменше два слова

  const form = document.getElementById('licenseForm');
  const closeBtn = document.getElementById('licenseClose');
  const openBtn = booking.querySelector('[data-license-open]');
  const statusEl = booking.querySelector('[data-license-status]');

  /* ---------- Дати ---------- */
  const toISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  function yearsAgoISO(years) {
    const date = new Date();
    date.setFullYear(date.getFullYear() - years);
    return toISO(date);
  }

  const todayISO = () => toISO(new Date());
  const returnISO = () => booking.elements.return.value;

  /* ---------- Правила полів: текст помилки або порожній рядок ---------- */
  const rules = {
    licenseName(value) {
      if (!value.trim()) return 'Вкажіть прізвище та ім’я.';
      return REGEX_NAME.test(value.trim().normalize('NFC')) ? '' : 'Вкажіть прізвище та ім’я, як у посвідченні.';
    },
    licenseNumber(value) {
      if (!value.trim()) return 'Вкажіть серію та номер.';
      return REGEX_LICENSE.test(normalizeNumber(value)) ? '' : 'Формат: 3 літери кирилицею та 6 цифр, наприклад ВХА123456.';
    },
    birthDate(value) {
      if (!value) return 'Вкажіть дату народження.';
      return value <= yearsAgoISO(MIN_AGE) ? '' : `Self-drive доступний від ${MIN_AGE} року. Оберіть оренду з водієм.`;
    },
    issueDate(value) {
      if (!value) return 'Вкажіть дату видачі.';
      if (value > todayISO()) return 'Дата видачі не може бути в майбутньому.';
      return value <= yearsAgoISO(MIN_EXPERIENCE_YEARS) ? '' : `Потрібен стаж від ${MIN_EXPERIENCE_YEARS} років. Оберіть оренду з водієм.`;
    },
    expiryDate(value) {
      if (!value) return 'Вкажіть, до якої дати дійсне посвідчення.';
      return value >= returnISO() ? '' : 'Посвідчення має бути чинним до дати повернення авто.';
    },
    licenseCategory(_, input) {
      return input.checked ? '' : 'Для цих авто потрібна категорія B.';
    },
  };

  function normalizeNumber(value) {
    return value.replace(/\s/g, '').toUpperCase();
  }

  /* ---------- UI поля ---------- */
  function setFieldState(input, message) {
    const box = input.type === 'checkbox' ? input.closest('[data-field-box]') : input;
    box.classList.toggle('border-red-500', Boolean(message));
    box.classList.toggle('bg-red-50', Boolean(message));
    if (input.type !== 'checkbox') box.classList.toggle('border-gray-300', !message);
    document.getElementById(`${input.id}Error`).textContent = message;
    input.setAttribute('aria-invalid', String(Boolean(message)));
  }

  function checkInput(input) {
    const message = rules[input.id](input.value, input);
    setFieldState(input, message);
    return !message;
  }

  const inputs = Object.keys(rules).map((id) => document.getElementById(id));

  inputs.forEach((input) => {
    input.addEventListener(input.type === 'checkbox' ? 'change' : 'blur', () => checkInput(input));
    input.addEventListener('input', () => {
      if (input.getAttribute('aria-invalid') === 'true') checkInput(input);
    });
  });

  /* ---------- Статус на формі бронювання ---------- */
  function setStatus(verified) {
    statusEl.textContent = verified ? 'Посвідчення перевірено ✓' : 'Потрібна перевірка посвідчення';
    statusEl.classList.toggle('text-green-700', verified);
    statusEl.classList.toggle('font-semibold', verified);
    openBtn.textContent = verified ? 'Змінити' : 'Перевірити';
  }

  /* ---------- Вікно ---------- */
  let lastFocused = null;

  function openModal() {
    lastFocused = document.activeElement;
    modal.hidden = false;
    document.documentElement.classList.add('overflow-hidden');
    requestAnimationFrame(() => modal.classList.add('is-visible'));
    inputs[0].focus();
  }

  function closeModal() {
    if (modal.hidden) return;
    modal.classList.remove('is-visible');
    document.documentElement.classList.remove('overflow-hidden');
    window.setTimeout(() => { modal.hidden = true; }, 300);
    if (lastFocused) lastFocused.focus();
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const invalid = inputs.filter((input) => !checkInput(input));

    if (invalid.length) {
      invalid[0].focus();
      return;
    }

    booking.dataset.licenseVerified = 'true';
    booking.dataset.licenseExpiry = document.getElementById('expiryDate').value;
    setStatus(true);
    form.reset(); // особисті дані не лишаються у формі
    closeModal();
  });

  openBtn.addEventListener('click', openModal);
  closeBtn.addEventListener('click', closeModal);
  booking.addEventListener('license:request', () => {
    // Запит приходить, якщо перевірки не було або дати оренди змінились
    delete booking.dataset.licenseVerified;
    setStatus(false);
    openModal();
  });

  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeModal();
  });

  document.addEventListener('keydown', (event) => {
    if (modal.hidden) return;

    if (event.key === 'Escape') {
      closeModal();
      return;
    }

    if (event.key !== 'Tab') return;

    // Фокус ходить по колу всередині вікна
    const focusable = modal.querySelectorAll('input, button');
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  setStatus(false);
})();
