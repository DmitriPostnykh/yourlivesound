"""Bundle reviewed English text into the private, self-contained resume book."""
from html.parser import HTMLParser
import json
import re


class ReaderStrings(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.skip = 0
        self.strings = set()

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style"):
            self.skip += 1
        if not self.skip:
            for key, value in attrs:
                if key in ("title", "placeholder", "aria-label", "data-title", "content") and value:
                    self.strings.add(value.strip())

    def handle_endtag(self, tag):
        if tag in ("script", "style"):
            self.skip -= 1

    def handle_data(self, data):
        if not self.skip and data.strip():
            self.strings.add(data.strip())


def observation_english(fact):
    fixed = {
        "В Compose указан образ контейнера; контейнер не запускался.": "A container image is specified in Compose; the container was not run.",
        "В Dockerfile указан базовый образ; образ не запускался.": "A base image is specified in the Dockerfile; the image was not run.",
        "Присутствует файл записи архитектурного решения.": "An architecture decision record file is present.",
        "Присутствует инструкция SKILL.md для агента.": "An agent instruction file, SKILL.md, is present.",
        "Присутствует файл в каталоге prompts; модель не вызывалась.": "A file is present in the prompts directory; no model was called.",
        "В репозитории присутствует Dockerfile.": "A Dockerfile is present in the repository.",
        "В репозитории присутствует Makefile.": "A Makefile is present in the repository.",
    }
    if fact in fixed:
        return fixed[fact]
    rules = [
        (r"В документации встречается термин (.+); это не подтверждение реализации или навыка\.", lambda m: f"The term {m[1]} appears in documentation; this does not establish implementation or personal proficiency."),
        (r"В исходном коде или конфигурации встречается (.+); выполнение не проверялось\.", lambda m: f"{m[1]} appears in source code or configuration; execution was not verified."),
        (r"В (.+) объявлена зависимость (.+)\.", lambda m: f"The dependency {m[2]} is declared in {m[1]}."),
        (r"В репозитории присутствует исходный файл (.+)\.", lambda m: f"A {m[1]} source file is present in the repository."),
        (r"Объявлена команда проекта (.+); команда не выполнялась\.", lambda m: f"The project command {m[1]} is declared; the command was not run."),
        (r"Присутствует конфигурация (.+); выполнение не проверялось\.", lambda m: f"A {m[1]} configuration is present; execution was not verified."),
    ]
    for pattern, render in rules:
        match = re.fullmatch(pattern, fact)
        if match:
            return render(match)
    raise ValueError("Missing English observation template: " + fact)


def generated_english(text):
    rules = [
        (r"Глава (\d+)", lambda m: "Chapter " + m[1]),
        (r"из (\d+)", lambda m: "of " + m[1]),
        (r"строка (\d+)", lambda m: "line " + m[1]),
        (r"(\d+) ист\.", lambda m: m[1] + (" source" if m[1] == "1" else " sources")),
        (r"(\d+) пр\.", lambda m: m[1] + (" project" if m[1] == "1" else " projects")),
        (r"(\d+) проект(?:а|ов)?", lambda m: m[1] + (" project" if m[1] == "1" else " projects")),
        (r"(\d+) пунктов · (\d+) наблюдений", lambda m: f"{m[1]} terms · {m[2]} observations"),
    ]
    for pattern, render in rules:
        match = re.fullmatch(pattern, text)
        if match:
            return render(match)
    for russian, english in (("Веб-версия · в разработке", "Web version · in development"),
                             ("В разработке", "In development"), ("Прототип", "Prototype")):
        if text == russian or text.startswith(russian + " · ~"):
            return english + text[len(russian):]
    return None


def localize_document(document, notes, observations, folder):
    translations = json.loads((folder / "resume_book_en.json").read_text())
    dictionary = dict(translations["strings"])
    by_slug = translations["projects"]
    if set(by_slug) != {note["slug"] for note in notes}:
        raise ValueError("English project text must cover all chapters exactly")
    for note in notes:
        english = by_slug[note["slug"]]
        if len(note["work"]) != len(english["work"]):
            raise ValueError("English project scope is incomplete: " + note["slug"])
        dictionary[note["subtitle"]] = english["subtitle"]
        dictionary[note["summary"]] = english["summary"]
        dictionary.update(zip(note["work"], english["work"]))
    for row in observations:
        dictionary[row["fact"]] = observation_english(row["fact"])
    reader = ReaderStrings()
    reader.feed(document)
    missing = []
    for text in reader.strings:
        if re.search("[А-Яа-яЁё]", text) and text not in dictionary:
            translated = generated_english(text)
            if translated is None:
                missing.append(text)
            else:
                dictionary[text] = translated
    if missing:
        raise ValueError("Untranslated reader text: " + repr(sorted(missing)))
    pattern = r'(<script id="book-model" type="application/json">)(.*?)(</script>)'
    match = re.search(pattern, document, re.S)
    model = json.loads(match[2])
    for project in model["projects"]:
        english = by_slug[project["slug"]]
        project["text_en"] = " ".join([english["subtitle"], english["summary"], *english["work"],
                                        dictionary.get(project["status"], project["status"])])
    encode = lambda value: json.dumps(value, ensure_ascii=False, separators=(",", ":")).replace("<", "\\u003c")
    document = document[:match.start(2)] + encode(model) + document[match.end(2):]
    payload = '<script id="book-translations" type="application/json">' + encode(dictionary) + '</script>'
    document = document.replace('<script id="book-model"', payload + '<script id="book-model"', 1)
    return document, {"languages": ["ru", "en"], "translated_strings": len(dictionary),
                      "untranslated_reader_strings": 0}
