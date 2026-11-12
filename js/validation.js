/* =========================================================
   Форма зворотного зв'язку (index.html, секція #feedback)
   1. Регулярні вирази та правила
   2. Функції валідації (кожне поле окремо)
   3. Функції UI (normal / error / success)
   4. Динамічна перевірка: input, blur, change
   5. Обробка submit
   6. Модальне вікно

   Бекенду немає: дані нікуди не надсилаються. Після успішної
   перевірки форма лише показує демонстраційне модальне вікно.
   ========================================================= */

(function () {
  'use strict';

  const form = document.getElementById('feedbackForm');
  if (!form) return;

  /* ---------- 1. Регулярні вирази та правила ---------- */

  // Літери будь-якої абетки; слова можна розділяти пробілом, апострофом, дефісом
  const REGEX_NAME = /^\p{L}+(?:[\s'’-]+\p{L}+)*$/u;
  // Ім'я користувача @ домен . зона (мінімум 2 літери)
  const REGEX_EMAIL = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
  // Телефон: код країни обирається у списку, довжину номера для кожної країни перевіряє js/phone-input.js
  // (для України — рівно +380 і 9 цифр: /^\+380\d{9}$/)

  const MIN_NAME_LENGTH = 2;
  const MIN_MESSAGE_LENGTH = 10;
  const MAX_MESSAGE_LENGTH = 500;
  const FAKE_REQUEST_MS = 800; // імітація надсилання

  // Кількість символів (емоджі рахується як один символ)
  const countChars = (text) => Array.from(text).length;

  /* ---------- 2. Функції валідації ----------
     Кожна повертає текст помилки або порожній рядок, якщо все добре. */

  function validateName(value) {
    const name = value.trim().normalize('NFC');
    if (!name) return 'Вкажіть ваше ім’я.';
    if (countChars(name) < MIN_NAME_LENGTH) return `Ім’я має містити щонайменше ${MIN_NAME_LENGTH} символи.`;
    if (!REGEX_NAME.test(name)) return 'Ім’я може містити лише літери, пробіл, апостроф і дефіс.';
    return '';
  }

  function validateEmail(value) {
    const email = value.trim();
    if (!email) return 'Вкажіть електронну пошту.';
    if (!REGEX_EMAIL.test(email)) return 'Введіть дійсний email (наприклад: name@domain.com).';
    return '';
  }

  function validatePhone(input) {
    if (!window.PhoneInput) return input.value.trim() ? '' : 'Вкажіть номер телефону.';
    if (!window.PhoneInput.getNumber(input).digits) return 'Вкажіть номер телефону.';
    return window.PhoneInput.validate(input);
  }

  function validateMessage(value) {
    const length = countChars(value.trim());
    if (!length) return 'Напишіть ваше повідомлення.';
    if (length < MIN_MESSAGE_LENGTH) return `Повідомлення має містити не менше ${MIN_MESSAGE_LENGTH} символів.`;
    if (length > MAX_MESSAGE_LENGTH) return `Повідомлення має містити не більше ${MAX_MESSAGE_LENGTH} символів.`;
    return '';
  }

  function validateAgreement(checked) {
    return checked ? '' : 'Потрібно дати згоду для продовження.';
  }

  /* ---------- Опис полів ---------- */
  function createField(id, validate, options = {}) {
    const input = document.getElementById(id);
    return {
      input,
      validate,
      getValue: options.getValue || (() => input.value),
      box: options.box || input,           // елемент, який змінює рамку
      normal: options.normal || ['border-gray-300', 'hover:border-gray-400'],
      success: options.success || ['border-green-500'],
      error: document.getElementById(`${id}Error`),
      check: input.parentElement.querySelector('[data-check]'),
      touched: false,                      // користувач уже залишав це поле
    };
  }

  const agreementInput = document.getElementById('agreement');
  const phoneInput = document.getElementById('phone');

  const fields = [
    createField('username', validateName),
    createField('email', validateEmail),
    createField('phone', validatePhone, {
      getValue: () => phoneInput,
      box: phoneInput.closest('[data-phone]') || phoneInput, // рамка — у всього поля разом із кодом країни
    }),
    createField('message', validateMessage),
    createField('agreement', validateAgreement, {
      getValue: () => agreementInput.checked,
      box: agreementInput.closest('[data-field-box]'),
      normal: ['border-transparent'],
      success: ['border-transparent'],
    }),
  ];

  const counter = document.getElementById('messageCounter');
  const formStatus = document.getElementById('formStatus');
  const submitBtn = document.getElementById('feedbackSubmit');

  /* ---------- 3. Функції UI ---------- */
  const ERROR_CLASSES = ['border-red-500', 'bg-red-50'];

  function resetClasses(field) {
    field.box.classList.remove(...field.normal, ...field.success, ...ERROR_CLASSES);
  }

  function clearError(field) {
    resetClasses(field);
    field.box.classList.add(...field.normal);
    field.error.textContent = '';
    field.input.setAttribute('aria-invalid', 'false');
    if (field.check) field.check.classList.add('hidden');
  }

  function showError(field, message) {
    resetClasses(field);
    field.box.classList.add(...ERROR_CLASSES);
    field.error.textContent = message;
    field.input.setAttribute('aria-invalid', 'true');
    if (field.check) field.check.classList.add('hidden');
  }

  function showSuccess(field) {
    resetClasses(field);
    field.box.classList.add(...field.success);
    field.error.textContent = '';
    field.input.setAttribute('aria-invalid', 'false');
    if (field.check) field.check.classList.remove('hidden');
  }

  function updateCounter() {
    counter.textContent = `${countChars(form.elements.message.value)} / ${MAX_MESSAGE_LENGTH} символів`;
  }

  /* Перевірити поле й показати результат. Повертає true, якщо поле валідне. */
  function checkField(field) {
    const message = field.validate(field.getValue());
    if (message) showError(field, message);
    else showSuccess(field);
    return !message;
  }

  /* ---------- 4. Динамічна перевірка ---------- */
  let isSubmitting = false;

  fields.forEach((field) => {
    const isCheckbox = field.input.type === 'checkbox';

    // Під час введення: до першого виходу з поля помилки не показуємо,
    // лише відзначаємо успіх. Після виходу стан оновлюється на кожен символ.
    field.input.addEventListener('input', () => {
      formStatus.textContent = '';
      if (field.input.id === 'message') updateCounter();
      if (isCheckbox) return;

      if (field.touched) {
        checkField(field);
      } else if (!field.validate(field.getValue())) {
        showSuccess(field);
      } else {
        clearError(field);
      }
    });

    // Вихід з поля: фінальна перевірка
    field.input.addEventListener('blur', () => {
      if (isSubmitting || isCheckbox) return;
      field.touched = true;
      checkField(field);
    });

    if (isCheckbox) {
      field.input.addEventListener('change', () => {
        field.touched = true;
        checkField(field);
      });
    }
  });

  /* ---------- 5. Submit ---------- */
  function resetForm() {
    form.reset();
    fields.forEach((field) => {
      field.touched = false;
      clearError(field);
    });
    updateCounter();
    formStatus.textContent = '';
  }

  function pluralErrors(n) {
    if (n === 1) return '1 поле';
    return n < 5 ? `${n} поля` : `${n} полів`;
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (isSubmitting) return; // захист від повторного натискання

    const invalid = fields.filter((field) => {
      field.touched = true;
      return !checkField(field);
    });

    if (invalid.length) {
      formStatus.textContent = `Перевірте ${pluralErrors(invalid.length)} з помилками.`;
      invalid[0].input.focus();
      return;
    }

    isSubmitting = true;
    formStatus.textContent = '';
    submitBtn.classList.add('is-loading');
    submitBtn.setAttribute('aria-busy', 'true');

    const summary = {
      name: form.elements.username.value.trim(),
      email: form.elements.email.value.trim(),
      // +380 97 123 45 67; для сервера є PhoneInput.getNumber(phoneInput).e164
      phone: window.PhoneInput ? window.PhoneInput.getNumber(phoneInput).display : phoneInput.value.trim(),
    };

    /*
      Тут міг би бути реальний запит на сервер, наприклад:
      fetch('/api/feedback', { method: 'POST', body: new FormData(form) })
    */
    window.setTimeout(() => {
      submitBtn.classList.remove('is-loading');
      submitBtn.removeAttribute('aria-busy');
      openModal(summary);
      resetForm();
      isSubmitting = false;
    }, FAKE_REQUEST_MS);
  });

  /* ---------- 6. Модальне вікно ---------- */
  const modal = document.getElementById('feedbackModal');
  const modalClose = document.getElementById('feedbackModalClose');

  function openModal(summary) {
    // textContent, а не innerHTML: введений користувачем текст не виконається як код
    document.getElementById('summaryName').textContent = summary.name;
    document.getElementById('summaryEmail').textContent = summary.email;
    document.getElementById('summaryPhone').textContent = summary.phone;

    modal.hidden = false;
    document.documentElement.classList.add('overflow-hidden');
    requestAnimationFrame(() => modal.classList.add('is-visible'));
    modalClose.focus();
  }

  function closeModal() {
    if (modal.hidden) return;
    modal.classList.remove('is-visible');
    document.documentElement.classList.remove('overflow-hidden');
    window.setTimeout(() => { modal.hidden = true; }, 300);
    submitBtn.focus(); // фокус повертається туди, звідки відкрили вікно
  }

  modalClose.addEventListener('click', closeModal);

  // Клік по затемненому фону
  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeModal();
  });

  document.addEventListener('keydown', (event) => {
    if (modal.hidden) return;

    if (event.key === 'Escape') {
      closeModal();
    } else if (event.key === 'Tab') {
      // У вікні одна кнопка, тому фокус лишається на ній і не йде на сторінку
      event.preventDefault();
      modalClose.focus();
    }
  });
})();
