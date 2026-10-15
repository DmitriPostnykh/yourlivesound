const ResumeBookModel = (() => {
  const aliases = { 'джава': 'java', 'докер': 'docker', 'луа': 'lua', 'пайтон': 'python', 'питон': 'python', 'постгрес': 'postgres', 'неофорджей': 'neo4j', 'neo 4j': 'neo4j', 'адр': 'adr', 'вью': 'vue', 'ai music': 'ai_music', 'phrase trail': 'phrasetrail', 'thrive grow sync': 'thrivegrowsync', 'stratos harmony': 'stratosharmony' };
  function normalize(value) {
    let result = String(value || '').toLocaleLowerCase('ru-RU').trim().replace(/ё/g, 'е').replace(/\s+/g, ' ');
    for (const [from, to] of Object.entries(aliases)) result = result.split(from).join(to);
    return result;
  }
  function matches(text, query) {
    const haystack = normalize(text);
    return normalize(query).split(' ').filter(Boolean).every(token => haystack.includes(token));
  }
  function search(projects, query) { return projects.filter(project => matches(project.text + ' ' + (project.text_en || ''), query)); }
  function clampFont(value) { return Math.max(16, Math.min(23, Number.isFinite(Number(value)) ? Number(value) : 18)); }
  function resolveLanguage(browserLanguages = []) {
    for (const value of browserLanguages) {
      const language = String(value || '').toLowerCase().replace(/_/g, '-').split('-')[0];
      if (language === 'ru' || language === 'en') return language;
    }
    return 'en';
  }
  return { normalize, matches, search, clampFont, resolveLanguage };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = ResumeBookModel;

if (typeof document !== 'undefined') {
  (() => {
    const $ = id => document.getElementById(id);
    const model = JSON.parse($('book-model').textContent);
    const translations = JSON.parse($('book-translations').textContent);
    const pages = Array.from(document.querySelectorAll('.reading-page[data-route]'));
    const projectLinks = Array.from(document.querySelectorAll('.project-link'));
    const input = $('book-search');
    let active = 'start';
    let language = 'ru';
    let fontSize = 18;
    const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    function stored(key) { try { return localStorage.getItem('resume-book-' + key); } catch { return null; } }
    function store(key, value) { try { localStorage.setItem('resume-book-' + key, value); } catch {} }
    function translate(value) {
      if (language === 'ru') return value;
      if (Object.prototype.hasOwnProperty.call(translations, value)) return translations[value];
      const key = value.trim();
      return Object.prototype.hasOwnProperty.call(translations, key) ? value.replace(key, () => translations[key]) : value;
    }
    const originalText = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        return node.parentElement && !node.parentElement.closest('script,style,noscript,#current-label,#search-title,#search-count,#search-results-list') && /[А-Яа-яЁё]/.test(node.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    while (walker.nextNode()) originalText.push([walker.currentNode, walker.currentNode.nodeValue]);
    const originalAttributes = [];
    document.querySelectorAll('[placeholder],[aria-label],[data-title],meta[name="description"]').forEach(element => {
      ['placeholder', 'aria-label', 'data-title', 'content'].forEach(name => {
        const value = element.getAttribute(name);
        if (value && /[А-Яа-яЁё]/.test(value)) originalAttributes.push([element, name, value]);
      });
    });
    function setLanguage(value) {
      language = value === 'en' ? 'en' : 'ru';
      const position = { left: window.scrollX, top: window.scrollY };
      originalText.forEach(([node, text]) => { node.nodeValue = translate(text); });
      originalAttributes.forEach(([element, name, value]) => { element.setAttribute(name, translate(value)); });
      document.documentElement.lang = language;
      $('language-ru').setAttribute('aria-pressed', String(language === 'ru'));
      $('language-en').setAttribute('aria-pressed', String(language === 'en'));
      if (input.value.trim()) applySearch(); else showPage(active);
      window.scrollTo({ ...position, behavior: 'auto' });
    }
    function closeMenu() { document.body.classList.remove('nav-open'); $('drawer-shade').hidden = true; $('menu-button').setAttribute('aria-expanded', 'false'); }
    function showPage(route) {
      const page = pages.find(page => page.dataset.route === route) || $('start');
      active = page.dataset.route;
      if (page.classList.contains('chapter')) $('projects-accordion').open = true;
      pages.forEach(item => { item.hidden = item !== page; item.classList.toggle('is-current', item === page); });
      document.querySelectorAll('.main-nav a').forEach(link => {
        const selected = link.getAttribute('href') === '#' + active;
        link.classList.toggle('active', selected);
        if (selected) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
      });
      $('current-label').textContent = page.dataset.title;
      document.title = active === 'start' ? translate('Мой опыт в проектах') : page.dataset.title + ' · ' + translate('Мой опыт в проектах');
      return page;
    }
    function openAncestors(element) {
      let parent = element.parentElement;
      while (parent) { if (parent.tagName === 'DETAILS') parent.open = true; parent = parent.parentElement; }
      if (element.tagName === 'DETAILS') element.open = true;
    }
    function routeByHash() {
      let id;
      try { id = decodeURIComponent(location.hash.slice(1)); } catch { id = 'start'; }
      const target = $(id || 'start') || $('start');
      const page = target.closest('.reading-page[data-route]') || $('start');
      showPage(page.dataset.route);
      if (target !== page) {
        page.querySelectorAll('.source-filter').forEach(field => { field.value = ''; });
        page.querySelectorAll('.finding').forEach(finding => { finding.hidden = false; });
        page.querySelectorAll('.source-empty').forEach(empty => { empty.hidden = true; });
        openAncestors(target); requestAnimationFrame(() => target.scrollIntoView({ block: 'start', behavior: 'auto' }));
      }
      else window.scrollTo(0, 0);
      closeMenu();
    }
    function restoreNav() {
      projectLinks.forEach(link => { link.hidden = false; });
      $('nav-empty').hidden = true;
      $('clear-search').hidden = true;
    }
    function applySearch() {
      const query = input.value.trim();
      $('clear-search').hidden = !query;
      if (!query) { restoreNav(); routeByHash(); return; }
      const result = ResumeBookModel.search(model.projects, query);
      $('projects-accordion').open = true;
      const ids = new Set(result.map(project => project.slug));
      projectLinks.forEach(link => { link.hidden = !ids.has(link.dataset.project); });
      $('nav-empty').hidden = result.length > 0;
      $('search-title').textContent = '«' + query + '»';
      $('search-count').textContent = result.length ? translate('Проектов с совпадениями: ') + result.length : translate('Совпадений в материалах книги нет.');
      $('search-results-list').innerHTML = result.map(project => '<a class="search-result" href="#' + escape(project.slug) + '"><small>' + escape(translate('ОТКРЫТЬ ГЛАВУ ↗')) + '</small><div><strong>' + escape(project.title) + '</strong></div><p>' + escape(translate(project.subtitle)) + '</p><span class="search-status">' + escape(translate(project.status)) + '</span></a>').join('') || '<p class="search-zero">' + escape(translate('Попробуйте другое название проекта или технологии.')) + '</p>';
      showPage('search-results');
    }
    document.body.classList.add('js');
    const savedTheme = stored('theme');
    if (savedTheme === 'dark' || savedTheme === 'light') document.documentElement.dataset.theme = savedTheme;
    fontSize = ResumeBookModel.clampFont(stored('font') || 18);
    document.documentElement.style.setProperty('--reader-size', fontSize + 'px');
    input.addEventListener('input', applySearch);
    input.addEventListener('keydown', event => {
      if (event.key === 'Escape') { input.value = ''; applySearch(); }
      if (event.key === 'Enter') { const first = $('search-results-list').querySelector('a'); if (first && input.value.trim()) first.click(); }
    });
    $('clear-search').addEventListener('click', () => { input.value = ''; applySearch(); input.focus(); });
    document.addEventListener('click', event => {
      const anchor = event.target.closest('a[href^="#"]');
      if (!anchor || anchor.classList.contains('skip-link') || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const hash = anchor.getAttribute('href');
      const target = $(hash.slice(1));
      if (!target) return;
      event.preventDefault();
      input.value = ''; restoreNav();
      if (location.hash === hash) routeByHash(); else location.hash = hash;
    });
    window.addEventListener('hashchange', routeByHash);
    $('menu-button').addEventListener('click', () => { const open = !document.body.classList.contains('nav-open'); document.body.classList.toggle('nav-open', open); $('drawer-shade').hidden = !open; $('menu-button').setAttribute('aria-expanded', String(open)); });
    $('drawer-shade').addEventListener('click', closeMenu);
    document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });
    $('theme-button').addEventListener('click', () => { const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = theme; store('theme', theme); });
    function font(delta) { fontSize = ResumeBookModel.clampFont(fontSize + delta); document.documentElement.style.setProperty('--reader-size', fontSize + 'px'); store('font', String(fontSize)); }
    $('font-down').addEventListener('click', () => font(-1)); $('font-up').addEventListener('click', () => font(1));
    $('print-button').addEventListener('click', () => window.print());
    $('language-ru').addEventListener('click', () => setLanguage('ru'));
    $('language-en').addEventListener('click', () => setLanguage('en'));
    document.querySelectorAll('.source-filter').forEach(field => field.addEventListener('input', () => {
      const body = field.closest('.source-body'); let count = 0;
      body.querySelectorAll('.finding').forEach(finding => { const match = ResumeBookModel.matches(finding.dataset.term, field.value); finding.hidden = !match; if (match) count++; });
      body.querySelector('.source-empty').hidden = count > 0;
    }));
    $('index-search').addEventListener('input', event => {
      let count = 0;
      document.querySelectorAll('.index-term').forEach(term => { const match = ResumeBookModel.matches(term.dataset.indexTerm, event.target.value); term.hidden = !match; if (match) count++; });
      $('index-empty').hidden = count > 0;
    });
    setLanguage(ResumeBookModel.resolveLanguage([...(navigator.languages || []), navigator.language]));
    routeByHash();
  })();
}
