/* =========================================================
   ЛР №11. Інтерактивний віджет «Калькулятор оренди»
   Розмітка: секція [data-rent-calc] в index.html
   Дані:     список авто й тарифи завантажуються з data/data.json (fetch)

   Формула:
     оренда        = ціна за добу × кількість діб
     знижка        = 10 % від оренди, якщо діб ≥ 7
     водій         = 50 $ × кількість діб (якщо обрано)
     пробіг понад  = max(0, пробіг − 200 км × діб) × 0,5 $
     декор         = 40 $ разово (якщо обрано)
     промокод      = % від суми вище
     разом         = округлення до цілого долара, не менше 0

   Захист (Defensive Programming):
     1. HTML5: min / max / step / maxlength / required у полях;
     2. JS: перевірка кожного значення перед розрахунком —
        порожнє поле, не число, NaN, Infinity, 0, від’ємне, дробове,
        завелике, невідоме авто, невідомий промокод;
     3. Виведення лише через textContent — текст користувача
        ніколи не потрапляє в innerHTML.
   Код ізольовано в IIFE: жодних глобальних змінних, елементи
   шукаються всередині свого [data-rent-calc], тож на сторінці
   може бути кілька незалежних калькуляторів.
   ========================================================= */

(() => {
  'use strict';

  // Класи Tailwind для стану поля: звичайне / з помилкою
  const NORMAL_CLASSES = ['border-gray-300', 'focus-visible:ring-royal'];
  const ERROR_CLASSES = ['border-red-500', 'bg-red-50', 'focus-visible:ring-red-500'];
  const PROMO_PATTERN = /^[A-Z0-9]{1,20}$/;

  /* ---------- Утиліти ---------- */
  const formatNumber = (n) => n.toLocaleString('uk-UA', { maximumFractionDigits: 2 });
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
  const isNumber = (n) => typeof n === 'number' && Number.isFinite(n);
  const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

  // 1 доба · 2 доби · 5 діб · 21 доба
  function pluralDays(n) {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return 'доба';
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'доби';
    return 'діб';
  }

  /* ---------- Перевірка data.json ----------
     Дані теж «вхідні»: файл можуть зіпсувати вручну.
     Авто з неправильною ціною відкидаються, без тарифів віджет не стартує. */
  function normalizeData(data) {
    if (!data || !Array.isArray(data.cars) || typeof data.rules !== 'object' || data.rules === null) {
      throw new Error('data.json: немає масиву cars або об’єкта rules');
    }
    const cars = data.cars.filter((car) => car
      && typeof car.id === 'string' && car.id
      && typeof car.name === 'string' && car.name
      && isNumber(car.pricePerDay) && car.pricePerDay > 0);
    if (cars.length === 0) throw new Error('data.json: немає жодного коректного авто');

    const r = data.rules;
    const numbers = [r.days?.min, r.days?.max, r.distance?.min, r.distance?.max, r.distance?.step,
      r.kmIncludedPerDay, r.extraKmPrice, r.driverPerDay, r.decorPrice,
      r.longRent?.fromDays, r.longRent?.percent];
    if (!numbers.every((n) => isNumber(n) && n >= 0) || r.days.min < 1 || r.days.min > r.days.max) {
      throw new Error('data.json: некоректні тарифи в rules');
    }

    // Промокоди: лише латиниця/цифри і знижка від 1 до 50 %
    const promoCodes = {};
    Object.entries(r.promoCodes || {}).forEach(([code, percent]) => {
      if (PROMO_PATTERN.test(code) && isNumber(percent) && percent > 0 && percent <= 50) {
        promoCodes[code] = percent;
      }
    });

    return { currency: typeof data.currency === 'string' ? data.currency : '$', cars, rules: { ...r, promoCodes } };
  }

  /* ---------- Розрахунок ----------
     Чиста функція: отримує вже перевірені числа, нічого не знає про DOM. */
  function calculate(input, rules) {
    const rent = input.price * input.days;
    const longDiscount = input.days >= rules.longRent.fromDays ? rent * rules.longRent.percent / 100 : 0;
    const driver = input.driver ? rules.driverPerDay * input.days : 0;
    const includedKm = rules.kmIncludedPerDay * input.days;
    const extraKm = Math.max(0, input.distance - includedKm); // пробіг у межах норми не зменшує ціну
    const extraKmCost = extraKm * rules.extraKmPrice;
    const decor = input.decor ? rules.decorPrice : 0;
    const subtotal = rent - longDiscount + driver + extraKmCost + decor;
    const promoDiscount = subtotal * input.promoPercent / 100;
    const total = Math.max(0, Math.round(subtotal - promoDiscount));
    return { rent, longDiscount, driver, includedKm, extraKm, extraKmCost, decor, promoDiscount, total };
  }

  /* ---------- Один екземпляр віджета ---------- */
  function initCalculator(root) {
    const pick = (name) => root.querySelector(`[data-rc="${name}"]`);
    const el = {
      form: pick('form'), fields: pick('fields'),
      status: pick('status'), statusText: pick('status-text'), retry: pick('retry'),
      car: pick('car'), carError: pick('car-error'),
      days: pick('days'), daysHint: pick('days-hint'), daysError: pick('days-error'),
      distance: pick('distance'), distanceValue: pick('distance-value'), distanceHint: pick('distance-hint'),
      driver: pick('driver'), driverPrice: pick('driver-price'),
      decor: pick('decor'), decorPrice: pick('decor-price'),
      promo: pick('promo'), promoMsg: pick('promo-msg'),
      photo: pick('photo'), carName: pick('car-name'), carMeta: pick('car-meta'),
      lines: pick('lines'), total: pick('total'), totalNote: pick('total-note'), book: pick('book'),
    };

    // Відсутній DOM-елемент: попереджаємо розробника і не запускаємо віджет, сторінка працює далі
    const missing = Object.keys(el).filter((key) => !el[key]);
    if (missing.length) {
      console.warn(`[Калькулятор оренди] не запущено: у розмітці немає data-rc="${missing.join('", "')}"`);
      return;
    }

    let data = null;
    let carsById = new Map();
    let frame = 0;

    /* ----- Стан поля: помилка або норма ----- */
    function setFieldError(field, messageEl, message) {
      const hasError = Boolean(message);
      field.classList.remove(...(hasError ? NORMAL_CLASSES : ERROR_CLASSES));
      field.classList.add(...(hasError ? ERROR_CLASSES : NORMAL_CLASSES));
      field.setAttribute('aria-invalid', String(hasError));
      messageEl.textContent = message;
    }

    /* ----- Читання й перевірка полів ----- */
    function readCar() {
      const car = carsById.get(el.car.value);
      return car ? { car, error: '' } : { car: null, error: 'Оберіть авто зі списку.' };
    }

    function readDays() {
      const { min, max } = data.rules.days;
      const rangeError = `Введіть кількість діб від ${min} до ${max}.`;
      // badInput: у полі number набрано щось, що браузер не зміг прочитати як число (наприклад, «e» або «--5»)
      if (el.days.validity.badInput) return { error: `Потрібне число. ${rangeError}` };
      const raw = el.days.value.trim();
      if (raw === '') return { error: rangeError };
      const value = Number(raw);
      if (!Number.isFinite(value)) return { error: rangeError };
      // Оренда рахується повними добами: 2,5 → 3. Перевірка меж — уже після округлення
      const days = Math.ceil(value);
      if (days < min || days > max) return { error: rangeError };
      const note = days !== value ? `Оренда рахується повними добами: ${formatNumber(value)} → ${days} ${pluralDays(days)}.` : '';
      return { days, note, error: '' };
    }

    function readDistance() {
      const { min, max, step } = data.rules.distance;
      const value = Number(el.distance.value);
      // range сам тримає межі, але значення могли змінити скриптом або в DevTools
      if (!Number.isFinite(value)) return min;
      return clamp(Math.round(value / step) * step, min, max);
    }

    function readPromo() {
      const raw = el.promo.value.trim();
      if (raw === '') return { percent: 0, message: '', isError: false };
      const code = raw.toUpperCase();
      if (!PROMO_PATTERN.test(code)) {
        return { percent: 0, message: 'Промокод складається лише з латинських літер і цифр.', isError: true };
      }
      if (!hasOwn(data.rules.promoCodes, code)) {
        // textContent: навіть якщо ввели HTML, він покажеться як звичайний текст
        return { percent: 0, message: `Промокод «${code}» не знайдено. Розрахунок — без знижки.`, isError: true };
      }
      const percent = data.rules.promoCodes[code];
      return { percent, message: `Промокод ${code}: знижка ${percent} %.`, isError: false };
    }

    /* ----- Виведення ----- */
    function renderCar(car) {
      if (!car) return;
      el.photo.src = car.image || '';
      el.photo.alt = car.name;
      el.carName.textContent = car.name;
      el.carMeta.textContent = `${car.category || 'Ретро-авто'} · ${formatNumber(car.pricePerDay)} ${data.currency} / доба`;
      el.book.href = car.page || 'pages/cars.html';
      el.book.setAttribute('aria-label', `Забронювати ${car.name}`);
    }

    function renderLines(rows) {
      const items = rows.map(([label, amount, accent]) => {
        const li = document.createElement('li');
        li.className = 'flex justify-between gap-4';
        const name = document.createElement('span');
        name.className = 'text-muted';
        name.textContent = label;
        const sum = document.createElement('span');
        sum.className = `flex-none font-semibold${accent ? ' text-brand-orange' : ''}`;
        sum.textContent = amount;
        li.append(name, sum);
        return li;
      });
      el.lines.replaceChildren(...items);
    }

    function showNoTotal(note) {
      el.lines.replaceChildren();
      el.total.textContent = '—';
      el.totalNote.textContent = note;
      el.book.hidden = true;
    }

    /* ----- Головний цикл: прочитати → перевірити → порахувати → показати ----- */
    function update() {
      frame = 0;
      if (!data) return;
      const cur = data.currency;
      const money = (n) => `${formatNumber(Math.round(n * 100) / 100)} ${cur}`;

      const car = readCar();
      setFieldError(el.car, el.carError, car.error);
      renderCar(car.car);

      const days = readDays();
      setFieldError(el.days, el.daysError, days.error);
      el.daysHint.textContent = days.note || `Від ${data.rules.days.min} до ${data.rules.days.max} діб. `
        + `Від ${data.rules.longRent.fromDays} діб — знижка ${data.rules.longRent.percent} %.`;

      const distance = readDistance();
      el.distanceValue.textContent = `${formatNumber(distance)} км`;

      const promo = readPromo();
      el.promo.setAttribute('aria-invalid', String(promo.isError));
      el.promo.classList.remove(...(promo.isError ? NORMAL_CLASSES : ERROR_CLASSES));
      el.promo.classList.add(...(promo.isError ? ERROR_CLASSES : NORMAL_CLASSES));
      el.promoMsg.textContent = promo.message;
      el.promoMsg.classList.toggle('text-red-700', promo.isError);
      el.promoMsg.classList.toggle('text-green-700', !promo.isError);

      if (car.error || days.error) {
        // Замість NaN — конкретна підказка, що виправити: «Введіть кількість діб від 1 до 30 — і тут з’явиться вартість.»
        const reason = (car.error || days.error).replace(/\.$/, '');
        showNoTotal(`${reason} — і тут з’явиться вартість.`);
        return;
      }

      const r = calculate({
        price: car.car.pricePerDay,
        days: days.days,
        distance,
        driver: el.driver.checked,
        decor: el.decor.checked,
        promoPercent: promo.percent,
      }, data.rules);

      // Остання лінія захисту: на екран ніколи не потрапляє NaN, Infinity чи від’ємна сума
      if (!isNumber(r.total) || r.total < 0) {
        console.error('[Калькулятор оренди] некоректний результат', r);
        showNoTotal('Не вдалося порахувати. Перевірте значення полів.');
        return;
      }

      const rows = [[`Оренда: ${days.days} ${pluralDays(days.days)} × ${formatNumber(car.car.pricePerDay)} ${cur}`, money(r.rent)]];
      if (r.longDiscount > 0) rows.push([`Знижка за ${data.rules.longRent.fromDays}+ діб (−${data.rules.longRent.percent} %)`, `−${money(r.longDiscount)}`, true]);
      if (r.driver > 0) rows.push(['Водій', money(r.driver)]);
      rows.push([`Пробіг: ${formatNumber(r.includedKm)} км включено`, r.extraKm > 0 ? `+${formatNumber(r.extraKm)} км · ${money(r.extraKmCost)}` : '0 ' + cur]);
      if (r.decor > 0) rows.push(['Весільний декор', money(r.decor)]);
      if (r.promoDiscount > 0) rows.push([`Промокод (−${promo.percent} %)`, `−${money(r.promoDiscount)}`, true]);
      renderLines(rows);

      el.total.textContent = `${formatNumber(r.total)} ${cur}`;
      el.totalNote.textContent = 'Орієнтовна вартість. Остаточну підтвердить менеджер.';
      el.book.hidden = false;
    }

    // Швидке введення: перерахунок не частіше одного разу за кадр
    function scheduleUpdate() {
      if (!frame) frame = requestAnimationFrame(update);
    }

    /* ----- Завантаження data.json ----- */
    function setStatus(text, isError) {
      el.status.hidden = !text;
      el.statusText.textContent = text;
      el.status.classList.toggle('border-red-500', isError);
      el.status.classList.toggle('text-red-700', isError);
      el.retry.hidden = !isError;
    }

    function fillForm() {
      const { rules, cars, currency } = data;
      const previous = el.car.value;
      el.car.replaceChildren(...cars.map((car) => {
        const option = document.createElement('option');
        option.value = car.id;
        option.textContent = `${car.name} — ${formatNumber(car.pricePerDay)} ${currency}`;
        return option;
      }));
      if (carsById.has(previous)) el.car.value = previous;

      // Межі полів беремо з тих самих тарифів, що й розрахунок
      el.days.min = rules.days.min;
      el.days.max = rules.days.max;
      el.distance.min = rules.distance.min;
      el.distance.max = rules.distance.max;
      el.distance.step = rules.distance.step;
      el.distanceHint.textContent = `${formatNumber(rules.kmIncludedPerDay)} км на добу включено, `
        + `далі ${formatNumber(rules.extraKmPrice)} ${currency}/км.`;
      el.driverPrice.textContent = `+${formatNumber(rules.driverPerDay)} ${currency} за добу`;
      el.decorPrice.textContent = `+${formatNumber(rules.decorPrice)} ${currency} разово`;
    }

    async function load() {
      const url = root.dataset.src || 'data/data.json';
      setStatus('Завантажуємо автопарк…', false);
      el.fields.disabled = true;
      showNoTotal('');
      try {
        const response = await fetch(url, { cache: 'no-cache' });
        if (!response.ok) throw new Error(`HTTP ${response.status} для ${url}`);
        data = normalizeData(await response.json());
        carsById = new Map(data.cars.map((car) => [car.id, car]));
        fillForm();
        el.fields.disabled = false;
        setStatus('', false);
        update();
      } catch (error) {
        data = null;
        console.error('[Калькулятор оренди] не вдалося завантажити дані:', error);
        setStatus('Не вдалося завантажити список авто. Перевірте з’єднання й спробуйте ще раз.', true);
      }
    }

    /* ----- Події ----- */
    // input — під час введення і руху повзунка, change — select і checkbox
    el.form.addEventListener('input', scheduleUpdate);
    el.form.addEventListener('change', scheduleUpdate);
    // Enter у полі не перезавантажує сторінку
    el.form.addEventListener('submit', (event) => event.preventDefault());
    el.retry.addEventListener('click', load);
    // Фото не знайдено — сірий блок замість «битої» картинки
    el.photo.addEventListener('error', () => { el.photo.style.visibility = 'hidden'; });
    el.photo.addEventListener('load', () => { el.photo.style.visibility = ''; });

    load();
  }

  document.querySelectorAll('[data-rent-calc]').forEach(initCalculator);
})();
