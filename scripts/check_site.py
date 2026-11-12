"""Перевірка сайту перед деплоєм (запускається в GitHub Actions і локально).

    python scripts/check_site.py

Що перевіряється в кожному HTML-файлі:
  - є <html lang>, <title>, meta description і viewport, рівно один <h1>;
  - немає повторюваних id;
  - кожне <img> має атрибут alt (для декоративних — порожній alt="");
  - усі локальні посилання й файли (href, src, srcset) справді існують;
  - зовнішні посилання з target="_blank" мають rel="noopener".
Також: data/data.json — коректний JSON, а фото з нього існують.

Код виходу 1, якщо є хоча б одна помилка, — тоді деплой не запускається.
Бібліотеки не потрібні: лише стандартний Python 3.
"""

import json
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parent.parent
SKIP_DIRS = {".git", ".github", "node_modules", "tools"}


class PageParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ids, self.refs, self.problems = [], [], []
        self.h1 = 0
        self.has = {"lang": False, "title": False, "description": False, "viewport": False}
        self._in_title = False

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if "id" in a:
            self.ids.append(a["id"])
        if tag == "html" and a.get("lang"):
            self.has["lang"] = True
        if tag == "title":
            self._in_title = True
        if tag == "meta" and a.get("name") in ("description", "viewport") and a.get("content"):
            self.has[a["name"]] = True
        if tag == "h1":
            self.h1 += 1
        if tag == "img" and "alt" not in a:
            self.problems.append(f"<img src=\"{a.get('src', '?')}\"> без атрибута alt")
        if tag == "a" and a.get("target") == "_blank" and "noopener" not in (a.get("rel") or ""):
            self.problems.append(f"<a href=\"{a.get('href')}\" target=\"_blank\"> без rel=\"noopener\"")
        for name in ("href", "src", "poster"):
            if a.get(name):
                self.refs.append(a[name])
        if a.get("srcset"):
            self.refs += [part.strip().split(" ")[0] for part in a["srcset"].split(",")]

    def handle_endtag(self, tag):
        if tag == "title":
            self._in_title = False

    def handle_data(self, data):
        if self._in_title and data.strip():
            self.has["title"] = True


def is_local(ref):
    parts = urlsplit(ref)
    return not (parts.scheme or parts.netloc or ref.startswith(("#", "mailto:", "tel:", "data:", "javascript:")))


def check_page(path):
    errors = []
    parser = PageParser()
    parser.feed(path.read_text(encoding="utf-8"))
    rel = path.relative_to(ROOT)

    for key, ok in parser.has.items():
        if not ok:
            errors.append(f"{rel}: немає {key}")
    if parser.h1 != 1:
        errors.append(f"{rel}: має бути один <h1>, знайдено {parser.h1}")
    seen = set()
    for i in parser.ids:
        if i in seen:
            errors.append(f"{rel}: id=\"{i}\" повторюється")
        seen.add(i)
    errors += [f"{rel}: {p}" for p in parser.problems]

    for ref in parser.refs:
        if not is_local(ref):
            continue
        target_path = unquote(urlsplit(ref).path)
        if not target_path:
            continue
        target = (ROOT / target_path.lstrip("/")) if target_path.startswith("/") else (path.parent / target_path)
        if target.is_dir():
            target = target / "index.html"
        if not target.exists():
            errors.append(f"{rel}: файл не знайдено — {ref}")
    return errors


def check_data():
    errors = []
    data_file = ROOT / "data" / "data.json"
    try:
        data = json.loads(data_file.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        return [f"data/data.json: {error}"]
    for car in data.get("cars", []):
        for key in ("image",):
            if car.get(key) and not (ROOT / car[key]).exists():
                errors.append(f"data/data.json: {car.get('id')} — немає файлу {car[key]}")
        if car.get("page") and not (ROOT / car["page"]).exists():
            errors.append(f"data/data.json: {car.get('id')} — немає сторінки {car['page']}")
    return errors


def main():
    pages = [p for p in ROOT.rglob("*.html") if not SKIP_DIRS & set(p.relative_to(ROOT).parts)]
    errors = []
    for page in sorted(pages):
        errors += check_page(page)
    errors += check_data()

    print(f"Перевірено сторінок: {len(pages)}")
    if errors:
        print(f"Знайдено помилок: {len(errors)}")
        for error in errors:
            print(f"  ✗ {error}")
        sys.exit(1)
    print("✓ Помилок не знайдено")


if __name__ == "__main__":
    main()
