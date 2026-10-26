
/* Petal Reader app */
(function () {
  'use strict';
  const P = window.PetalCore;
  const $ = (s) => document.querySelector(s);
  const editor = $('#editor'), wrap = $('#pageWrap');
  const EMBED = (window.PETAL_EMBED && typeof window.PETAL_EMBED.html === 'string') ? window.PETAL_EMBED : null;
  const DOC_KEY = 'petal.doc';
  const POS_KEY = EMBED ? 'petal.pos:' + (EMBED.source || EMBED.title || 'embed') : 'petal.pos';
  const ui = Object.assign({ follow: true, readCode: true, readUrls: false, readEmoji: false, page: 'night', allLang: false }, P.store.get('petal.ui', {}));
  const saveUi = () => P.store.set('petal.ui', ui);
  let docTitle = 'Untitled';

  P.injectIcons(document);

  /* ---------------- Markdown → HTML (small and dependency-free) ---------------- */
  const MD = (function () {
    const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const TAG = /^(<\/?[A-Za-z][\w-]*(\s[^<>]*)?\/?>|<!--[\s\S]*?-->)/;
    const safeUrl = (u) => /^\s*(javascript|vbscript|data):/i.test(u) ? '#' : u;
    function escText(s) {
      let out = '';
      for (let i = 0; i < s.length;) {
        const c = s[i];
        if (c === '<') { const m = TAG.exec(s.slice(i)); if (m) { out += m[0]; i += m[0].length; } else { out += '&lt;'; i++; } continue; }
        if (c === '>') { out += '&gt;'; i++; continue; }
        if (c === '&') { const m = /^&(#\d+|#x[\da-f]+|[a-z]\w*);/i.exec(s.slice(i, i + 12)); if (m) { out += m[0]; i += m[0].length; } else { out += '&amp;'; i++; } continue; }
        out += c; i++;
      }
      return out;
    }
    function inline(src) {
      const keep = [];
      const stash = (html) => { keep.push(html); return '\u0001' + (keep.length - 1) + '\u0002'; };
      let s = src;
      s = s.replace(/(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/g, (_, t, c) => stash('<code>' + esc(c.replace(/^ ([\s\S]*) $/, '$1')) + '</code>'));
      s = s.replace(/\\([\\`*_{}\[\]()#+\-.!|~<>])/g, (_, ch) => stash(esc(ch)));
      s = s.replace(/<((?:https?|mailto):[^\s<>]+)>/g, (_, u) => stash('<a href="' + esc(u) + '">' + esc(u) + '</a>'));
      s = s.replace(/!\[([^\]]*)\]\(\s*<?([^)\s>]*)>?(?:\s+["'(][^)]*["')])?\s*\)/g, (_, alt) => stash('<span class="md-img">[Image' + (alt ? ': ' + esc(alt) : '') + ']</span>'));
      s = s.replace(/\[([^\]]+)\]\(\s*<?([^)\s>]*)>?(?:\s+["'(][^)]*["')])?\s*\)/g, (_, t, u) => stash('<a href="' + esc(safeUrl(u)) + '">') + t + stash('</a>'));
      s = escText(s);
      s = s.replace(/\*\*(?=\S)([\s\S]*?\S)\*\*/g, '<strong>$1</strong>');
      s = s.replace(/(^|[^\w])__(?=\S)([\s\S]*?\S)__(?!\w)/g, '$1<strong>$2</strong>');
      s = s.replace(/\*(?=[^\s*])([\s\S]*?[^\s*])\*/g, '<em>$1</em>');
      s = s.replace(/(^|[^\w])_(?=[^\s_])([\s\S]*?[^\s_])_(?!\w)/g, '$1<em>$2</em>');
      s = s.replace(/~~(?=\S)([\s\S]*?\S)~~/g, '<del>$1</del>');
      s = s.replace(/==(?=\S)([\s\S]*?\S)==/g, '<mark>$1</mark>');
      s = s.replace(/(^|[\s(])((?:https?:\/\/|www\.)[^\s<]*[^\s<).,;:!?'"])/g, (_, pre, u) => pre + '<a href="' + (u.startsWith('www.') ? 'https://' + u : u) + '">' + u + '</a>');
      s = s.replace(/(?: {2,}|\\)\n/g, '<br>');
      return s.replace(/\u0001(\d+)\u0002/g, (_, i) => keep[+i]);
    }
    const RE = {
      fence: /^ {0,3}(`{3,}|~{3,})\s*([^`\s]*)/,
      atx: /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?(?:[ \t]+#+)?[ \t]*$/,
      hr: /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/,
      quote: /^ {0,3}> ?/,
      list: /^( *)([-*+]|\d{1,9}[.)])(?:[ \t]+|$)/,
      tableSep: /^ *\|? *:?-+:? *(\| *:?-+:? *)*\|? *$/,
      setext1: /^ {0,3}=+[ \t]*$/,
      setext2: /^ {0,3}-+[ \t]*$/,
      html: /^ {0,3}<(\/?)(div|details|summary|section|article|table|thead|tbody|tr|td|th|p|ul|ol|li|h[1-6]|blockquote|pre|figure|figcaption|center|aside|nav|header|footer|dl|dt|dd|hr|br|picture|!--)/i
    };
    const indentOf = (l) => l.length - l.replace(/^ +/, '').length;
    const startsBlock = (l) => RE.fence.test(l) || RE.atx.test(l) || RE.hr.test(l) || RE.quote.test(l) || RE.list.test(l) || RE.html.test(l);
    function cells(l) {
      let t = l.trim();
      if (t.startsWith('|')) t = t.slice(1);
      if (t.endsWith('|') && !t.endsWith('\\|')) t = t.slice(0, -1);
      return t.split(/(?<!\\)\|/).map((c) => c.trim());
    }
    function list(lines, i) {
      const n = lines.length, m0 = RE.list.exec(lines[i]);
      const baseInd = m0[1].length, ordered = /\d/.test(m0[2]), start = ordered ? parseInt(m0[2], 10) : 1;
      const items = [];
      while (i < n) {
        const m = RE.list.exec(lines[i]);
        if (!m || m[1].length !== baseInd || /\d/.test(m[2]) !== ordered) break;
        const contentInd = m[0].length, need = Math.min(contentInd, baseInd + 2);
        const body = [lines[i].slice(m[0].length)];
        let sawBlank = false;
        i++;
        while (i < n) {
          const l = lines[i];
          if (!l.trim()) {
            let j = i + 1;
            while (j < n && !lines[j].trim()) j++;
            if (j < n && indentOf(lines[j]) >= need) { for (; i < j; i++) body.push(''); sawBlank = true; continue; }
            break;
          }
          const ind = indentOf(l);
          if (ind >= need) { body.push(l.slice(Math.min(ind, contentInd))); i++; continue; }
          if (sawBlank || RE.list.test(l) || startsBlock(l)) break;
          body.push(l.trim()); i++;
        }
        items.push(body);
      }
      let html = '';
      for (const body of items) {
        let task = '';
        const t = /^\[([ xX])\][ \t]+/.exec(body[0] || '');
        if (t) { task = t[1] === ' ' ? '☐ ' : '☑ '; body[0] = body[0].slice(t[0].length); }
        let inner = blocks(body);
        if (!body.includes('')) inner = inner.replace(/^<p>([\s\S]*?)<\/p>\n?/, '$1');
        html += '<li>' + (task ? '<span class="md-task">' + task + '</span>' : '') + inner + '</li>\n';
      }
      const tag = ordered ? 'ol' : 'ul';
      return { html: '<' + tag + (ordered && start !== 1 ? ' start="' + start + '"' : '') + '>\n' + html + '</' + tag + '>\n', next: i };
    }
    function blocks(lines) {
      let out = '', i = 0, m;
      const n = lines.length;
      while (i < n) {
        const line = lines[i];
        if (!line.trim()) { i++; continue; }
        if ((m = RE.fence.exec(line))) {
          const close = new RegExp('^ {0,3}' + (m[1][0] === '`' ? '`' : '~') + '{' + m[1].length + ',}\\s*$');
          const buf = [];
          i++;
          while (i < n && !close.test(lines[i])) buf.push(lines[i++]);
          i++;
          out += '<pre><code' + (m[2] ? ' class="language-' + esc(m[2]) + '"' : '') + '>' + esc(buf.join('\n')) + '</code></pre>\n';
          continue;
        }
        if (/^ {4,}\S/.test(line)) {
          const buf = [];
          while (i < n && (/^ {4}/.test(lines[i]) || (!lines[i].trim() && i + 1 < n && /^ {4}/.test(lines[i + 1])))) buf.push(lines[i++].slice(4));
          out += '<pre><code>' + esc(buf.join('\n')) + '</code></pre>\n';
          continue;
        }
        if ((m = RE.atx.exec(line))) { const lv = m[1].length; out += '<h' + lv + '>' + inline(m[2] || '') + '</h' + lv + '>\n'; i++; continue; }
        if (RE.hr.test(line)) { out += '<hr>\n'; i++; continue; }
        if (RE.quote.test(line)) {
          const buf = [];
          while (i < n && lines[i].trim() && (RE.quote.test(lines[i]) || (buf.length && !startsBlock(lines[i])))) buf.push(lines[i++].replace(RE.quote, ''));
          out += '<blockquote>\n' + blocks(buf) + '</blockquote>\n';
          continue;
        }
        if (line.includes('|') && i + 1 < n && lines[i + 1].includes('-') && RE.tableSep.test(lines[i + 1])) {
          const head = cells(line);
          const al = cells(lines[i + 1]).map((c) => /^:-+:$/.test(c) ? 'center' : /-+:$/.test(c) ? 'right' : '');
          i += 2;
          const rows = [];
          while (i < n && lines[i].trim() && lines[i].includes('|')) rows.push(cells(lines[i++]));
          const cell = (tag, c, j) => '<' + tag + (al[j] ? ' style="text-align:' + al[j] + '"' : '') + '>' + inline(c) + '</' + tag + '>';
          out += '<table><thead><tr>' + head.map((c, j) => cell('th', c, j)).join('') + '</tr></thead><tbody>' +
            rows.map((r) => '<tr>' + head.map((_, j) => cell('td', r[j] || '', j)).join('') + '</tr>').join('') + '</tbody></table>\n';
          continue;
        }
        if (RE.list.test(line)) { const r = list(lines, i); out += r.html; i = r.next; continue; }
        if (RE.html.test(line)) { const buf = []; while (i < n && lines[i].trim()) buf.push(lines[i++]); out += buf.join('\n') + '\n'; continue; }
        const buf = [line];
        let h = 0;
        i++;
        while (i < n && lines[i].trim()) {
          if (RE.setext1.test(lines[i])) { h = 1; i++; break; }
          if (RE.setext2.test(lines[i])) { h = 2; i++; break; }
          if (startsBlock(lines[i])) break;
          buf.push(lines[i++]);
        }
        const text = buf.map((l) => l.replace(/^ {1,3}/, '')).join('\n');
        out += h ? '<h' + h + '>' + inline(text) + '</h' + h + '>\n' : '<p>' + inline(text) + '</p>\n';
      }
      return out;
    }
    function render(src) {
      src = String(src || '').replace(/^﻿/, '').replace(/\r\n?/g, '\n').replace(/\t/g, '    ');
      const fm = /^---\n[\s\S]*?\n(---|\.\.\.)\n/.exec(src);
      if (fm) src = src.slice(fm[0].length);
      return blocks(src.split('\n'));
    }
    function looksLike(text) {
      let score = 0;
      if (/^#{1,6} \S/m.test(text)) score += 2;
      if (/^\s*[-*+] \S/m.test(text)) score++;
      if (/^\s*\d+\. \S/m.test(text)) score++;
      if (/\*\*[^*\n]+\*\*/.test(text)) score++;
      if (/^```/m.test(text)) score++;
      if (/\[[^\]]+\]\([^)]+\)/.test(text)) score++;
      return score >= 2;
    }
    return { render, looksLike, esc };
  })();

  /* ---------------- HTML safety for opened / pasted content ---------------- */
  function sanitize(html) {
    const doc = new DOMParser().parseFromString('<!doctype html><body>' + html, 'text/html');
    doc.querySelectorAll('script,style,iframe,frame,frameset,object,embed,link,meta,base,form,input,button,textarea,select,noscript,template').forEach((e) => e.remove());
    doc.body.querySelectorAll('*').forEach((e) => {
      for (const a of Array.from(e.attributes)) {
        const n = a.name.toLowerCase();
        if (n.startsWith('on') || n === 'id' || n === 'contenteditable' || n === 'srcdoc' || (n === 'class' && !/^language-/.test(a.value))) e.removeAttribute(a.name);
        else if (/^(href|src|xlink:href|action|formaction|poster)$/.test(n) && /^\s*(javascript|vbscript|data:text\/html)/i.test(a.value)) e.removeAttribute(a.name);
      }
      if (e.tagName === 'A') { e.setAttribute('target', '_blank'); e.setAttribute('rel', 'noopener noreferrer'); }
    });
    return doc.body.innerHTML;
  }
  const textToHtml = (t) => String(t).replace(/\r\n?/g, '\n').split(/\n{2,}/).filter((p) => p.trim()).map((p) => '<p>' + MD.esc(p).replace(/\n/g, '<br>') + '</p>').join('\n');

  /* ---------------- Reader ---------------- */
  const reader = new P.Reader({
    root: editor,
    scrollEl: wrap,
    follow: ui.follow,
    indexOptions: () => ({ skipSelector: ui.readCode ? '' : 'pre', readUrls: ui.readUrls, readEmoji: ui.readEmoji })
  });
  const track = new P.Track($('#track'), reader);

  /* ---------------- Elements ---------------- */
  const btnPlay = $('#btnPlay'), curTime = $('#curTime'), durTime = $('#durTime'), estTotal = $('#estTotal');
  const statTotal = $('#statTotal'), statLeft = $('#statLeft'), statWords = $('#statWords');
  const chapterNow = $('#chapterNow'), chapterList = $('#chapterList'), chapterEmpty = $('#chapterEmpty'), chapterCount = $('#chapterCount');
  const voiceSelect = $('#voiceSelect'), voiceTier = $('#voiceTier'), voiceNet = $('#voiceNet'), voiceTip = $('#voiceTip'), voiceNow = $('#voiceNow');
  const rateInput = $('#rate'), rateVal = $('#rateVal'), speedPill = $('#speedPill');
  const toastEl = $('#toast');

  /* ---------------- Toast ---------------- */
  let toastTimer = 0;
  function toast(msg, ms) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), ms || 4200);
  }
  reader.on('toast', (m) => toast(m, 6000));

  /* ---------------- Time display ---------------- */
  let raf = 0;
  function paintTime() {
    const total = reader.totalTime();
    const pv = track.previewTime;
    const cur = pv != null ? pv : reader.currentTime();
    curTime.textContent = P.fmtTime(cur);
    durTime.textContent = P.fmtTime(total);
    estTotal.textContent = P.fmtTime(total);
    statTotal.textContent = P.fmtTime(total);
    statLeft.textContent = P.fmtTime(Math.max(0, total - cur));
    track.update(cur, total);
  }
  function loop() {
    raf = 0;
    paintTime();
    if (reader.state === 'playing' || track.previewTime != null) raf = requestAnimationFrame(loop);
  }
  function kick() { if (!raf) raf = requestAnimationFrame(loop); }
  reader.on('preview', kick);
  reader.on('timing', () => { paintTime(); renderChapters(); });

  /* ---------------- Chapters ---------------- */
  let activeChapter = null;
  function renderChapters() {
    const ix = reader.index;
    const chs = ix ? ix.chapters : [];
    chapterList.textContent = '';
    chapterEmpty.hidden = chs.length > 0;
    chapterCount.textContent = chs.length ? String(chs.filter((c) => !c.isTitle).length || chs.length) : '';
    for (const c of chs) {
      const li = document.createElement('li');
      li.className = c.isTitle ? 'title' : 'd' + Math.min(c.depth, 3);
      const b = document.createElement('button');
      b.type = 'button';
      b.title = 'Go to “' + c.title + '”';
      if (c.num && !c.ownNum) { const s = document.createElement('span'); s.className = 'num'; s.textContent = c.num; b.appendChild(s); }
      const t = document.createElement('span'); t.className = 'ttl'; t.textContent = c.title || 'Untitled section'; b.appendChild(t);
      const at = document.createElement('span'); at.className = 'at'; at.textContent = P.fmtTime(reader.timeOfWord(c.word)); b.appendChild(at);
      b.addEventListener('click', () => { reader.jumpToWord(c.word, false); closeSheet(); });
      b.addEventListener('dblclick', () => reader.jumpToWord(c.word, true));
      li.appendChild(b);
      c._li = li;
      chapterList.appendChild(li);
    }
    activeChapter = null;
    updateChapterNow(reader.pos);
  }
  function updateChapterNow(i) {
    const c = reader.chapterAt(i);
    if (c !== activeChapter) {
      if (activeChapter && activeChapter._li) activeChapter._li.classList.remove('active');
      if (c && c._li) c._li.classList.add('active');
      activeChapter = c;
    }
    chapterNow.textContent = '';
    if (c) {
      if (c.num && !c.ownNum) { const b = document.createElement('b'); b.textContent = c.num + ' '; chapterNow.appendChild(b); }
      chapterNow.appendChild(document.createTextNode(c.title));
    } else {
      chapterNow.textContent = reader.state === 'playing' ? 'Reading' : (reader.index && reader.index.words.length ? 'Ready when you are' : 'Paste some text to begin');
    }
  }

  /* ---------------- Reader events ---------------- */
  let lastPosSave = 0;
  function savePos(force) {
    if (!force && Date.now() - lastPosSave < 1500) return;
    lastPosSave = Date.now();
    P.store.set(POS_KEY, reader.pos);
  }
  reader.on('word', (i) => { updateChapterNow(i); savePos(false); if (reader.state !== 'playing') paintTime(); });
  reader.on('scrub', (i) => updateChapterNow(i));
  reader.on('index', () => {
    statWords.textContent = reader.index.wordCount.toLocaleString();
    renderChapters();
    paintTime();
  });
  let wakeLock = null;
  reader.on('state', (s) => {
    const playing = s === 'playing';
    btnPlay.innerHTML = P.ICON[playing ? 'pause' : 'play'];
    btnPlay.title = playing ? 'Pause (Ctrl+Enter)' : 'Play (Ctrl+Enter)';
    btnPlay.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    btnPlay.classList.toggle('playing', playing);
    document.title = (playing ? '▶ ' : '') + docTitle + ' · Petal Reader';
    if (!playing) savePos(true);
    updateChapterNow(reader.pos);
    kick();
    try {
      if (playing && navigator.wakeLock && !wakeLock) navigator.wakeLock.request('screen').then((l) => { wakeLock = l; l.addEventListener('release', () => { wakeLock = null; }); }).catch(() => {});
      else if (!playing && wakeLock) { wakeLock.release(); wakeLock = null; }
    } catch (e) { /* ignore */ }
  });
  reader.on('ended', () => toast('Finished reading 🌸'));

  /* ---------------- Voices UI ---------------- */
  function renderVoices() {
    P.fillVoiceSelect(voiceSelect, reader, ui.allLang);
    const v = reader.voiceInfo;
    const list = reader.voices.list;
    if (v) {
      voiceTier.textContent = (v.q >= 80 ? '✨ ' : '') + v.tier;
      voiceTier.className = 'badge' + (v.q >= 80 ? ' natural' : '');
      voiceNet.textContent = v.online ? 'Online' : 'Offline';
      voiceNet.className = 'badge ' + (v.online ? 'net' : 'local');
      voiceNow.textContent = '🎙 ' + v.short + (v.online ? ' (online)' : '');
    } else {
      voiceTier.textContent = reader.supported ? 'Loading…' : 'No speech';
      voiceTier.className = 'badge'; voiceNet.textContent = ''; voiceNet.className = 'badge';
      voiceNow.textContent = '';
    }
    const natural = list.some((x) => x.sameLang && x.q >= 80 && !x.novelty);
    const naturalUsable = list.some((x) => x.sameLang && x.q >= 80 && reader.voices.usable(x, reader.offlineOnly));
    let tip = '';
    if (!reader.supported) tip = 'This browser has no speech engine. Try Microsoft Edge or Google Chrome.';
    else if (!list.length) tip = 'Looking for voices… If none appear, your browser may not have speech set up.';
    else if (!natural && !P.isEdge()) tip = '<b>Want a more human voice?</b> Open Petal Reader in <b>Microsoft Edge</b>. It adds free “Natural” voices (they need internet). The desktop shortcut already uses Edge.';
    else if (!natural) tip = 'Edge’s Natural voices appear when you’re online. Offline, the voices installed on your computer are used.';
    else if (!naturalUsable && navigator.onLine === false) tip = 'You’re offline, so the Natural voices are paused. Offline voices still work, and Natural ones come back when you reconnect.';
    else if (v && v.online) tip = 'Natural voices are streamed while you’re online. If the connection drops, Petal Reader switches to an offline voice by itself.';
    voiceTip.innerHTML = tip;
  }
  reader.on('voices', renderVoices);
  voiceSelect.addEventListener('change', () => { if (voiceSelect.value) reader.setVoice(voiceSelect.value); });
  $('#btnTest').addEventListener('click', () => reader.sample());
  const optOffline = $('#optOffline'), optAllLang = $('#optAllLang');
  optOffline.checked = reader.offlineOnly;
  optAllLang.checked = !!ui.allLang;
  optOffline.addEventListener('change', () => reader.setOfflineOnly(optOffline.checked));
  optAllLang.addEventListener('change', () => { ui.allLang = optAllLang.checked; saveUi(); renderVoices(); });

  /* ---------------- Speed ---------------- */
  const PRESETS = [0.75, 1, 1.25, 1.5, 1.75, 2];
  function renderRate() {
    const r = reader.rate;
    rateInput.value = String(r);
    rateVal.textContent = r.toFixed(2) + '×';
    speedPill.textContent = r.toFixed(2).replace(/\.?0+$/, '') + '×';
    document.querySelectorAll('.preset').forEach((b) => b.classList.toggle('on', Math.abs(+b.dataset.rate - r) < 0.001));
    paintTime(); renderChapters();
  }
  rateInput.addEventListener('input', () => { reader.setRate(+rateInput.value); renderRate(); });
  document.querySelectorAll('.preset').forEach((b) => b.addEventListener('click', () => { reader.setRate(+b.dataset.rate); renderRate(); }));
  speedPill.addEventListener('click', () => {
    const r = reader.rate, next = PRESETS.find((p) => p > r + 0.001) || 0.75;
    reader.setRate(next); renderRate(); toast('Speed ' + next + '×', 1400);
  });

  /* ---------------- Transport buttons ---------------- */
  btnPlay.addEventListener('click', () => reader.toggle());
  $('#btnStop').addEventListener('click', () => reader.stop());
  $('#btnBack').addEventListener('click', () => reader.skip(-30));
  $('#btnFwd').addEventListener('click', () => reader.skip(30));

  /* ---------------- Double-click to jump ---------------- */
  editor.addEventListener('dblclick', (e) => {
    const i = reader.wordFromEvent(e);
    if (i < 0) return;
    reader.jumpToWord(i, true);
    const sel = getSelection();
    if (sel && sel.rangeCount) { try { sel.collapseToStart(); } catch (err) { /* ignore */ } }
  });

  /* ---------------- Reading options ---------------- */
  function bindOpt(id, key, after) {
    const box = $(id);
    box.checked = !!ui[key];
    box.addEventListener('change', () => { ui[key] = box.checked; saveUi(); if (after) after(); });
  }
  const reindex = () => { reader.invalidate(); if (reader.state === 'playing') reader.play(reader.pos); else reader.refresh(); };
  bindOpt('#optFollow', 'follow', () => reader.setFollow(ui.follow));
  bindOpt('#optCode', 'readCode', reindex);
  bindOpt('#optUrls', 'readUrls', reindex);
  bindOpt('#optEmoji', 'readEmoji', reindex);

  /* ---------------- Page tone ---------------- */
  function renderPage() {
    const paper = ui.page === 'paper';
    wrap.classList.toggle('paper', paper);
    wrap.classList.toggle('night', !paper);
    $('#pageLbl').textContent = paper ? 'Paper page' : 'Night page';
    const b = $('#btnPage');
    const old = b.querySelector('svg');
    if (old) old.remove();
    b.insertAdjacentHTML('afterbegin', P.ICON[paper ? 'sun' : 'moon']);
  }
  $('#btnPage').addEventListener('click', () => { ui.page = ui.page === 'paper' ? 'night' : 'paper'; saveUi(); renderPage(); });

  /* ---------------- Document: load, save, open ---------------- */
  const saveState = $('#saveState');
  let saveTimer = 0, refreshTimer = 0, warnedBig = false;
  function setTitle(t) {
    docTitle = t || 'Untitled';
    $('#docTitle').textContent = docTitle;
    document.title = (reader.state === 'playing' ? '▶ ' : '') + docTitle + ' · Petal Reader';
  }
  const storageOK = P.store.set('petal.probe', 1);
  function saveDoc() {
    if (EMBED) return;
    if (!storageOK) { saveState.textContent = 'Auto-save is off in this browser window'; return; }
    const ok = P.store.set(DOC_KEY, { html: editor.innerHTML, title: docTitle });
    saveState.textContent = ok ? 'Saved' : 'Too large to auto-save';
    if (!ok && !warnedBig) { warnedBig = true; toast('This document is too large to auto-save in the browser, but you can keep reading it.'); }
  }
  function scheduleSave() { saveState.textContent = 'Saving…'; clearTimeout(saveTimer); saveTimer = setTimeout(saveDoc, 700); }
  function scheduleRefresh() {
    reader.invalidate();
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => { if (reader.state !== 'playing') reader.refresh(); }, 450);
  }
  function setDoc(html, title, keepPos) {
    reader.stop();
    editor.innerHTML = sanitize(html);
    setTitle(title);
    wrap.scrollTop = 0;
    reader.invalidate(); reader.refresh();
    if (!keepPos) P.store.set(POS_KEY, 0);
    scheduleSave();
  }
  function replaceUndoable(html) {
    editor.focus();
    document.execCommand('selectAll', false, null);
    if (!document.execCommand('insertHTML', false, html || '<p><br></p>')) editor.innerHTML = html;
    scheduleRefresh(); scheduleSave();
  }
  async function openFile(file) {
    if (!file) return;
    const name = file.name || 'Document';
    const ext = (name.split('.').pop() || '').toLowerCase();
    let text;
    try { text = await file.text(); } catch (e) { toast('Could not read that file.'); return; }
    let html;
    if (['md', 'markdown', 'mdown', 'mkd', 'mdx'].includes(ext)) html = MD.render(text);
    else if (['html', 'htm', 'xhtml'].includes(ext)) { const m = /<body[^>]*>([\s\S]*)<\/body>/i.exec(text); html = m ? m[1] : text; }
    else html = MD.looksLike(text) ? MD.render(text) : textToHtml(text);
    setDoc(html, name);
    toast('Opened “' + name + '”. Press Play or double-click a word.');
  }
  const fileInput = $('#fileInput');
  $('#btnOpen').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => { openFile(fileInput.files[0]); fileInput.value = ''; });
  $('#btnNew').addEventListener('click', () => {
    if (editor.textContent.trim() && !confirm('Start a new empty page? (You can press Ctrl+Z to undo.)')) return;
    reader.stop();
    replaceUndoable('<p><br></p>');
    setTitle('Untitled');
    P.store.set(POS_KEY, 0);
  });
  $('#btnMd').addEventListener('click', () => {
    const text = editor.innerText.replace(/ /g, ' ');
    if (!text.trim()) { toast('Paste some Markdown text first.'); return; }
    reader.stop();
    replaceUndoable(sanitize(MD.render(text)));
    toast('Formatted as Markdown. Press Ctrl+Z to undo.');
  });
  $('#btnPaste').addEventListener('click', async () => {
    editor.focus();
    try {
      if (!navigator.clipboard || !navigator.clipboard.read) throw new Error('no clipboard');
      const items = await navigator.clipboard.read();
      for (const it of items) {
        if (it.types.includes('text/html')) {
          const html = await (await it.getType('text/html')).text();
          document.execCommand('insertHTML', false, sanitize(html));
          afterPaste(); return;
        }
      }
      for (const it of items) {
        if (it.types.includes('text/plain')) {
          const t = await (await it.getType('text/plain')).text();
          document.execCommand('insertHTML', false, MD.looksLike(t) ? sanitize(MD.render(t)) : textToHtml(t));
          afterPaste(); return;
        }
      }
      toast('The clipboard is empty.');
    } catch (e) {
      toast('Press Ctrl+V to paste. Formatting is kept. Ctrl+Shift+V pastes plain text.');
    }
  });

  /* After pasting: drop stray classes/ids, and offer a light page if the pasted text is dark. */
  function luminance(rgb) {
    const m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?/.exec(rgb);
    if (!m) return null;
    if (m[4] !== undefined && +m[4] < 0.3) return null;
    const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(+m[1]) + 0.7152 * f(+m[2]) + 0.0722 * f(+m[3]);
  }
  function afterPaste() {
    editor.querySelectorAll('[class],[id],[contenteditable]').forEach((e) => {
      e.removeAttribute('id'); e.removeAttribute('contenteditable');
      if (!/^language-/.test(e.getAttribute('class') || '')) e.removeAttribute('class');
    });
    editor.querySelectorAll('style,meta,link,script,title').forEach((e) => e.remove());
    scheduleRefresh(); scheduleSave();
    if (ui.page === 'paper') return;
    // Count text that is dark, or that sits on its own light background (white boxes on a night page).
    const tw = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
    let needsLight = 0, all = 0, n = 0, t;
    const seen = new Map();
    const lightBg = (e) => {
      for (let x = e; x && x !== editor; x = x.parentElement) {
        const L = luminance(getComputedStyle(x).backgroundColor);
        if (L !== null) return L > 0.6;
      }
      return false;
    };
    while ((t = tw.nextNode()) && n++ < 4000) {
      const len = t.data.trim().length;
      if (!len || !t.parentElement) continue;
      const p = t.parentElement;
      let bad = seen.get(p);
      if (bad === undefined) {
        const L = luminance(getComputedStyle(p).color);
        bad = (L !== null && L < 0.12) || lightBg(p);
        seen.set(p, bad);
      }
      all += len;
      if (bad) needsLight += len;
    }
    if (all && (needsLight / all > 0.2 || needsLight > 200)) {
      ui.page = 'paper'; saveUi(); renderPage();
      toast('Switched to a light “Paper page” so the pasted colours stay readable. Use the Night page button to switch back.', 7000);
    }
  }
  editor.addEventListener('paste', () => setTimeout(afterPaste, 0));
  editor.addEventListener('input', () => { scheduleRefresh(); scheduleSave(); });

  /* ---------------- Formatting toolbar ---------------- */
  document.querySelectorAll('.fmt[data-cmd], .fmt[data-block]').forEach((b) => {
    b.addEventListener('mousedown', (e) => e.preventDefault());
    b.addEventListener('click', () => {
      editor.focus();
      if (b.dataset.cmd) document.execCommand(b.dataset.cmd, false, null);
      else document.execCommand('formatBlock', false, '<' + b.dataset.block + '>');
      scheduleRefresh(); scheduleSave();
    });
  });

  /* ---------------- Drag & drop files ---------------- */
  const dropZone = $('#dropZone');
  let dragDepth = 0;
  const hasFiles = (e) => e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files');
  window.addEventListener('dragenter', (e) => { if (hasFiles(e)) { dragDepth++; dropZone.classList.add('show'); } });
  window.addEventListener('dragleave', (e) => { if (hasFiles(e) && --dragDepth <= 0) { dragDepth = 0; dropZone.classList.remove('show'); } });
  window.addEventListener('dragover', (e) => { if (hasFiles(e)) e.preventDefault(); });
  window.addEventListener('drop', (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault(); dragDepth = 0; dropZone.classList.remove('show');
    openFile(e.dataTransfer.files[0]);
  });

  /* ---------------- Help dialog & mobile sheet ---------------- */
  const helpDlg = $('#helpDlg');
  $('#btnHelp').addEventListener('click', () => { if (helpDlg.showModal) helpDlg.showModal(); else helpDlg.setAttribute('open', ''); });
  $('#btnCloseHelp').addEventListener('click', () => helpDlg.close());
  helpDlg.addEventListener('click', (e) => { if (e.target === helpDlg) helpDlg.close(); });
  const side = $('#side'), backdrop = $('#backdrop');
  function openSheet() { side.classList.add('open'); backdrop.classList.add('show'); }
  function closeSheet() { side.classList.remove('open'); backdrop.classList.remove('show'); }
  $('#btnSettings').addEventListener('click', openSheet);
  $('#btnCloseSheet').addEventListener('click', closeSheet);
  backdrop.addEventListener('click', closeSheet);

  /* ---------------- Keyboard shortcuts ---------------- */
  document.addEventListener('keydown', (e) => {
    const a = document.activeElement;
    const typing = editor.contains(a) || (a && /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName));
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key === 'Enter') { e.preventDefault(); reader.toggle(); return; }
    if (mod && !e.shiftKey && !e.altKey && e.key === '[') { e.preventDefault(); reader.skip(-30); return; }
    if (mod && !e.shiftKey && !e.altKey && e.key === ']') { e.preventDefault(); reader.skip(30); return; }
    if (e.key === 'Escape' && reader.state === 'playing' && !helpDlg.open) { reader.pause(); return; }
    if (typing || mod || e.altKey) return;
    if (e.key === ' ' && !(a && a.tagName === 'BUTTON')) { e.preventDefault(); reader.toggle(); }
    else if (e.key === 'ArrowLeft' && a !== track.el) { e.preventDefault(); reader.skip(-30); }
    else if (e.key === 'ArrowRight' && a !== track.el) { e.preventDefault(); reader.skip(30); }
  });

  /* ---------------- Start-up ---------------- */
  const WELCOME = [
    '<h1>Welcome to Petal Reader 🌸</h1>',
    '<p>Paste anything here (notes, articles, code) and press <b>Play</b>. The word being spoken lights up in yellow, so you can follow along with your eyes.</p>',
    '<h2>Jump anywhere</h2>',
    '<p><b>Double-click any word</b> and Petal Reader starts reading from exactly that word. Single clicks are safe: you can click around, select and edit text without losing your place.</p>',
    '<h2>Move through time</h2>',
    '<p>Drag the time bar at the bottom, scroll your mouse wheel over it, or use the 30-second buttons. The little marks on the bar are your headings, so you can see where each section starts and how long it lasts.</p>',
    '<h3>Chapters</h3>',
    '<p>Headings become chapters. You will find them in the Chapters list, numbered like 1, 1.1 and 2, with the time each one starts.</p>',
    '<h2>Pick a voice</h2>',
    '<p>The voice list puts the most natural-sounding voices first. In Microsoft Edge you will see “Natural” voices, which sound the most human, but they need internet. Voices marked offline work anywhere, even on a plane.</p>',
    '<p>Ready? Press the big gradient button below, or press Ctrl and Enter together.</p>'
  ].join('\n');

  function boot() {
    renderPage();
    renderRate();
    if (EMBED) {
      editor.innerHTML = sanitize(EMBED.html);
      setTitle(EMBED.title || 'Markdown file');
      const banner = $('#embedBanner');
      banner.textContent = '📄 Opened from VS Code: ' + (EMBED.title || '') + '  ·  This is a copy for listening; edits here are not saved to the file.';
      banner.classList.add('show');
    } else {
      const saved = P.store.get(DOC_KEY, null);
      if (saved && saved.html && saved.html.replace(/<[^>]*>/g, '').trim()) { editor.innerHTML = saved.html; setTitle(saved.title || 'Untitled'); saveState.textContent = 'Saved'; }
      else { editor.innerHTML = WELCOME; setTitle('Welcome'); }
    }
    reader.refresh();
    const pos = +P.store.get(POS_KEY, 0) || 0;
    if (pos > 0 && pos < reader.index.words.length) reader.jumpToWord(pos, false);
    renderVoices();
    btnPlay.innerHTML = P.ICON.play;
    paintTime();
    if (!reader.supported) toast('This browser has no speech engine. Please open Petal Reader in Microsoft Edge or Chrome.', 9000);
    else if (!reader.hasHighlight) toast('Your browser is a bit old for word highlighting. Reading still works.', 6000);
    // Phone version: works offline once installed (only when served from the web).
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && document.querySelector('link[rel="manifest"]')) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }
  window.addEventListener('beforeunload', () => { savePos(true); if (!EMBED) saveDoc(); });
  window.PetalApp = { reader, track, markdown: MD.render, openFile };
  boot();
})();
