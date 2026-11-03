# RetroRent — фронтенд

Сайт оренди ретро-автомобілів: HTML + **Tailwind CSS (CDN)** + трохи власного CSS і чистого JavaScript. Без збірки й npm.

## Як запустити

Відкрити `index.html` у браузері (подвійний клік) або через VS Code → **Live Server**.
Потрібен інтернет: Tailwind і шрифти підтягуються з CDN.

## Структура

```
RetroRent/
├── index.html                    # Головна
├── pages/
│   ├── cars.html                 # Каталог «Наш автопарк» + фільтр
│   ├── about.html                # Про нас
│   └── cars/                     # Сторінки конкретних авто (6 шт.)
├── css/
│   └── style.css                 # Власні стилі — лише те, що незручно робити класами Tailwind
├── js/
│   ├── tailwind.config.js        # Тема Tailwind: кольори, шрифти, тіні з дизайн-системи
│   ├── main.js                   # Мобільне меню, стан кнопок, плейсхолдери фото
│   ├── catalog-filter.js         # Фільтр каталогу (pages/cars.html)
│   └── booking.js                # Календар, підрахунок ціни, модалка (сторінки авто)
└── assets/
    ├── icons/                    # Логотипи та іконки (SVG)
    └── images/                   # Фото: home/, about/, cars/
```

## Як підключено Tailwind

У `<head>` кожної сторінки:

```html
<script src="https://cdn.tailwindcss.com"></script>   <!-- Tailwind -->
<script src="js/tailwind.config.js"></script>          <!-- тема проєкту -->
<link rel="stylesheet" href="css/style.css">           <!-- власні стилі -->
```

Після цього в HTML доступні кольори бренду як звичайні класи Tailwind: `bg-navy`, `text-royal`, `bg-cream`, `text-brand-green`, `font-head`, `shadow-card` тощо.

> У консолі браузера буде попередження *«cdn.tailwindcss.com should not be used in production»* — це нормально для навчального проєкту. У реальному продакшені Tailwind збирають через CLI/Vite.

## Головна сторінка — лендинг

Порядок секцій `index.html` (якір у дужках):

Header → Hero → Переваги (`#benefits`) → Послуги (`#services`) → Обери своє ретро (`#cars`) → Як це працює (`#how`) → Відео (`#video`) → Часті запитання (`#faq`) → Заклик до дії → Контакти й карта (`#contacts`) → Footer

- **Відео YouTube:** в `index.html` знайдіть `VIDEO_ID` і замініть на ID свого відео (YouTube → «Поділитися» → «Вбудувати», частина адреси після `/embed/`).
- **Карта:** адреса задана в `src` iframe карти (`q=Rynok+Square,+Lviv`) і в посиланні «Прокласти маршрут».
- Розміри, радіус і тінь відео та карти — змінні `--embed-*` у `:root` файлу `css/style.css`.
- Часті запитання розгортаються без JavaScript (`<details>` / `<summary>`).

## Адаптивність (mobile first)

Класи без префікса — для телефона, `sm:` (≥640px), `md:` (≥768px), `lg:` (≥1024px), `xl:` (≥1280px) — для ширших екранів.

| Елемент | Mobile | Tablet | Desktop |
|---|---|---|---|
| Меню | кнопка «Меню» (`md:hidden`) | пункти в рядок (`hidden md:flex`) | те саме |
| Сітка карток | `grid-cols-1` | `sm:grid-cols-2` | `lg:grid-cols-3` |
| Footer | 1 колонка | `md:grid-cols-2` | `lg:grid-cols-4` |
| Сторінка авто | фото → бронювання → опис | те саме | `lg:grid-cols-5`: фото й опис зліва, бронювання справа |

## Кнопки (референс Figma)

Усі стани зроблені варіантами Tailwind: `hover:bg-royal`, `active:bg-ink active:scale-98`, `focus-visible:ring-3 focus-visible:ring-brand-orange`, `disabled:bg-disabled`.
Два стани вмикає JavaScript (вони в `css/style.css`): `.is-pressed` — помаранчева рамка після кліку, `.is-loading` — спінер.
Кнопки на картках: `group` + `group-hover:` міняють «ОБРАТИ АВТО» на «ПЕРЕЙТИ».

## Кнопка «Бронювати» — куди скролить

| Сторінка | `href` | Що відбувається |
|---|---|---|
| Головна | `#cars` | скрол до «Обери своє ретро» |
| Каталог | `#fleet` | скрол до сітки авто |
| Про нас | `cars.html` | перехід у каталог |
| Сторінка авто | `#booking` | скрол до форми бронювання |

## Як додати нове авто
1. Скопіювати будь-який файл з `pages/cars/`, перейменувати.
2. Замінити назву, тег, `data-price`, `data-car`, характеристики й опис.
3. Додати картку в `pages/cars.html` (скопіювати сусідню `<article>`, змінити посилання, `data-category`, текст).
4. Покласти фото в `assets/images/cars/` і вказати шлях у `src`.
