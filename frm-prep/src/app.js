/* FRM Part I Study Notes: routing, chapter loading, practice questions, progress, search, theme. */
(function () {
  'use strict';

  const M = window.FRM_MANIFEST;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const pad2 = (n) => String(n).padStart(2, '0');
  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  const root = document.documentElement;
  const view = $('#view');
  const viewWrap = $('#view-wrap');
  const toc = $('#toc');
  const nav = $('#nav');
  const scrim = $('#scrim');
  const menuBtn = $('#menu-btn');
  const themeBtn = $('#theme-btn');
  const searchInput = $('#search');
  const results = $('#search-results');
  const HOME_HTML = view.innerHTML;
  const SITE_NAME = document.title;
  const LETTERS = 'ABCD';

  /* ------------------------------------------------------- data loading */
  // Each data file is a script that calls FRM.receive({id, html}); this works from file:// too.

  const loaded = new Map();
  const pending = new Map();

  window.FRM = {
    receive(data) {
      loaded.set(data.id, data);
      const entry = pending.get(data.id);
      if (entry) {
        pending.delete(data.id);
        entry.resolve(data);
      }
    },
  };

  function loadData(id) {
    if (loaded.has(id)) return Promise.resolve(loaded.get(id));
    if (pending.has(id)) return pending.get(id).promise;
    const entry = {};
    entry.promise = new Promise((resolve, reject) => {
      entry.resolve = resolve;
      entry.reject = reject;
    });
    pending.set(id, entry);
    const script = document.createElement('script');
    script.src = `data/${id}.js`;
    script.onerror = () => {
      pending.delete(id);
      script.remove();
      entry.reject(new Error(`data/${id}.js did not load`));
    };
    document.head.appendChild(script);
    return entry.promise;
  }

  /* ----------------------------------------------------------- progress */
  // Saved per browser. Without storage access the site still works; progress lasts for the visit.

  const STORE_KEY = 'frm-part1-progress-v1';
  const progress = (() => {
    let state = { studied: {}, answers: {} };
    try {
      const saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
      if (saved && typeof saved === 'object') state = { studied: saved.studied || {}, answers: saved.answers || {} };
    } catch (e) {
      /* storage unavailable */
    }
    const save = () => {
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(state));
      } catch (e) {
        /* storage unavailable */
      }
    };
    return {
      studied: (id) => Boolean(state.studied[id]),
      setStudied(id, on) {
        if (on) state.studied[id] = true;
        else delete state.studied[id];
        save();
      },
      answers: (id) => state.answers[id] || {},
      setAnswer(id, qid, choice, correct) {
        state.answers[id] = state.answers[id] || {};
        state.answers[id][qid] = { i: choice, ok: correct };
        save();
      },
      clearAnswer(id, qid) {
        if (!state.answers[id]) return;
        delete state.answers[id][qid];
        save();
      },
    };
  })();

  /* -------------------------------------------------------------- theme */

  const hostTheme = root.hasAttribute('data-frm-theme') ? null : root.getAttribute('data-theme');
  const THEMES = ['auto', 'light', 'dark'];
  let theme = root.getAttribute('data-frm-theme') || 'auto';

  function paintThemeButton() {
    const label = { auto: 'Auto', light: 'Light', dark: 'Dark' }[theme];
    themeBtn.textContent = label;
    themeBtn.setAttribute('aria-label', `Color theme: ${label}. Select to change.`);
  }

  themeBtn.addEventListener('click', () => {
    theme = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
    if (theme === 'auto') {
      root.removeAttribute('data-frm-theme');
      if (hostTheme) root.setAttribute('data-theme', hostTheme);
      else root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', theme);
      root.setAttribute('data-frm-theme', theme);
    }
    try {
      if (theme === 'auto') localStorage.removeItem('frm-theme');
      else localStorage.setItem('frm-theme', theme);
    } catch (e) {
      /* storage unavailable */
    }
    paintThemeButton();
  });
  paintThemeButton();

  /* ------------------------------------------------------------ routing */

  let currentPage = null;
  let routeToken = 0;

  function parseHash() {
    const raw = location.hash;
    if (raw && raw !== '#' && !raw.startsWith('#/')) return null;
    const parts = decodeURIComponent(raw.replace(/^#\/?/, '')).split('/');
    return { page: parts[0] || '', anchor: parts[1] || '' };
  }

  async function route() {
    const target = parseHash();
    if (!target) return;
    closeNav();
    closeSearch();
    const { page, anchor } = target;
    if (page === currentPage) {
      if (anchor) scrollToAnchor(anchor);
      else window.scrollTo(0, 0);
      return;
    }
    const token = ++routeToken;
    view.setAttribute('aria-busy', 'true');
    let shown;
    if (page === '') shown = renderHome();
    else if (page === 'formulas' || page === 'reference') shown = await renderDataPage(page, token);
    else if (M.chapters[page] && M.chapters[page].available) shown = await renderChapter(page, token);
    else shown = renderMissing(page);
    if (token !== routeToken) return;
    view.removeAttribute('aria-busy');
    currentPage = shown ? page : null;
    markCurrent(page);
    if (anchor) scrollToAnchor(anchor);
    else window.scrollTo(0, 0);
  }

  function setLayout(kind, meta) {
    viewWrap.classList.toggle('is-wide', kind === 'wide');
    viewWrap.classList.toggle('with-toc', kind === 'chapter');
    if (kind === 'chapter' && meta.toc.length) {
      toc.innerHTML =
        `<p class="toc-title">On this page</p><ol>` +
        meta.toc.map((s) => `<li><a href="#/${meta.id}/${s.id}" data-target="${s.id}">${esc(s.t)}</a></li>`).join('') +
        `</ol>`;
      toc.hidden = false;
    } else {
      toc.hidden = true;
      toc.innerHTML = '';
    }
  }

  function renderHome() {
    setLayout('wide');
    view.innerHTML = HOME_HTML;
    document.title = SITE_NAME;
    decorateProgress();
    return true;
  }

  function renderMessage(title, text) {
    setLayout('narrow');
    view.innerHTML = `<div class="view-message"><h1>${esc(title)}</h1><p>${esc(text)}</p><p><a href="#/">Go to the overview</a></p></div>`;
    document.title = `${title} · ${SITE_NAME}`;
  }

  function renderMissing(page) {
    const meta = M.chapters[page];
    if (meta) renderMessage(meta.title, `Book ${meta.book}, Chapter ${meta.n} has no notes yet.`);
    else renderMessage('No page at this address', `Nothing matches “${page}”. Use the chapter list or search.`);
    return false;
  }

  async function renderDataPage(page, token) {
    let data;
    try {
      data = await loadData(page);
    } catch (e) {
      if (token === routeToken) renderMessage('This page did not load', `The file data/${page}.js is missing. Run “node build.mjs” in the frm-prep folder, then reload.`);
      return false;
    }
    if (token !== routeToken) return false;
    setLayout('wide');
    view.innerHTML = data.html;
    document.title = `${page === 'formulas' ? 'Formula sheet' : 'Standard normal table'} · ${SITE_NAME}`;
    return true;
  }

  async function renderChapter(id, token) {
    const meta = M.chapters[id];
    let data;
    try {
      data = await loadData(id);
    } catch (e) {
      if (token === routeToken) renderMessage('This chapter did not load', `The file data/${id}.js is missing. Run “node build.mjs” in the frm-prep folder, then reload.`);
      return false;
    }
    if (token !== routeToken) return false;
    const book = M.books[meta.book - 1];
    setLayout('chapter', meta);
    view.innerHTML =
      `<article class="chapter" data-chapter="${id}">${chapterHeader(meta, book)}` +
      `<div class="prose">${data.html}</div>${pager(id)}</article>`;
    document.title = `${meta.title} · ${SITE_NAME}`;
    restoreAnswers(id);
    paintStudied(id);
    paintScore(id);
    spy();
    return true;
  }

  function chapterHeader(meta, book) {
    const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
    return `<header class="ch-head">
<p class="kicker">Book ${book.n} · ${esc(book.title)} · ${book.weight}% of the exam</p>
<div class="ch-title-row"><span class="ch-num" aria-hidden="true">${pad2(meta.n)}</span><h1 class="ch-title"><span class="sr-only">Chapter ${meta.n}: </span>${esc(meta.title)}</h1></div>
${meta.lede ? `<p class="ch-lede">${meta.lede}</p>` : ''}
<div class="ch-bar">
<p class="ch-meta"><span>${meta.minutes} min read</span><span>${plural(meta.f, 'formula')}</span><span>${plural(meta.q, 'practice question')}</span><span class="ch-score" data-score hidden></span></p>
<button type="button" class="btn studied-btn" aria-pressed="false">Mark as studied</button>
</div>
</header>`;
  }

  function pager(id) {
    const i = M.order.indexOf(id);
    const find = (step) => {
      for (let k = i + step; k >= 0 && k < M.order.length; k += step) {
        const c = M.chapters[M.order[k]];
        if (c.available) return c;
      }
      return null;
    };
    const link = (c, dir) =>
      c
        ? `<a class="pager-link pager-${dir}" href="#/${c.id}"><span class="pager-dir">${dir === 'prev' ? 'Previous' : 'Next'} · Book ${c.book}, Ch. ${c.n}</span><span class="pager-title">${esc(c.title)}</span></a>`
        : '<span></span>';
    return `<nav class="pager" aria-label="Previous and next chapter">${link(find(-1), 'prev')}${link(find(1), 'next')}</nav>`;
  }

  function markCurrent(page) {
    for (const a of $$('#nav [data-ch], #nav [data-page]')) {
      const match = a.dataset.ch !== undefined ? a.dataset.ch === page : a.dataset.page === page;
      if (match) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    }
    const current = $('#nav [data-ch][aria-current="page"]');
    if (current) {
      const r = current.getBoundingClientRect();
      const n = nav.getBoundingClientRect();
      if (r.top < n.top || r.bottom > n.bottom) nav.scrollTop += r.top - n.top - n.height / 3;
    }
  }

  function scrollToAnchor(anchor) {
    const el = document.getElementById(anchor);
    if (!el || !view.contains(el)) {
      window.scrollTo(0, 0);
      return;
    }
    el.scrollIntoView({ block: 'start' });
    if (el.matches('.formula, .q')) {
      el.classList.remove('is-flash');
      void el.offsetWidth;
      el.classList.add('is-flash');
    }
  }

  /* ------------------------------------------------ questions & studied */

  view.addEventListener('click', (event) => {
    const chapter = $('.chapter', view);
    if (!chapter) return;
    const id = chapter.dataset.chapter;

    const option = event.target.closest('.q-opt');
    if (option) {
      const q = option.closest('.q');
      if (q.classList.contains('is-answered')) return;
      const choice = Number(option.dataset.i);
      progress.setAnswer(id, q.id, choice, choice === Number(q.dataset.answer));
      showAnswer(q, choice);
      paintScore(id);
      decorateProgress();
      return;
    }

    const reset = event.target.closest('.q-reset');
    if (reset) {
      const q = reset.closest('.q');
      progress.clearAnswer(id, q.id);
      clearAnswer(q);
      paintScore(id);
      decorateProgress();
      $('.q-opt', q).focus();
      return;
    }

    if (event.target.closest('.studied-btn')) {
      progress.setStudied(id, !progress.studied(id));
      paintStudied(id);
      decorateProgress();
    }
  });

  function showAnswer(q, choice) {
    const answer = Number(q.dataset.answer);
    q.classList.add('is-answered');
    $$('.q-opt', q).forEach((btn, k) => {
      btn.setAttribute('aria-disabled', 'true');
      btn.classList.toggle('is-correct', k === answer);
      btn.classList.toggle('is-wrong', k === choice && choice !== answer);
    });
    const verdict = $('.q-verdict', q);
    verdict.textContent =
      choice === answer
        ? `Correct: ${LETTERS[answer]}.`
        : `Incorrect. You chose ${LETTERS[choice]}; the answer is ${LETTERS[answer]}.`;
    verdict.classList.toggle('is-wrong', choice !== answer);
    $('.q-feedback', q).hidden = false;
  }

  function clearAnswer(q) {
    q.classList.remove('is-answered');
    $$('.q-opt', q).forEach((btn) => {
      btn.removeAttribute('aria-disabled');
      btn.classList.remove('is-correct', 'is-wrong');
    });
    $('.q-feedback', q).hidden = true;
  }

  function restoreAnswers(id) {
    const saved = progress.answers(id);
    for (const q of $$('.q', view)) {
      const a = saved[q.id];
      if (!a || !Number.isInteger(a.i)) continue;
      const correct = a.i === Number(q.dataset.answer);
      if (a.ok !== correct) progress.setAnswer(id, q.id, a.i, correct);
      showAnswer(q, a.i);
    }
  }

  function paintScore(id) {
    const el = $('[data-score]', view);
    if (!el) return;
    const answered = Object.values(progress.answers(id));
    el.hidden = answered.length === 0;
    el.textContent = `${answered.filter((a) => a.ok).length} of ${answered.length} answered correctly`;
  }

  function paintStudied(id) {
    const btn = $('.studied-btn', view);
    if (!btn) return;
    const on = progress.studied(id);
    btn.setAttribute('aria-pressed', String(on));
    btn.textContent = on ? 'Studied ✓' : 'Mark as studied';
  }

  function decorateProgress() {
    for (const el of $$('[data-ch]')) el.classList.toggle('is-studied', progress.studied(el.dataset.ch));
    for (const seg of $$('[data-book-progress]')) {
      const book = M.books[Number(seg.dataset.bookProgress) - 1];
      const done = book.chapters.filter((id) => progress.studied(id)).length;
      seg.style.setProperty('--p', String(done / book.chapters.length));
      const label = $('[data-progress-label]', seg);
      if (label) label.textContent = `${done} of ${book.chapters.length} studied`;
    }
    for (const el of $$('[data-ch-score]')) {
      const id = el.dataset.chScore;
      const answered = Object.values(progress.answers(id));
      const total = M.chapters[id].q;
      el.textContent = answered.length ? `${answered.filter((a) => a.ok).length}/${total} correct` : `${total} questions`;
    }
  }

  /* ------------------------------------------------------ section index */

  let spyFrame = 0;
  function spy() {
    if (toc.hidden) return;
    let current = null;
    for (const h of $$('.prose > h2[id]', view)) {
      if (h.getBoundingClientRect().top <= 140) current = h;
      else break;
    }
    for (const a of $$('a[data-target]', toc)) a.classList.toggle('is-active', Boolean(current) && a.dataset.target === current.id);
  }
  window.addEventListener(
    'scroll',
    () => {
      if (!spyFrame)
        spyFrame = requestAnimationFrame(() => {
          spyFrame = 0;
          spy();
        });
    },
    { passive: true },
  );

  /* ------------------------------------------------------------- drawer */

  function openNav() {
    nav.classList.add('is-open');
    scrim.hidden = false;
    menuBtn.setAttribute('aria-expanded', 'true');
  }
  function closeNav() {
    nav.classList.remove('is-open');
    scrim.hidden = true;
    menuBtn.setAttribute('aria-expanded', 'false');
  }
  menuBtn.addEventListener('click', () => (nav.classList.contains('is-open') ? closeNav() : openNav()));
  scrim.addEventListener('click', closeNav);

  $('.skip').addEventListener('click', (event) => {
    event.preventDefault();
    view.focus();
  });

  /* ------------------------------------------------------------- search */

  const KIND_RANK = { Chapter: 0, Page: 1, Section: 2, Formula: 3, Term: 4 };
  const INDEX = M.search.map(([k, t, d, h]) => ({ k, t, d, h, title: t.toLowerCase(), hay: `${t} ${d}`.toLowerCase() }));
  let shown = [];
  let active = -1;

  function runSearch(query) {
    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!tokens.length) return [];
    const hits = [];
    for (const e of INDEX) {
      if (!tokens.every((t) => e.hay.includes(t))) continue;
      let score = KIND_RANK[e.k] * 2 + e.t.length / 60;
      for (const t of tokens) {
        if (e.title.startsWith(t)) score -= 6;
        else if (e.title.includes(` ${t}`) || e.title.includes(`(${t}`)) score -= 3;
        else if (!e.title.includes(t)) score += 4;
      }
      hits.push([score, e]);
    }
    return hits
      .sort((a, b) => a[0] - b[0])
      .slice(0, 30)
      .map((x) => x[1]);
  }

  function highlight(text, query) {
    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
    const lower = text.toLowerCase();
    const marks = new Array(text.length).fill(false);
    for (const t of tokens) {
      for (let i = lower.indexOf(t); i !== -1; i = lower.indexOf(t, i + 1)) marks.fill(true, i, i + t.length);
    }
    let out = '';
    let open = false;
    for (let k = 0; k < text.length; k++) {
      if (marks[k] !== open) {
        out += marks[k] ? '<mark>' : '</mark>';
        open = marks[k];
      }
      out += esc(text[k]);
    }
    return open ? `${out}</mark>` : out;
  }

  function renderResults() {
    const query = searchInput.value.trim();
    if (!query) {
      closeSearch();
      return;
    }
    shown = runSearch(query);
    active = shown.length ? 0 : -1;
    results.innerHTML = shown.length
      ? shown
          .map(
            (e, i) =>
              `<a class="sr-item" role="option" id="sr-${i}" href="${e.h}" aria-selected="${i === active}"><span class="sr-kind">${e.k}</span><span class="sr-main"><span class="sr-t">${highlight(e.t, query)}</span><span class="sr-d">${esc(e.d)}</span></span></a>`,
          )
          .join('')
      : `<p class="sr-empty">No matches for “${esc(query)}”. Search matches words in chapter titles, section headings, formula labels and defined terms.</p>`;
    results.hidden = false;
    searchInput.setAttribute('aria-expanded', 'true');
    paintActive();
  }

  function paintActive() {
    $$('.sr-item', results).forEach((el, i) => el.setAttribute('aria-selected', String(i === active)));
    if (active >= 0) {
      searchInput.setAttribute('aria-activedescendant', `sr-${active}`);
      $(`#sr-${active}`, results).scrollIntoView({ block: 'nearest' });
    } else searchInput.removeAttribute('aria-activedescendant');
  }

  function closeSearch() {
    results.hidden = true;
    results.innerHTML = '';
    shown = [];
    active = -1;
    searchInput.setAttribute('aria-expanded', 'false');
    searchInput.removeAttribute('aria-activedescendant');
  }

  function go(href) {
    searchInput.value = '';
    closeSearch();
    searchInput.blur();
    if (location.hash === href) route();
    else location.hash = href;
  }

  searchInput.addEventListener('input', renderResults);
  searchInput.addEventListener('focus', () => {
    if (searchInput.value.trim()) renderResults();
  });
  searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown' && shown.length) {
      event.preventDefault();
      active = (active + 1) % shown.length;
      paintActive();
    } else if (event.key === 'ArrowUp' && shown.length) {
      event.preventDefault();
      active = (active - 1 + shown.length) % shown.length;
      paintActive();
    } else if (event.key === 'Enter' && shown[active]) {
      event.preventDefault();
      go(shown[active].h);
    } else if (event.key === 'Escape') {
      searchInput.value = '';
      closeSearch();
      searchInput.blur();
    }
  });
  results.addEventListener('click', (event) => {
    const item = event.target.closest('.sr-item');
    if (!item) return;
    event.preventDefault();
    go(item.getAttribute('href'));
  });
  document.addEventListener('click', (event) => {
    if (!event.target.closest('.search')) closeSearch();
  });
  document.addEventListener('keydown', (event) => {
    const typing = event.target.closest('input, textarea, select, [contenteditable="true"]');
    if (event.key === '/' && !typing && !event.metaKey && !event.ctrlKey && !event.altKey) {
      event.preventDefault();
      searchInput.focus();
    } else if (event.key === 'Escape' && nav.classList.contains('is-open')) {
      closeNav();
    }
  });

  /* --------------------------------------------------------------- boot */

  window.addEventListener('hashchange', route);
  decorateProgress();
  route();
})();
