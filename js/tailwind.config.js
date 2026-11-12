/* =========================================================
   Тема Tailwind CSS для RetroRent
   Дизайн-система з ЛР №4, перенесена в налаштування Tailwind.
   Підключається одразу ПІСЛЯ CDN-скрипта Tailwind:
     <script src="https://cdn.tailwindcss.com"></script>
     <script src="js/tailwind.config.js"></script>

   Після цього в HTML доступні класи на кшталт:
     bg-navy, text-royal, bg-cream, text-brand-green,
     font-head, shadow-card, ring-3, h-header ...
   ========================================================= */

tailwind.config = {
  // Темна тема вмикається класом .dark на <html> (див. js/theme.js)
  darkMode: 'class',

  // hover: спрацьовує лише на пристроях з мишкою (на телефоні не «залипає»)
  future: { hoverOnlyWhenSupported: true },

  // Класи, яких немає в HTML — їх додає JS (календар і стани полів форми).
  // Генеруємо заздалегідь, щоб елементи не «блимали» без стилів.
  safelist: [
    'grid-cols-7', 'gap-y-0.5', 'aspect-square', 'text-[13px]',
    'rounded-none', 'bg-brand-blue-soft', 'text-royal', 'font-extrabold',
    'disabled:cursor-not-allowed', 'disabled:cursor-default', 'disabled:bg-transparent',
    'disabled:text-gray-300', 'disabled:opacity-30', 'disabled:hover:bg-transparent',
    'focus-visible:ring-2', 'focus-visible:ring-inset',
    // стани полів форми (js/validation.js)
    'border-red-500', 'bg-red-50', 'border-green-500', 'border-transparent',
    // варіанти страхування (js/booking.js)
    'has-[:checked]:border-navy', 'has-[:checked]:bg-gray-100',
    'has-[:focus-visible]:ring-2', 'has-[:focus-visible]:ring-brand-orange',
    'border-brand-orange/60', 'bg-gradient-to-br', 'from-navy', 'to-royal', 'text-brand-orange',
    'hover:border-brand-orange', 'hover:shadow-lg', 'has-[:checked]:border-brand-orange',
    'has-[:checked]:ring-2', 'has-[:checked]:ring-brand-orange', 'accent-brand-orange', 'accent-navy',
    // стани полів калькулятора оренди (js/widget.js)
    'focus-visible:ring-red-500', 'text-green-700',
  ],

  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#0d1526',   // кнопки, темні картки, футер
          deep: '#0a0f1a',      // фон внутрішніх сторінок
        },
        ink: '#03060d',         // натиснута кнопка
        royal: '#0d2a7a',       // hover кнопки, активний пункт меню
        cream: '#faf7f2',       // фон картки авто на головній
        muted: '#c4c6cf',       // другорядний світлий текст на темному
        line: '#4a5063',        // лінії-розділювачі на темному
        placeholder: '#eef0f3', // фон під зображення, поки фото немає
        brand: {
          green: '#087f08',     // ціни й бейджі; затемнено в ЛР №12 до контрасту 5.2:1 на білому (WCAG AA)
          brown: '#b87a30',
          blue: '#1a6fe0',
          'blue-soft': '#e1eafc',
          orange: '#f5a33a',    // рамка обраної/фокусної кнопки
        },
        disabled: {
          DEFAULT: '#808080',
          text: '#4d4d4d',
        },
      },

      fontFamily: {
        head: ['Nunito', 'sans-serif'],         // заголовки, кнопки
        sans: ['"Nunito Sans"', 'sans-serif'],  // основний текст
      },

      boxShadow: {
        card: '0 8px 24px rgba(13, 21, 38, .25)',
        pop: '0 12px 32px rgba(13, 21, 38, .18)',
        header: '0 1px 0 rgba(13, 21, 38, .08)',
      },

      ringWidth: { 3: '3px' },     // помаранчева рамка кнопки з референсу
      scale: { 98: '.98' },        // легке «натискання» кнопки

      height: {
        header: '89px',
        'header-sm': '68px',
      },
    },
  },
};
