/* =========================================================
   Поле телефону з кодом країни
   Використовується у формі зворотного зв'язку (js/validation.js)
   і в бронюванні на сторінках авто (js/booking.js).

   Розмітка:
     <div data-phone>                          ← рамка поля (стани помилки/успіху)
       <span data-phone-code></span>           ← видимий прапор і код: 🇺🇦 +380
       <select data-phone-country></select>    ← прозорий список країн поверх коду
       <input type="tel" data-phone-input>     ← лише номер без коду країни
     </div>

   - За замовчуванням Україна (+380), можна обрати іншу країну.
   - Номер групується пробілами під час введення: 97 123 45 67.
   - Літери й зайві символи не вводяться, нуль на початку (097…) прибирається.
   - Вставили номер повністю (+380 97…, 380…, 0048…) — код розпізнається сам.
   - Перевірка: точна кількість цифр для обраної країни.

   Для інших скриптів доступний один об'єкт window.PhoneInput:
     PhoneInput.validate(input)  → '' або текст помилки ('' і для порожнього — це перевіряє форма)
     PhoneInput.getNumber(input) → { e164: '+380971234567', display: '+380 97 123 45 67', digits, country }
   ========================================================= */

(function () {
  'use strict';

  // groups — як ділити номер пробілами; trunkZero — у країні номери пишуть з 0 попереду
  const COUNTRIES = [
    { iso: 'UA', name: 'Україна', code: '380', min: 9, max: 9, groups: [2, 3, 2, 2], example: '97 123 45 67', trunkZero: true },
    { iso: 'PL', name: 'Польща', code: '48', min: 9, max: 9, groups: [3, 3, 3], example: '512 345 678' },
    { iso: 'DE', name: 'Німеччина', code: '49', min: 10, max: 11, groups: [3, 4, 4], example: '151 2345 6789', trunkZero: true },
    { iso: 'CZ', name: 'Чехія', code: '420', min: 9, max: 9, groups: [3, 3, 3], example: '601 123 456' },
    { iso: 'SK', name: 'Словаччина', code: '421', min: 9, max: 9, groups: [3, 3, 3], example: '912 123 456', trunkZero: true },
    { iso: 'HU', name: 'Угорщина', code: '36', min: 9, max: 9, groups: [2, 3, 4], example: '20 123 4567' },
    { iso: 'RO', name: 'Румунія', code: '40', min: 9, max: 9, groups: [3, 3, 3], example: '712 345 678', trunkZero: true },
    { iso: 'MD', name: 'Молдова', code: '373', min: 8, max: 8, groups: [2, 3, 3], example: '62 123 456', trunkZero: true },
    { iso: 'LT', name: 'Литва', code: '370', min: 8, max: 8, groups: [3, 5], example: '612 34567' },
    { iso: 'LV', name: 'Латвія', code: '371', min: 8, max: 8, groups: [2, 3, 3], example: '21 234 567' },
    { iso: 'EE', name: 'Естонія', code: '372', min: 7, max: 8, groups: [4, 4], example: '5123 4567' },
    { iso: 'GB', name: 'Велика Британія', code: '44', min: 10, max: 10, groups: [4, 6], example: '7400 123456', trunkZero: true },
    { iso: 'FR', name: 'Франція', code: '33', min: 9, max: 9, groups: [1, 2, 2, 2, 2], example: '6 12 34 56 78', trunkZero: true },
    { iso: 'IT', name: 'Італія', code: '39', min: 9, max: 10, groups: [3, 3, 4], example: '312 345 6789' },
    { iso: 'ES', name: 'Іспанія', code: '34', min: 9, max: 9, groups: [3, 2, 2, 2], example: '612 34 56 78' },
    { iso: 'US', name: 'США / Канада', code: '1', min: 10, max: 10, groups: [3, 3, 4], example: '201 555 0123' },
  ];
  const DEFAULT_ISO = 'UA';
  const byIso = new Map(COUNTRIES.map((c) => [c.iso, c]));
  // Для розпізнавання вставленого номера: довші коди перевіряємо першими (+380 раніше за +38…)
  const byCodeLength = [...COUNTRIES].sort((a, b) => b.code.length - a.code.length);

  const flag = (iso) => String.fromCodePoint(...[...iso].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65));
  const onlyDigits = (value) => value.replace(/\D/g, '');

  function formatDigits(digits, country) {
    const parts = [];
    let rest = digits;
    country.groups.forEach((size, i) => {
      if (!rest) return;
      const isLast = i === country.groups.length - 1;
      parts.push(isLast ? rest : rest.slice(0, size)); // хвіст довгого номера йде в останню групу
      rest = isLast ? '' : rest.slice(size);
    });
    return parts.join(' ');
  }

  /* Сирий текст поля → країна й цифри номера (без коду) */
  function parse(raw, country) {
    const value = raw.trim();
    let digits = onlyDigits(value);
    let removed = 0; // скільки цифр зліва відкинули — для позиції курсора

    if (value.startsWith('+') || value.startsWith('00')) {
      if (value.startsWith('00')) { digits = digits.slice(2); removed += 2; }
      const match = byCodeLength.find((c) => digits.startsWith(c.code));
      if (!match) {
        // Користувач ще набирає код країни: «+», «+3», «+38» — лишаємо як є
        return { country, digits: '', removed, pending: `+${digits.slice(0, 4)}` };
      }
      country = match;
      digits = digits.slice(match.code.length);
      removed += match.code.length;
    } else if (digits.length > country.max && digits.startsWith(country.code)) {
      digits = digits.slice(country.code.length); // 380971234567 без «+»
      removed += country.code.length;
    }
    if (country.trunkZero && digits.startsWith('0')) {
      digits = digits.slice(1); // 097 123 45 67 → 97 123 45 67
      removed += 1;
    }
    return { country, digits: digits.slice(0, country.max), removed };
  }

  const instances = new WeakMap(); // input → { country, select, codeLabel }

  function render(input, keepCaret) {
    const inst = instances.get(input);
    const raw = input.value;
    const caret = input.selectionStart ?? raw.length;
    const caretAtEnd = caret >= raw.length;
    const digitsBeforeCaret = onlyDigits(raw.slice(0, caret)).length;

    const { country, digits, removed, pending } = parse(raw, inst.country);
    if (country !== inst.country) setCountry(input, country, false);

    const formatted = pending || formatDigits(digits, country);
    if (formatted === raw) return;
    input.value = formatted;

    if (!keepCaret || document.activeElement !== input) return;
    let pos = formatted.length;
    if (!caretAtEnd) {
      // Курсор стоїть після тієї самої кількості цифр, що й до форматування
      let need = Math.max(0, digitsBeforeCaret - removed);
      pos = 0;
      while (need > 0 && pos < formatted.length) {
        if (/\d/.test(formatted[pos])) need -= 1;
        pos += 1;
      }
    }
    input.setSelectionRange(pos, pos);
  }

  function setCountry(input, country, reformat = true) {
    const inst = instances.get(input);
    inst.country = country;
    inst.select.value = country.iso;
    inst.codeLabel.textContent = `${flag(country.iso)} +${country.code}`;
    input.placeholder = country.example;
    if (reformat) {
      const digits = onlyDigits(input.value).slice(0, country.max);
      input.value = formatDigits(digits, country);
    }
  }

  function enhance(input) {
    const box = input.closest('[data-phone]');
    const select = box && box.querySelector('[data-phone-country]');
    const codeLabel = box && box.querySelector('[data-phone-code]');
    if (!select || !codeLabel) return;

    select.replaceChildren(...COUNTRIES.map((c) => {
      const option = document.createElement('option');
      option.value = c.iso;
      option.textContent = `${flag(c.iso)} ${c.name} +${c.code}`;
      return option;
    }));

    instances.set(input, { country: byIso.get(DEFAULT_ISO), select, codeLabel });
    const startCountry = byIso.get(input.dataset.phoneDefault) || byIso.get(DEFAULT_ISO);
    setCountry(input, startCountry);
    if (input.value) render(input, false);

    // Форматування стоїть першим, тому валідатори форм отримують уже чисте значення
    input.addEventListener('input', () => render(input, true));

    // Backspace одразу після пробілу стирає цифру, а не пробіл, який повернеться при форматуванні
    input.addEventListener('keydown', (event) => {
      const pos = input.selectionStart;
      if (event.key === 'Backspace' && pos === input.selectionEnd && pos > 0 && input.value[pos - 1] === ' ') {
        input.setSelectionRange(pos - 1, pos - 1);
      }
    });

    // Після form.reset() повертаємо країну за замовчуванням
    if (input.form) {
      input.form.addEventListener('reset', () => setTimeout(() => setCountry(input, startCountry)));
    }

    select.addEventListener('change', () => {
      setCountry(input, byIso.get(select.value) || byIso.get(DEFAULT_ISO));
      // Форма перевіряє номер заново, бо змінилась потрібна довжина
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.focus();
    });
  }

  function getNumber(input) {
    const inst = instances.get(input);
    const country = inst ? inst.country : byIso.get(DEFAULT_ISO);
    const digits = input.value.trim().startsWith('+') ? '' : onlyDigits(input.value); // «+38» — код ще не набрано
    return {
      country,
      digits,
      e164: `+${country.code}${digits}`,
      display: `+${country.code} ${formatDigits(digits, country)}`,
    };
  }

  function validate(input) {
    const { country, digits, e164 } = getNumber(input);
    if (!digits) return '';
    const length = country.min === country.max ? `${country.min}` : `від ${country.min} до ${country.max}`;
    const rule = new RegExp(`^\\+${country.code}\\d{${country.min},${country.max}}$`);
    if (!rule.test(e164)) {
      return `Номер для коду +${country.code} має містити ${length} цифр (наприклад, ${country.example}).`;
    }
    return '';
  }

  document.querySelectorAll('[data-phone-input]').forEach(enhance);

  window.PhoneInput = Object.freeze({ validate, getNumber });
})();
