const test = require('node:test');
const assert = require('node:assert/strict');
const reader = require('./resume_book.js');

test('browser language selects Russian or English, including regional variants', () => {
  assert.equal(reader.resolveLanguage(['ru-RU', 'en-US']), 'ru');
  assert.equal(reader.resolveLanguage(['en-GB', 'ru']), 'en');
  assert.equal(reader.resolveLanguage(['fr-FR', 'ru']), 'ru');
  assert.equal(reader.resolveLanguage(['de-DE']), 'en');
  assert.equal(reader.resolveLanguage([]), 'en');
});

test('search finds the same project through Russian and English descriptions', () => {
  const projects = [{ slug: 'sample', text: 'Заметки и обсуждения', text_en: 'Notes and discussions' }];
  assert.equal(reader.search(projects, 'заметки')[0].slug, 'sample');
  assert.equal(reader.search(projects, 'notes')[0].slug, 'sample');
  assert.deepEqual(reader.search(projects, 'unrelated'), []);
});
