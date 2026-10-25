/* Petal Reader for the VS Code Markdown preview: floating player in the bottom-right corner. */
(function () {
  'use strict';
  if (window.__petalPreview) return;
  window.__petalPreview = true;
  const P = window.PetalCore;
  if (!P) return;

  const KEY = 'petal.vsc.ui';
  const ui = Object.assign({ readCode: false, dblJump: true, follow: true, mini: false }, P.store.get(KEY, {}));
  const saveUi = () => P.store.set(KEY, ui);
  const ICON = P.ICON;
  const contentRoot = () => document.querySelector('.markdown-body') || document.body;

  function start() {
    if (document.querySelector('.petal-player')) return;

    const host = document.createElement('div');
    host.className = 'petal-ui petal-player' + (ui.mini ? ' mini' : '');
    host.setAttribute('role', 'region');
    host.setAttribute('aria-label', 'Petal Reader player');
    host.innerHTML =
      '<button type="button" class="pp-btn pp-play" aria-label="Play">' + ICON.play + '</button>' +
      '<button type="button" class="pp-btn pp-back" title="Back 30 seconds" aria-label="Back 30 seconds">' + ICON.back30 + '</button>' +
      '<button type="button" class="pp-btn pp-fwd" title="Forward 30 seconds" aria-label="Forward 30 seconds">' + ICON.fwd30 + '</button>' +
      '<div class="pp-mid"><div class="pp-row"><span class="pp-chapter">Petal Reader</span><span class="pp-time">00:00 / 00:00</span></div><div class="pp-track"></div></div>' +
      '<span class="pp-mini-time"></span>' +
      '<button type="button" class="pp-btn pp-stop" title="Stop and go back to the start" aria-label="Stop">' + ICON.stop + '</button>' +
      '<button type="button" class="pp-btn pp-menu" title="Voice, speed and chapters" aria-label="Voice, speed and chapters">' + ICON.sliders + '</button>' +
      '<button type="button" class="pp-btn pp-collapse" title="Make the player smaller" aria-label="Make the player smaller">' + ICON.chevDown + '</button>' +
      '<button type="button" class="pp-btn pp-expand" title="Show the full player" aria-label="Show the full player">' + ICON.chevUp + '</button>' +
      '<div class="pp-panel" hidden>' +
        '<div class="pp-h">Voice</div>' +
        '<select class="pp-select pp-voice" aria-label="Voice"></select>' +
        '<div class="pp-note pp-voice-note"></div>' +
        '<div class="pp-h">Speed <span class="pp-val pp-rate-val">1×</span></div>' +
        '<input type="range" class="pp-range pp-rate" min="0.5" max="2" step="0.05" aria-label="Speed">' +
        '<div class="pp-presets"><button type="button" data-rate="0.75">0.75×</button><button type="button" data-rate="1">1×</button><button type="button" data-rate="1.25">1.25×</button><button type="button" data-rate="1.5">1.5×</button><button type="button" data-rate="2">2×</button></div>' +
        '<div class="pp-h">Total Estimated Time <span class="pp-val pp-total">00:00</span></div>' +
        '<label class="pp-toggle"><span>Follow along (auto-scroll)</span><input type="checkbox" class="pp-follow"></label>' +
        '<label class="pp-toggle"><span>Read code blocks</span><input type="checkbox" class="pp-code"></label>' +
        '<label class="pp-toggle"><span>Double-click a word to read from it</span><input type="checkbox" class="pp-dbl"></label>' +
        '<div class="pp-h">Chapters <span class="pp-val pp-count"></span></div>' +
        '<ol class="pp-chapters"></ol>' +
        '<div class="pp-note pp-ch-empty">Headings (#, ##, ###) show up here and as marks on the time bar.</div>' +
      '</div>';
    document.body.appendChild(host);
    const $ = (s) => host.querySelector(s);

    const reader = new P.Reader({
      root: contentRoot,
      scrollEl: () => document.scrollingElement || document.documentElement,
      bottomInset: () => host.offsetHeight + 28,
      follow: ui.follow,
      prefix: 'petal.vsc.',
      indexOptions: () => ({ skipSelector: ui.readCode ? '.petal-ui' : 'pre, .mermaid, .petal-ui', readUrls: false, readEmoji: false })
    });
    const track = new P.Track($('.pp-track'), reader);
    window.PetalPreview = { reader, track };
    const playBtn = $('.pp-play'), timeEl = $('.pp-time'), miniTime = $('.pp-mini-time'), chapterEl = $('.pp-chapter');
    const panel = $('.pp-panel'), voiceSel = $('.pp-voice'), rateIn = $('.pp-rate'), list = $('.pp-chapters');

    /* ---- time ---- */
    let raf = 0;
    function paint() {
      const total = reader.totalTime(), pv = track.previewTime, cur = pv != null ? pv : reader.currentTime();
      timeEl.textContent = P.fmtTime(cur) + ' / ' + P.fmtTime(total);
      miniTime.textContent = P.fmtTime(Math.max(0, total - cur)) + ' left';
      $('.pp-total').textContent = P.fmtTime(total);
      track.update(cur, total);
    }
    function loop() { raf = 0; paint(); if (reader.state === 'playing' || track.previewTime != null) raf = requestAnimationFrame(loop); }
    const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };
    reader.on('preview', kick);
    reader.on('timing', () => { paint(); renderChapters(); });

    /* ---- chapters ---- */
    let active = null;
    function renderChapters() {
      const chs = reader.index ? reader.index.chapters : [];
      list.textContent = '';
      $('.pp-ch-empty').hidden = chs.length > 0;
      $('.pp-count').textContent = chs.length ? String(chs.length) : '';
      for (const c of chs) {
        const li = document.createElement('li');
        li.className = c.isTitle ? 'title' : 'd' + Math.min(c.depth, 3);
        const b = document.createElement('button');
        b.type = 'button';
        const num = c.num && !c.ownNum ? c.num + '  ' : '';
        b.innerHTML = '<span class="n"></span><span class="t"></span><span class="a"></span>';
        b.children[0].textContent = num;
        b.children[1].textContent = c.title || 'Section';
        b.children[2].textContent = P.fmtTime(reader.timeOfWord(c.word));
        b.addEventListener('click', () => reader.jumpToWord(c.word, false));
        b.addEventListener('dblclick', () => reader.jumpToWord(c.word, true));
        li.appendChild(b);
        c._li = li;
        list.appendChild(li);
      }
      active = null;
      showChapter(reader.pos);
    }
    function showChapter(i) {
      const c = reader.chapterAt(i);
      if (c !== active) {
        if (active && active._li) active._li.classList.remove('on');
        if (c && c._li) c._li.classList.add('on');
        active = c;
      }
      chapterEl.textContent = '';
      if (c) {
        if (c.num && !c.ownNum) { const b = document.createElement('b'); b.textContent = c.num + ' '; chapterEl.appendChild(b); }
        chapterEl.appendChild(document.createTextNode(c.title));
      } else {
        chapterEl.textContent = reader.state === 'playing' ? 'Reading…' : 'Petal Reader · double-click a word';
      }
    }

    /* ---- voices & speed ---- */
    function renderVoices() {
      P.fillVoiceSelect(voiceSel, reader, false);
      const v = reader.voiceInfo;
      const natural = reader.voices.list.some((x) => x.sameLang && x.q >= 80);
      $('.pp-voice-note').textContent = !reader.supported
        ? 'Speech is not available in this VS Code window.'
        : natural ? (v && v.online ? 'Online voice: needs internet.' : '')
          : 'These are your computer’s built-in voices. For the most natural voices, click the speaker icon (“Open in Petal Reader”) at the top right of the editor. It opens this file in Edge.';
    }
    function renderRate() {
      rateIn.value = String(reader.rate);
      $('.pp-rate-val').textContent = reader.rate.toFixed(2).replace(/\.?0+$/, '') + '×';
      host.querySelectorAll('.pp-presets button').forEach((b) => b.classList.toggle('on', Math.abs(+b.dataset.rate - reader.rate) < 0.001));
      paint(); renderChapters();
    }
    reader.on('voices', renderVoices);
    voiceSel.addEventListener('change', () => { if (voiceSel.value) reader.setVoice(voiceSel.value); });
    rateIn.addEventListener('input', () => { reader.setRate(+rateIn.value); renderRate(); });
    host.querySelectorAll('.pp-presets button').forEach((b) => b.addEventListener('click', () => { reader.setRate(+b.dataset.rate); renderRate(); }));

    /* ---- options ---- */
    function bind(sel, key, after) {
      const box = $(sel);
      box.checked = !!ui[key];
      box.addEventListener('change', () => { ui[key] = box.checked; saveUi(); if (after) after(); });
    }
    bind('.pp-follow', 'follow', () => reader.setFollow(ui.follow));
    bind('.pp-code', 'readCode', () => { reader.invalidate(); if (reader.state === 'playing') reader.play(reader.pos); else reader.refresh(); });
    bind('.pp-dbl', 'dblJump');

    /* ---- reader events ---- */
    reader.on('word', (i) => { showChapter(i); if (reader.state !== 'playing') paint(); });
    reader.on('scrub', showChapter);
    reader.on('index', () => { renderChapters(); paint(); });
    reader.on('state', (s) => {
      const playing = s === 'playing';
      playBtn.innerHTML = ICON[playing ? 'pause' : 'play'];
      playBtn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
      playBtn.title = playing ? 'Pause (Ctrl+Enter)' : 'Play (Ctrl+Enter). Tip: double-click any word to start there';
      host.classList.toggle('playing', playing);
      showChapter(reader.pos);
      kick();
    });
    let toastTimer = 0;
    reader.on('toast', (m) => {
      let t = host.querySelector('.pp-toast');
      if (!t) { t = document.createElement('div'); t.className = 'pp-toast'; host.appendChild(t); }
      t.textContent = m; t.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => t.classList.remove('show'), 6000);
    });

    /* ---- buttons ---- */
    playBtn.addEventListener('click', () => reader.toggle());
    $('.pp-back').addEventListener('click', () => reader.skip(-30));
    $('.pp-fwd').addEventListener('click', () => reader.skip(30));
    $('.pp-stop').addEventListener('click', () => reader.stop());
    $('.pp-menu').addEventListener('click', (e) => { e.stopPropagation(); panel.hidden = !panel.hidden; if (!panel.hidden) { renderVoices(); renderRate(); } });
    $('.pp-collapse').addEventListener('click', () => { ui.mini = true; saveUi(); host.classList.add('mini'); panel.hidden = true; });
    $('.pp-expand').addEventListener('click', () => { ui.mini = false; saveUi(); host.classList.remove('mini'); kick(); });
    document.addEventListener('click', (e) => { if (!panel.hidden && !host.contains(e.target)) panel.hidden = true; });

    /* ---- double-click a word: read from there (and stop VS Code switching to the editor) ---- */
    window.addEventListener('dblclick', (e) => {
      if (!ui.dblJump || host.contains(e.target)) return;
      const t = e.target;
      if (t && t.closest && t.closest('a, .petal-ui')) return;
      const root = contentRoot();
      if (!root || !root.contains(t)) return;
      const i = reader.wordFromEvent(e);
      if (i < 0) return;
      e.stopPropagation();
      reader.jumpToWord(i, true);
      const sel = window.getSelection();
      if (sel) sel.removeAllRanges();
    }, true);

    /* ---- keyboard (when the preview has focus) ---- */
    document.addEventListener('keydown', (e) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key === 'Enter') { e.preventDefault(); reader.toggle(); }
      else if (mod && e.key === '[') { e.preventDefault(); reader.skip(-30); }
      else if (mod && e.key === ']') { e.preventDefault(); reader.skip(30); }
      else if (e.key === 'Escape' && reader.state === 'playing') { reader.pause(); }
    });

    /* ---- keep up with edits: VS Code updates the preview as you type ---- */
    let lastRoot = contentRoot(), refreshTimer = 0;
    function contentChanged() {
      const root = contentRoot();
      if (root !== lastRoot) { lastRoot = root; reader.stop(); }
      reader.invalidate();
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => { if (reader.state !== 'playing') reader.refresh(); }, 350);
    }
    window.addEventListener('vscode.markdown.updateContent', contentChanged);
    new MutationObserver((records) => {
      for (const r of records) { if (!host.contains(r.target)) { contentChanged(); return; } }
    }).observe(document.body, { childList: true, subtree: true, characterData: true });

    renderVoices();
    renderRate();
    reader.refresh();
    playBtn.title = 'Play (Ctrl+Enter). Tip: double-click any word to start there';
    paint();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
