// Renders content/b{book}/{nn}.md into the static study site in site/, and writes
// dist-artifact/index.html: the same entry page without the document skeleton, for publishing.
// Open site/index.html directly in a browser; no server is needed.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import katex from 'katex';
import { Marked } from 'marked';

const require = createRequire(import.meta.url);
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = path.join(ROOT, 'content');
const SRC_DIR = path.join(ROOT, 'src');
const SITE_DIR = path.join(ROOT, 'site');
const ARTIFACT_DIR = path.join(ROOT, 'dist-artifact');

const SITE_NAME = 'FRM Part I Study Notes';
const FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@600;700;800;900' +
  '&family=IBM+Plex+Mono:wght@400;500;600' +
  '&family=Source+Serif+4:ital,opsz,wght@0,8..60,400..700;1,8..60,400..700&display=swap';

const BOOKS = [
  {
    n: 1,
    title: 'Foundations of Risk Management',
    short: 'Foundations',
    weight: 20,
    chapters: [
      'The Building Blocks of Risk Management',
      'How Do Firms Manage Financial Risk?',
      'The Governance of Risk Management',
      'Credit Risk Transfer Mechanisms',
      'Modern Portfolio Theory and Capital Asset Pricing Model',
      'The Arbitrage Pricing Theory and Multifactor Models of Risk and Return',
      'Principles for Effective Data Aggregation and Risk Reporting',
      'Enterprise Risk Management and Future Trends',
      'Learning from Financial Disasters',
      'Anatomy of the Great Financial Crisis of 2007–2009',
      'GARP Code of Conduct',
    ],
  },
  {
    n: 2,
    title: 'Quantitative Analysis',
    short: 'Quantitative Analysis',
    weight: 20,
    chapters: [
      'Fundamentals of Probability',
      'Random Variables',
      'Common Univariate Random Variables',
      'Multivariate Random Variables',
      'Sample Moments',
      'Hypothesis Testing',
      'Linear Regression',
      'Regression with Multiple Explanatory Variables',
      'Regression Diagnostics',
      'Stationary Time Series',
      'Non-Stationary Time Series',
      'Measuring Returns, Volatility, and Correlation',
      'Simulation and Bootstrapping',
      'Machine-Learning Methods',
      'Machine Learning and Prediction',
    ],
  },
  {
    n: 3,
    title: 'Financial Markets and Products',
    short: 'Markets & Products',
    weight: 30,
    chapters: [
      'Banks',
      'Insurance Companies and Pension Plans',
      'Fund Management',
      'Introduction to Derivatives',
      'Exchanges and OTC Markets',
      'Central Clearing',
      'Futures Markets',
      'Using Futures for Hedging',
      'Foreign Exchange Markets',
      'Pricing Financial Forwards and Futures',
      'Commodity Forwards and Futures',
      'Options Markets',
      'Properties of Options',
      'Trading Strategies',
      'Exotic Options',
      'Properties of Interest Rates',
      'Corporate Bonds',
      'Mortgages and Mortgage-Backed Securities',
      'Interest Rate Futures',
      'Swaps',
    ],
  },
  {
    n: 4,
    title: 'Valuation and Risk Models',
    short: 'Valuation & Risk Models',
    weight: 30,
    chapters: [
      'Measures of Financial Risk',
      'Calculating and Applying VaR',
      'Measuring and Monitoring Volatility',
      'External and Internal Credit Ratings',
      'Country Risk: Determinants, Measures, and Implications',
      'Measuring Credit Risk',
      'Operational Risk',
      'Stress Testing',
      'Pricing Conventions, Discounting, and Arbitrage',
      'Interest Rates',
      'Bond Yields and Return Calculations',
      'Applying Duration, Convexity, and DV01',
      'Modeling Non-Parallel Term Structure Shifts and Hedging',
      'Binomial Trees',
      'The Black-Scholes-Merton Model',
      'Option Sensitivity Measures: The “Greeks”',
    ],
  },
];

const MACROS = {
  '\\E': '\\mathbb{E}',
  '\\Var': '\\operatorname{Var}',
  '\\Cov': '\\operatorname{Cov}',
  '\\Corr': '\\operatorname{Corr}',
  '\\SD': '\\operatorname{SD}',
  '\\VaR': '\\text{VaR}',
  '\\ES': '\\text{ES}',
};

// Phrases that carry no information. The build fails if prose contains any of them.
const BANNED = [
  [/this is where/i, 'signposting'],
  [/the big one/i, 'hype'],
  [/confus/i, 'explain the difference instead of calling it confusing'],
  [/\btrips? (?:people|candidates|students|many|you) up/i, 'hype'],
  [/\btricky\b/i, 'hype'],
  [/\b(?:it(?:'|’)s|it is) (?:important|worth|crucial|essential|key|critical|vital) to\b/i, 'filler'],
  [/\bworth (?:noting|mentioning|remembering|emphasi[sz]ing)\b/i, 'filler'],
  [/\bnot(?:e|ice) that\b/i, 'filler: state the fact directly'],
  [/\b(?:keep|bear) in mind\b/i, 'filler'],
  [/\b(?:remember|recall)(?: that|,)/i, 'filler'],
  [/\blet(?:'|’)s\b/i, 'signposting'],
  [/\b(?:dive|delve)s?\b/i, 'filler'],
  [/\btake-?aways?\b/i, 'filler'],
  [/\bcrucial(?:ly)?\b/i, 'hype'],
  [/(?:^|[.!?]\s+)(?:Clearly|Obviously|Of course|Importantly|Interestingly|Notably|Essentially|Basically|Simply put)\b/, 'filler opener'],
  [/\b(?:needless to say|in a nutshell|at the end of the day|the bottom line)\b/i, 'filler'],
  [/\bin (?:summary|conclusion)\b|\bin short,|\bto (?:summari[sz]e|recap)\b/i, 'filler'],
  [/\bas you can see\b/i, 'filler'],
  [/\b(?:pro tip|fun fact|game[- ]changer|journey|unlock|supercharge)\b/i, 'hype'],
  [/\bdon(?:'|’)t worry\b|\bthe good news\b/i, 'filler'],
  [/\bhere(?:'|’)s the (?:thing|kicker|catch|key|trick)\b/i, 'hype'],
  [/\bkey insight\b/i, 'hype'],
  [/\bin this (?:section|chapter|reading)\b/i, 'signposting'],
  [/\bwe(?:'|’)ll\b|\bwe will\b|\byou(?:'|’)ll (?:learn|see)\b/i, 'signposting'],
  [/\b(?:exam(?:iners)?|GARP) (?:loves?|likes? to)\b|\b(?:frequently|heavily|often|commonly) tested\b/i, 'claims about testing frequency'],
  [/\b(?:very|extremely|super) important\b/i, 'hype'],
];

const marked = new Marked({ gfm: true });
const problems = [];
const fail = (message) => problems.push(message);

const pad2 = (n) => String(n).padStart(2, '0');
const chapterId = (book, n) => `b${book}-${pad2(n)}`;
const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const stripTags = (s) =>
  String(s)
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
const slugify = (s) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
    .replace(/-+$/, '');

/* ---------------------------------------------------------------- math */

const MATH_RE = /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)/g;
const OPEN = '\u27E6';
const CLOSE = '\u27E7';

function renderTex(src, displayMode, where) {
  try {
    return katex.renderToString(src, {
      displayMode,
      throwOnError: true,
      strict: 'ignore',
      output: 'htmlAndMathml',
      macros: { ...MACROS },
    });
  } catch (err) {
    fail(`${where}: KaTeX could not parse "${src.slice(0, 90)}": ${err.message}`);
    return `<code class="math-error">${escapeHtml(src)}</code>`;
  }
}

// Swap math for placeholders so markdown cannot touch it; restore after markdown renders.
function protectMath(src, where) {
  const store = [];
  const text = src.replace(MATH_RE, (whole, d1, d2, inline, offset, str) => {
    const display = inline === undefined;
    store.push(renderTex((display ? d1 ?? d2 : inline).trim(), display, where));
    const i = store.length - 1;
    if (!display) return `${OPEN}M${i}${CLOSE}`;
    const lineStart = str.lastIndexOf('\n', offset - 1) + 1;
    const before = str.slice(lineStart, offset);
    const indent = /^[ \t]*$/.test(before) ? before : '';
    return `\n\n${indent}${OPEN}D${i}${CLOSE}\n\n`;
  });
  return { text, store };
}

function restoreMath(html, store) {
  return html
    .replace(new RegExp(`<p>${OPEN}D(\\d+)${CLOSE}</p>`, 'g'), (_, i) => `<div class="math-display">${store[+i]}</div>`)
    .replace(new RegExp(`${OPEN}D(\\d+)${CLOSE}`, 'g'), (_, i) => `<div class="math-display">${store[+i]}</div>`)
    .replace(new RegExp(`${OPEN}M(\\d+)${CLOSE}`, 'g'), (_, i) => store[+i]);
}

const mdToHtml = (src, where) => {
  const { text, store } = protectMath(src, where);
  return restoreMath(marked.parse(text), store);
};
const mdToInline = (src, where) => {
  const { text, store } = protectMath(src, where);
  return restoreMath(marked.parseInline(text), store);
};
const texInline = (src) => renderTex(src, false, 'build.mjs');

/* ------------------------------------------------------------- parsing */

function parseFrontMatter(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) return { data: {}, body: raw, offset: 0 };
  const data = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (kv) data[kv[1]] = kv[2].trim();
  }
  return { data, body: raw.slice(m[0].length), offset: m[0].split('\n').length - 1 };
}

function lintProse(body, rel, offset) {
  const withoutMath = body.replace(MATH_RE, (m) => m.replace(/[^\n]/g, ' '));
  withoutMath.split('\n').forEach((line, i) => {
    for (const [re, why] of BANNED) {
      const hit = line.match(re);
      if (hit) fail(`${rel}:${i + 1 + offset}: "${hit[0].trim()}" (${why})`);
    }
  });
}

function extractBlocks(body, rel, offset) {
  const lines = body.split('\n');
  const out = [];
  const blocks = [];
  for (let i = 0; i < lines.length; i++) {
    const open = lines[i].match(/^:::(\w+)(?:[ \t]+(.*))?$/);
    if (!open) {
      if (lines[i].trim() === ':::') fail(`${rel}:${i + 1 + offset}: ":::" closes a block that was never opened`);
      out.push(lines[i]);
      continue;
    }
    const line = i + 1 + offset;
    const inner = [];
    for (i++; i < lines.length && lines[i].trim() !== ':::'; i++) {
      if (/^:::\w/.test(lines[i])) fail(`${rel}:${i + 1 + offset}: block opened inside :::${open[1]} from line ${line}`);
      inner.push(lines[i]);
    }
    if (i >= lines.length) fail(`${rel}:${line}: :::${open[1]} is never closed`);
    blocks.push({ type: open[1], title: (open[2] || '').trim(), body: inner.join('\n'), line });
    out.push('', `<div data-block="${blocks.length - 1}"></div>`, '');
  }
  return { md: out.join('\n'), blocks };
}

function addHeadingIds(html, rel) {
  const used = new Set();
  const toc = [];
  const sections = [];
  const out = html.replace(/<h([23])>([\s\S]*?)<\/h\1>/g, (_, level, inner) => {
    if (inner.includes('class="katex')) fail(`${rel}: heading contains math: "${stripTags(inner).slice(0, 60)}"`);
    const text = stripTags(inner);
    const base = `s-${slugify(text) || 'section'}`;
    let id = base;
    for (let k = 2; used.has(id); k++) id = `${base}-${k}`;
    used.add(id);
    if (level === '2') toc.push({ id, t: text });
    sections.push({ id, t: text, level: Number(level) });
    return `<h${level} id="${id}">${inner}</h${level}>`;
  });
  return { html: out, toc, sections };
}

function collectTerms(html) {
  const terms = [];
  const seen = new Set();
  let section = null;
  const re = /<h([23]) id="([^"]+)">([\s\S]*?)<\/h\1>|<strong>([\s\S]*?)<\/strong>/g;
  for (const m of html.matchAll(re)) {
    if (m[2]) {
      section = { id: m[2], t: stripTags(m[3]) };
      continue;
    }
    if (m[4].includes('katex')) continue;
    const t = stripTags(m[4]).replace(/[:.,;]$/, '');
    if (t.length < 3 || t.length > 60 || /^\d/.test(t)) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    terms.push({ t, section });
  }
  return terms;
}

const wrapTables = (html) =>
  html.replace(/<table>/g, '<div class="table-wrap"><table>').replace(/<\/table>/g, '</table></div>');

/* -------------------------------------------------------------- blocks */

function renderQuestion(block, where, number) {
  const lines = block.body.split('\n');
  const cut = lines.findIndex((l) => l.trim() === '---');
  const head = cut < 0 ? lines : lines.slice(0, cut);
  const explanation = cut < 0 ? '' : lines.slice(cut + 1).join('\n');
  const first = head.findIndex((l) => /^- \[[ xX]\] /.test(l));
  if (first < 0) {
    fail(`${where}: question has no "- [ ]" options`);
    return '';
  }
  const stem = head.slice(0, first).join('\n');
  const options = [];
  let answer = -1;
  for (const l of head.slice(first)) {
    const m = l.match(/^- \[([ xX])\] (.*)$/);
    if (m) {
      if (m[1] !== ' ') {
        if (answer >= 0) fail(`${where}: more than one option is marked [x]`);
        answer = options.length;
      }
      options.push(m[2]);
    } else if (l.trim() && options.length) {
      options[options.length - 1] += ` ${l.trim()}`;
    }
  }
  if (options.length !== 4) fail(`${where}: question needs 4 options, found ${options.length}`);
  if (answer < 0) fail(`${where}: no option is marked [x]`);
  if (!stem.trim()) fail(`${where}: question has no stem`);
  if (!explanation.trim()) fail(`${where}: question has no explanation after "---"`);
  const letters = 'ABCD';
  return (
    `<div class="q" id="q-${number}" data-answer="${answer}">` +
    `<p class="q-head">Question ${number}</p>` +
    `<div class="q-stem">${mdToHtml(stem, where)}</div>` +
    `<ol class="q-opts">${options
      .map(
        (o, i) =>
          `<li><button type="button" class="q-opt" data-i="${i}"><span class="q-letter">${letters[i]}</span><span class="q-text">${mdToInline(o, where)}</span></button></li>`,
      )
      .join('')}</ol>` +
    `<div class="q-feedback" hidden><p class="q-verdict" role="status"></p><div class="q-expl">${mdToHtml(explanation, where)}</div>` +
    `<button type="button" class="q-reset">Clear answer</button></div>` +
    `</div>`
  );
}

function renderBlock(block, ctx) {
  const where = `${ctx.rel}:${block.line}`;
  switch (block.type) {
    case 'formula': {
      const id = `f-${ctx.formulas.length + 1}`;
      const label = block.title ? mdToInline(block.title, where) : 'Formula';
      const body = mdToHtml(block.body, where);
      const text = (block.title || 'Formula').replace(/\\\(|\\\)/g, '').replace(/\\/g, '');
      ctx.formulas.push({ id, label, text, html: body });
      return `<figure class="formula" id="${id}"><figcaption class="formula-label">${label}</figcaption><div class="formula-body">${body}</div></figure>`;
    }
    case 'example':
      return (
        `<section class="example"><p class="block-label">Worked example</p>` +
        (block.title ? `<h4 class="example-title">${mdToInline(block.title, where)}</h4>` : '') +
        `<div class="example-body">${mdToHtml(block.body, where)}</div></section>`
      );
    case 'error':
      return `<aside class="pitfall"><p class="block-label">${escapeHtml(block.title || 'Common error')}</p><div class="block-body">${mdToHtml(block.body, where)}</div></aside>`;
    case 'aside':
      if (!block.title) fail(`${where}: :::aside needs a label`);
      return `<aside class="aside"><p class="block-label">${escapeHtml(block.title)}</p><div class="block-body">${mdToHtml(block.body, where)}</div></aside>`;
    case 'question':
      ctx.questions += 1;
      return renderQuestion(block, where, ctx.questions);
    default:
      fail(`${where}: unknown block type ":::${block.type}"`);
      return '';
  }
}

/* ------------------------------------------------------------ chapters */

function renderChapter(book, index) {
  const n = index + 1;
  const id = chapterId(book.n, n);
  const file = path.join(CONTENT_DIR, `b${book.n}`, `${pad2(n)}.md`);
  const meta = { id, book: book.n, n, title: book.chapters[index], available: false };
  if (!fs.existsSync(file)) return { meta, formulas: [], sections: [], terms: [] };

  const rel = path.relative(ROOT, file);
  const raw = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const { data: front, body, offset } = parseFrontMatter(raw);
  lintProse(raw, rel, 0);

  const { md, blocks } = extractBlocks(body, rel, offset);
  const ctx = { rel, formulas: [], questions: 0 };
  const blockHtml = blocks.map((b) => renderBlock(b, ctx));

  const headed = addHeadingIds(mdToHtml(md, rel), rel);
  const terms = collectTerms(headed.html);
  const html = wrapTables(headed.html.replace(/<div data-block="(\d+)"><\/div>/g, (_, i) => blockHtml[+i]));

  const words = body
    .replace(MATH_RE, ' x ')
    .split(/\s+/)
    .filter((w) => /[A-Za-z0-9]/.test(w)).length;

  Object.assign(meta, {
    available: true,
    lede: front.lede ? mdToInline(front.lede, rel) : '',
    minutes: Math.max(5, Math.round(words / 160)),
    toc: headed.toc,
    formulaCount: ctx.formulas.length,
    questionCount: ctx.questions,
  });
  return { meta, html, formulas: ctx.formulas, sections: headed.sections, terms };
}

/* ------------------------------------------------------------- figures */

function tailFigure() {
  const W = 400;
  const H = 172;
  const left = 16;
  const right = 16;
  const base = 132;
  const top = 18;
  const zCut = -2.326;
  const pdf = (z) => Math.exp((-z * z) / 2) / Math.sqrt(2 * Math.PI);
  const X = (z) => left + ((z + 4) / 8) * (W - left - right);
  const Y = (z) => base - (pdf(z) / pdf(0)) * (base - top);
  const points = (a, b, step) => {
    const p = [];
    for (let z = a; z < b; z += step) p.push(`${X(z).toFixed(1)},${Y(z).toFixed(1)}`);
    p.push(`${X(b).toFixed(1)},${Y(b).toFixed(1)}`);
    return p.join(' L');
  };
  const cut = X(zCut).toFixed(1);
  const mean = X(0).toFixed(1);
  const pctX = X(-3.35).toFixed(1);
  return `<svg class="tail-svg" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="tail-title">
<title id="tail-title">Normal distribution of daily returns with the worst 1 percent shaded, beyond 2.326 standard deviations below the mean</title>
<line class="tail-axis" x1="${left}" y1="${base}" x2="${W - right}" y2="${base}"/>
<path class="tail-area" d="M${X(-4).toFixed(1)},${base} L${points(-4, zCut, 0.02)} L${cut},${base} Z"/>
<path class="tail-curve" d="M${points(-4, 4, 0.05)}"/>
<line class="tail-cut" x1="${cut}" y1="${base}" x2="${cut}" y2="${base - 76}"/>
<text class="tail-label tail-strong" x="${cut}" y="${base - 84}" text-anchor="middle">99% VaR</text>
<line class="tail-tick" x1="${mean}" y1="${base}" x2="${mean}" y2="${base + 5}"/>
<text class="tail-label" x="${cut}" y="${base + 20}" text-anchor="middle">−2.326σ</text>
<text class="tail-label" x="${mean}" y="${base + 20}" text-anchor="middle">mean</text>
<text class="tail-label tail-strong" x="${pctX}" y="${base - 24}" text-anchor="middle">1%</text>
<line class="tail-leader" x1="${pctX}" y1="${base - 19}" x2="${X(-2.8).toFixed(1)}" y2="${base - 4}"/>
</svg>`;
}

/* --------------------------------------------------------------- pages */

function renderNav(metas) {
  const row = (m) =>
    m.available
      ? `<li><a href="#/${m.id}" data-ch="${m.id}"><span class="n">${pad2(m.n)}</span><span class="t">${escapeHtml(m.title)}</span><span class="tick" aria-hidden="true"></span></a></li>`
      : `<li><span class="is-pending"><span class="n">${pad2(m.n)}</span><span class="t">${escapeHtml(m.title)}</span></span></li>`;
  return `<ul class="nav-pages">
<li><a class="nav-page" href="#/" data-page="">Overview</a></li>
<li><a class="nav-page" href="#/formulas" data-page="formulas">Formula sheet</a></li>
<li><a class="nav-page" href="#/reference" data-page="reference">Normal table</a></li>
</ul>
${BOOKS.map(
  (b) => `<section class="nav-book" aria-label="Book ${b.n}: ${escapeHtml(b.title)}">
<p class="nav-book-head"><span class="nav-book-n">${b.n}</span><span class="nav-book-t">${escapeHtml(b.title)}</span><span class="nav-book-w">${b.weight}%</span></p>
<ol class="nav-ch">${metas
    .filter((m) => m.book === b.n)
    .map(row)
    .join('')}</ol>
</section>`,
).join('\n')}`;
}

function renderHome(metas) {
  const total = metas.length;
  const written = metas.filter((m) => m.available).length;
  const questions = metas.reduce((s, m) => s + (m.questionCount || 0), 0);
  const fact = (label, value) => `<div class="fact"><dt>${label}</dt><dd>${value}</dd></div>`;
  const row = (m) =>
    m.available
      ? `<li><a href="#/${m.id}" data-ch="${m.id}"><span class="n">${pad2(m.n)}</span><span class="t">${escapeHtml(m.title)}</span><span class="m"><span data-ch-score="${m.id}">${m.questionCount} questions</span> · ${m.minutes} min</span></a></li>`
      : `<li><span class="is-pending"><span class="n">${pad2(m.n)}</span><span class="t">${escapeHtml(m.title)}</span><span class="m">not written yet</span></span></li>`;
  return `<div class="home">
<section class="home-head">
<div class="home-intro">
<p class="kicker">GARP Financial Risk Manager · 2025 curriculum</p>
<h1 class="home-title">FRM Part I</h1>
<p class="home-lede">Explanations of the ${total} readings in the four Part I books. Formulas come with every symbol defined, methods come with worked examples that show each number, and each chapter ends with practice questions and full solutions.</p>
<p class="home-note">Independent study notes, not produced or endorsed by GARP. Studied chapters and answers are saved in this browser.</p>
</div>
<figure class="tail-fig">${tailFigure()}<figcaption>One-day 99% VaR with normal returns: a return more than 2.326 standard deviations below the mean happens on 1% of days.</figcaption></figure>
</section>
<dl class="facts">${fact('Exam', '100 questions')}${fact('Time', '4 hours')}${fact('Readings covered', written === total ? String(total) : `${written} of ${total}`)}${fact('Practice questions', String(questions))}</dl>
<section class="weights" aria-labelledby="weights-title">
<div class="section-head"><h2 class="section-title" id="weights-title">Exam weight by book</h2><p class="section-note">Bar width is each book's share of the exam; the green fill is the share of its chapters you have marked studied.</p></div>
<div class="weight-bar" style="grid-template-columns:${BOOKS.map((b) => `${b.weight}fr`).join(' ')}">
${BOOKS.map(
  (b) =>
    `<div class="weight-seg" data-book-progress="${b.n}" style="--p:0"><span class="weight-track"><span class="weight-fill"></span></span><span class="weight-pct">${b.weight}%</span><span class="weight-name">${escapeHtml(b.short)}</span><span class="weight-count" data-progress-label>0 of ${b.chapters.length} studied</span></div>`,
).join('\n')}
</div>
</section>
<div class="books">
${BOOKS.map(
  (b) => `<section class="book" aria-labelledby="book-${b.n}">
<header class="book-head"><span class="book-n" aria-hidden="true">${b.n}</span><h2 class="book-title" id="book-${b.n}">${escapeHtml(b.title)}</h2><span class="book-meta">${b.weight}% · ${b.chapters.length} readings</span></header>
<ol class="book-ch">${metas
    .filter((m) => m.book === b.n)
    .map(row)
    .join('')}</ol>
</section>`,
).join('\n')}
</div>
</div>`;
}

function renderFormulaSheet(chapters) {
  const count = chapters.reduce((s, c) => s + c.formulas.length, 0);
  let html = `<div class="page"><header class="page-head"><p class="kicker">Reference</p><h1 class="page-title">Formula sheet</h1><p class="page-lede">All ${count} formula boxes from the chapters, in book order. Each label links to the formula inside its chapter.</p></header>`;
  for (const b of BOOKS) {
    const withFormulas = chapters.filter((c) => c.meta.book === b.n && c.formulas.length);
    if (!withFormulas.length) continue;
    html += `<section class="sheet-book"><h2 class="sheet-book-title"><span class="book-n" aria-hidden="true">${b.n}</span>${escapeHtml(b.title)}</h2>`;
    for (const c of withFormulas) {
      html += `<section class="sheet-ch"><h3 class="sheet-ch-title"><a href="#/${c.meta.id}"><span class="n">${pad2(c.meta.n)}</span>${escapeHtml(c.meta.title)}</a></h3><div class="sheet-grid">`;
      html += c.formulas
        .map(
          (f) =>
            `<figure class="formula"><figcaption class="formula-label"><a href="#/${c.meta.id}/${f.id}">${f.label}</a></figcaption><div class="formula-body">${f.html}</div></figure>`,
        )
        .join('');
      html += '</div></section>';
    }
    html += '</section>';
  }
  return `${html}</div>`;
}

function renderReference() {
  const pdf = (z) => Math.exp((-z * z) / 2) / Math.sqrt(2 * Math.PI);
  const cdf = (z) => {
    const steps = 4000;
    const h = z / steps;
    let s = pdf(0) + pdf(z);
    for (let i = 1; i < steps; i++) s += (i % 2 ? 4 : 2) * pdf(i * h);
    return 0.5 + (s * h) / 3;
  };
  const inverse = (p) => {
    let lo = -8;
    let hi = 8;
    for (let k = 0; k < 90; k++) {
      const mid = (lo + hi) / 2;
      if (cdf(mid) < p) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
  };
  const critical = [0.9, 0.95, 0.975, 0.99, 0.995, 0.999]
    .map(
      (c) =>
        `<tr><td>${+(c * 100).toFixed(1)}%</td><td>${(1 - c).toFixed(3).replace(/0+$/, '')}</td><td>${inverse(c).toFixed(3)}</td><td>${inverse(1 - (1 - c) / 2).toFixed(3)}</td></tr>`,
    )
    .join('');
  const horizons = [
    ['1 day', 1],
    ['1 week', 5],
    ['2 weeks', 10],
    ['1 month', 21],
    ['1 quarter', 63],
    ['1 year (250 days)', 250],
    ['1 year (252 days)', 252],
  ]
    .map(([label, d]) => `<tr><td>${label}</td><td>${d}</td><td>${Math.sqrt(d).toFixed(3)}</td></tr>`)
    .join('');
  let rows = '';
  for (let r = 0; r <= 34; r++) {
    const z = r / 10;
    rows += `<tr><th scope="row">${z.toFixed(1)}</th>${Array.from({ length: 10 }, (_, c) => `<td>${cdf(z + c / 100).toFixed(4)}</td>`).join('')}</tr>`;
  }
  const head = Array.from({ length: 10 }, (_, c) => `<th scope="col">.0${c}</th>`).join('');
  return `<div class="page">
<header class="page-head"><p class="kicker">Reference</p><h1 class="page-title">Standard normal table</h1>
<p class="page-lede">${texInline('\\Phi(z)=P(Z\\le z)')} is the probability that a standard normal variable ${texInline('Z')} is at most ${texInline('z')}. Read the row for the first decimal and the column for the second: row 1.6, column .04 gives ${texInline('\\Phi(1.64)=0.9495')}. For negative values use ${texInline('\\Phi(-z)=1-\\Phi(z)')}.</p></header>
<section class="ref-section" aria-labelledby="ref-crit"><h2 class="section-title" id="ref-crit">Critical values</h2>
<div class="table-wrap"><table class="crit-table"><thead><tr><th>Confidence</th><th>Tail probability</th><th>One-tailed z</th><th>Two-tailed z</th></tr></thead><tbody>${critical}</tbody></table></div>
<p class="ref-note">VaR puts the whole tail probability on the loss side, so it uses the one-tailed value: 95% VaR is 1.645 standard deviations. A two-sided confidence interval or hypothesis test splits the tail probability between both sides, so a 95% interval uses 1.960.</p></section>
<section class="ref-section" aria-labelledby="ref-time"><h2 class="section-title" id="ref-time">Square-root-of-time factors</h2>
<div class="table-wrap"><table class="crit-table"><thead><tr><th>Horizon</th><th>Trading days T</th><th>${texInline('\\sqrt{T}')}</th></tr></thead><tbody>${horizons}</tbody></table></div>
<p class="ref-note">With independent, identically distributed returns and a zero mean, a T-day standard deviation or VaR equals the one-day figure multiplied by ${texInline('\\sqrt{T}')}. A one-day VaR of 1.0 million becomes 3.162 million over 10 days.</p></section>
<section class="ref-section" aria-labelledby="ref-table"><h2 class="section-title" id="ref-table">Cumulative probabilities</h2>
<div class="ztable-wrap"><table class="ztable"><thead><tr><th scope="col">z</th>${head}</tr></thead><tbody>${rows}</tbody></table></div></section>
</div>`;
}

function renderBody(metas) {
  return `<a class="skip" href="#view">Skip to content</a>
<header class="topbar">
<button type="button" class="icon-btn menu-btn" id="menu-btn" aria-controls="nav" aria-expanded="false"><span class="menu-icon" aria-hidden="true"></span><span class="sr-only">Chapters</span></button>
<a class="brand" href="#/"><span class="brand-mark">FRM Part I</span><span class="brand-sub">Study notes</span></a>
<div class="search" role="search">
<label class="sr-only" for="search">Search chapters, sections, formulas and terms</label>
<input id="search" type="search" placeholder="Search terms, formulas, chapters" autocomplete="off" spellcheck="false" role="combobox" aria-controls="search-results" aria-expanded="false" aria-autocomplete="list">
<kbd class="search-kbd" aria-hidden="true">/</kbd>
<div class="search-results" id="search-results" role="listbox" aria-label="Search results" hidden></div>
</div>
<button type="button" class="icon-btn theme-btn" id="theme-btn">Auto</button>
</header>
<div class="layout">
<nav class="nav" id="nav" aria-label="Chapters">${renderNav(metas)}</nav>
<div class="scrim" id="scrim" hidden></div>
<main class="main">
<div class="view-wrap is-wide" id="view-wrap">
<div class="view" id="view" tabindex="-1">${renderHome(metas)}</div>
<aside class="toc" id="toc" aria-label="On this page" hidden></aside>
</div>
</main>
</div>
<script src="assets/manifest.js"></script>
<script src="assets/app.js"></script>`;
}

function pageShell(body, { artifact }) {
  const head = [
    `<title>${SITE_NAME}</title>`,
    '<meta name="description" content="Explanations, formulas, worked examples and practice questions for the readings of the FRM Part I exam.">',
    '<link rel="preconnect" href="https://fonts.googleapis.com">',
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
    `<link rel="stylesheet" href="${escapeHtml(FONTS_URL)}">`,
    '<link rel="stylesheet" href="assets/katex/katex.min.css">',
    '<link rel="stylesheet" href="assets/style.css">',
    '<script>try{var t=localStorage.getItem("frm-theme");if(t==="light"||t==="dark"){document.documentElement.setAttribute("data-theme",t);document.documentElement.setAttribute("data-frm-theme",t)}}catch(e){}</script>',
  ].join('\n');
  if (artifact) return `${head}\n${body}\n`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${head}
</head>
<body>
${body}
</body>
</html>
`;
}

function buildSearch(chapters) {
  const entries = [
    ['Page', 'Formula sheet', 'Every formula box, by chapter', '#/formulas'],
    ['Page', 'Standard normal table', 'Cumulative probabilities, critical values, square-root-of-time factors', '#/reference'],
  ];
  for (const c of chapters) {
    const { id, book, n, title, available } = c.meta;
    if (!available) continue;
    const where = `Book ${book}, Ch. ${n} · ${title}`;
    entries.push(['Chapter', title, `Book ${book} · ${BOOKS[book - 1].title}`, `#/${id}`]);
    for (const s of c.sections) entries.push(['Section', s.t, where, `#/${id}/${s.id}`]);
    for (const f of c.formulas) entries.push(['Formula', f.text, where, `#/${id}/${f.id}`]);
    for (const t of c.terms)
      entries.push(['Term', t.t, t.section ? `${where} › ${t.section.t}` : where, `#/${id}${t.section ? `/${t.section.id}` : ''}`]);
  }
  return entries;
}

/* ---------------------------------------------------------------- main */

function main() {
  const chapters = [];
  for (const book of BOOKS) book.chapters.forEach((_, i) => chapters.push(renderChapter(book, i)));
  const metas = chapters.map((c) => c.meta);

  const formulaSheet = renderFormulaSheet(chapters);
  const reference = renderReference();
  const body = renderBody(metas);

  if (problems.length) {
    console.error(`\nBuild stopped: ${problems.length} problem${problems.length === 1 ? '' : 's'}\n`);
    for (const p of problems) console.error(`  ${p}`);
    console.error('');
    process.exit(1);
  }

  fs.rmSync(SITE_DIR, { recursive: true, force: true });
  fs.mkdirSync(path.join(SITE_DIR, 'assets', 'katex', 'fonts'), { recursive: true });
  fs.mkdirSync(path.join(SITE_DIR, 'data'), { recursive: true });
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

  const katexDist = path.join(path.dirname(require.resolve('katex/package.json')), 'dist');
  const katexCss = fs
    .readFileSync(path.join(katexDist, 'katex.min.css'), 'utf8')
    .replace(/,url\(fonts\/[^)]+?\.woff\) format\("woff"\)/g, '')
    .replace(/,url\(fonts\/[^)]+?\.ttf\) format\("truetype"\)/g, '');
  fs.writeFileSync(path.join(SITE_DIR, 'assets', 'katex', 'katex.min.css'), katexCss);
  for (const f of fs.readdirSync(path.join(katexDist, 'fonts'))) {
    if (f.endsWith('.woff2')) fs.copyFileSync(path.join(katexDist, 'fonts', f), path.join(SITE_DIR, 'assets', 'katex', 'fonts', f));
  }
  fs.copyFileSync(path.join(SRC_DIR, 'style.css'), path.join(SITE_DIR, 'assets', 'style.css'));
  fs.copyFileSync(path.join(SRC_DIR, 'app.js'), path.join(SITE_DIR, 'assets', 'app.js'));

  const writeData = (id, html) =>
    fs.writeFileSync(path.join(SITE_DIR, 'data', `${id}.js`), `FRM.receive(${JSON.stringify({ id, html })});\n`);
  for (const c of chapters) if (c.meta.available) writeData(c.meta.id, c.html);
  writeData('formulas', formulaSheet);
  writeData('reference', reference);

  const manifest = {
    books: BOOKS.map((b) => ({
      n: b.n,
      title: b.title,
      short: b.short,
      weight: b.weight,
      chapters: b.chapters.map((_, i) => chapterId(b.n, i + 1)),
    })),
    order: metas.map((m) => m.id),
    chapters: Object.fromEntries(
      metas.map((m) => [
        m.id,
        {
          id: m.id,
          book: m.book,
          n: m.n,
          title: m.title,
          available: m.available,
          lede: m.lede || '',
          minutes: m.minutes || 0,
          toc: m.toc || [],
          q: m.questionCount || 0,
          f: m.formulaCount || 0,
        },
      ]),
    ),
    search: buildSearch(chapters),
  };
  fs.writeFileSync(path.join(SITE_DIR, 'assets', 'manifest.js'), `window.FRM_MANIFEST = ${JSON.stringify(manifest)};\n`);

  fs.writeFileSync(path.join(SITE_DIR, 'index.html'), pageShell(body, { artifact: false }));
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'index.html'), pageShell(body, { artifact: true }));

  const written = metas.filter((m) => m.available);
  const questions = written.reduce((s, m) => s + m.questionCount, 0);
  const formulas = written.reduce((s, m) => s + m.formulaCount, 0);
  console.log(`Built ${written.length}/${metas.length} chapters, ${formulas} formulas, ${questions} questions -> site/index.html`);
}

main();
