"""Prepare the existing resume book for private web viewing."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
import argparse
import re
from lxml import html, etree

parser = argparse.ArgumentParser()
parser.add_argument('--book', type=Path, required=True)
parser.add_argument('--output', type=Path, required=True)
parser.add_argument('--manifest', type=Path, required=True)
args = parser.parse_args()
source = args.book.resolve()
DIST = args.output.resolve()
manifest_path = args.manifest.resolve()
assert not manifest_path.is_relative_to(DIST), "Keep the private manifest outside the served bundle"
manifest_path.parent.mkdir(parents=True, exist_ok=True)

DIST.mkdir(parents=True, exist_ok=True, mode=0o700)
(DIST / "resume").mkdir(exist_ok=True, mode=0o700)

book = html.fromstring(source.read_text())
chapters = len(book.xpath('//article[contains(concat(" ", @class, " "), " chapter ")]'))
observations = len(book.xpath('//ol[@class="sources"]/li'))

# Local file locations cannot be opened on an iPad. Keep their relative labels
# and the verified GitHub links, without publishing workstation locations.
local_links = book.xpath('//a[starts-with(@href,"file:")]')
for anchor in local_links:
    anchor.tag = "span"
    anchor.attrib.pop("href", None)
    anchor.attrib.pop("title", None)
for element in book.iter():
    for name, value in list(element.attrib.items()):
        if re.search(r"/(?:Users|Volumes|root|home)/", value):
            element.attrib.pop(name)

for anchor in book.xpath('//a[starts-with(@href,"data/")]'):
    anchor.drop_tree()
for footer in book.xpath('//div[@class="source-footer"]'):
    footer.clear()
    footer.set("class", "source-footer")
    heading = etree.SubElement(footer, "h2")
    heading.text = "Источники"
    note = etree.SubElement(footer, "p")
    note.text = "Наблюдения и подтверждения раскрываются в конце каждой главы. Проверенные ссылки GitHub ведут к зафиксированным версиям исходных файлов."
for sidebar in book.xpath('//div[@class="sidebar-bottom"]'):
    link = etree.SubElement(sidebar, "a", href="/")
    link.text = "← Рабочее пространство"
head = book.find("head")
etree.SubElement(head, "meta", name="robots", content="noindex, nofollow, noarchive")
etree.SubElement(head, "meta", name="referrer", content="no-referrer")

web_book = html.tostring(book, encoding="unicode", doctype="<!DOCTYPE html>")
assert not re.search(r"/(?:Users|Volumes|root|home)/", web_book)
assert "file:" not in web_book
assert 'href="data/' not in web_book
assert len(book.xpath('//ol[@class="sources"]/li')) == observations
assert len(book.xpath('//article[contains(concat(" ", @class, " "), " chapter ")]')) == chapters
(DIST / "resume" / "index.html").write_text(web_book)

STYLE = """
:root{color-scheme:light dark;--paper:#faf8f2;--ink:#24372d;--muted:#627268;--line:#d8dfd4;--accent:#396047}
*{box-sizing:border-box}body{margin:0;min-height:100svh;background:var(--paper);color:var(--ink);font:17px/1.7 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;padding:clamp(24px,6vw,72px)}
main{max-width:820px;margin:5vh auto}header{display:flex;justify-content:space-between;gap:20px;align-items:center;padding-bottom:20px;border-bottom:1px solid var(--line);font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
h1{font:clamp(56px,10vw,92px)/1.05 Georgia,serif;font-weight:400;letter-spacing:-.04em;margin:54px 0 22px}p{max-width:600px;color:var(--muted)}.card{display:block;color:inherit;text-decoration:none;border:1px solid var(--line);border-radius:14px;padding:30px;margin-top:38px;background:rgba(90,125,85,.04)}.card:hover{border-color:var(--accent)}.card:focus-visible{outline:3px solid var(--accent);outline-offset:5px}.card h2{font:30px/1.2 Georgia,serif;margin:14px 0}.card p{margin-bottom:20px}.tag{font-size:12px;text-transform:uppercase;letter-spacing:.1em;color:var(--muted)}.action{color:var(--accent);font-weight:600}footer{margin-top:46px;padding-top:20px;border-top:1px solid var(--line);font-size:13px;color:var(--muted)}
@media(prefers-color-scheme:dark){:root{--paper:#17251d;--ink:#e5eadf;--muted:#a0b1a4;--line:#3c5142;--accent:#bed5a5}}
@media(max-width:500px){header{font-size:10px}.card{padding:22px}.card h2{font-size:27px}h1{margin-top:38px}}
"""

def page(title, content):
    return f'<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><meta name="referrer" content="no-referrer"><title>{title} · Your Live Sound</title><style>{STYLE}</style></head><body><main><header><span>Your Live Sound</span><span>Рабочее пространство</span></header>{content}<footer>Your Live Sound · Work</footer></main></body></html>'

(DIST / "index.html").write_text(page("Work", f'<h1>Work.</h1><p>Проекты, технологии и материалы для обсуждения.</p><a class="card" href="/resume/"><span class="tag">Книга · {chapters} проекта</span><h2>Мой опыт в проектах</h2><p>База опыта для резюме: назначение проектов, технологии, инструменты и подтверждающие материалы.</p><span class="action">Открыть книгу →</span></a>'))
(DIST / "closed.html").write_text(page("Закрытый доступ", '<h1>Work.</h1><p>Это закрытое рабочее пространство. Откройте приглашение, которое вам предоставил владелец.</p>'))
(DIST / "robots.txt").write_text("User-agent: *\nDisallow: /\n")

manifest = {
    "prepared_at": datetime.now(timezone.utc).isoformat(),
    "domain": "w.yourlivesound.com",
    "source": str(source),
    "source_sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
    "chapters": chapters,
    "observations": observations,
    "local_file_links_removed": len(local_links),
    "raw_data_files_published": False,
    "files": {str(p.relative_to(DIST)): hashlib.sha256(p.read_bytes()).hexdigest() for p in DIST.rglob("*") if p.is_file()},
    "privacy_scan": "PASS: local paths and raw downloads absent; observations preserved",
}
manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
manifest_path.chmod(0o600)
for p in DIST.rglob("*"):
    p.chmod(0o700 if p.is_dir() else 0o600)
print(json.dumps({key: manifest[key] for key in ("domain", "chapters", "observations", "local_file_links_removed", "privacy_scan")}, ensure_ascii=False))
