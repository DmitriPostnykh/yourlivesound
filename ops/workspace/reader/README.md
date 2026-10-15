# Private book reader

These generic assets implement the self-contained reader, RU/EN controls,
browser language selection, bilingual search, and translation assembly.
They contain no book inventory, invitation credentials, or personal project
descriptions.

The private generator imports `localize_document` from `resume_book_i18n.py`
after assembling the original Russian HTML. Pass the private project notes,
observations, and tools directory containing the reviewed `resume_book_en.json`.
The assembler requires English text for every chapter and every reader string;
unknown text stops the build instead of silently leaving a partial translation.
The generator embeds the returned translation data and `resume_book.js` into
one HTML document, using `resume_book.css` for layout.

Private tools may symlink these three assets from this repository. Keep the
generator and translation JSON with the private book. Prepare and deploy only
the sanitized web bundle through the existing workspace operations.

Validate the language policy and bilingual search with:

```sh
node --test ops/workspace/reader/resume_book.test.cjs
```

Also check both language buttons, chapter navigation, search results, and
layout in a browser before publishing. Source observations and immutable
source links must remain intact when rebuilding.
