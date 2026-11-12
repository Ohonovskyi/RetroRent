/* Конфіг для Tailwind CLI (Node.js) — альтернатива tools/tailwind-build.html.
   Тема береться з того самого js/tailwind.config.js, що й у браузері, тож дублювання немає.
   Збірка: npx tailwindcss@3.4.17 -c tailwind.config.cjs -o css/tailwind.css --minify */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const sandbox = { tailwind: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'js/tailwind.config.js'), 'utf8'), sandbox);

module.exports = {
  ...sandbox.tailwind.config,
  content: ['./index.html', './pages/**/*.html', './js/**/*.js'],
};
