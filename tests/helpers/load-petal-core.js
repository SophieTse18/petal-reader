const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

class MockUtterance {
  constructor(text) {
    this.text = text;
    this.voice = null;
    this.lang = '';
    this.rate = 1;
    this.pitch = 1;
    this.volume = 1;
    this.onstart = null;
    this.onboundary = null;
    this.onend = null;
    this.onerror = null;
  }
}

class MockSpeechSynthesis {
  constructor(voices = []) {
    this.voices = voices;
    this.utterances = [];
    this.cancelCount = 0;
    this.pauseCount = 0;
    this.resumeCount = 0;
    this.speaking = false;
    this.pending = false;
    this.paused = false;
  }

  addEventListener() {}
  getVoices() { return this.voices; }

  speak(utterance) {
    this.utterances.push(utterance);
    this.pending = true;
  }

  cancel() {
    this.cancelCount += 1;
    this.speaking = false;
    this.pending = false;
    this.paused = false;
  }

  pause() {
    this.pauseCount += 1;
    this.paused = true;
  }

  resume() {
    this.resumeCount += 1;
    this.paused = false;
  }

  start(index = this.utterances.length - 1) {
    const utterance = this.utterances[index];
    this.pending = false;
    this.speaking = true;
    utterance.onstart?.();
    return utterance;
  }

  boundary(charIndex, name = 'word', index = this.utterances.length - 1) {
    this.utterances[index].onboundary?.({ charIndex, name });
  }

  end(index = this.utterances.length - 1) {
    const utterance = this.utterances[index];
    this.speaking = false;
    this.pending = false;
    utterance.onend?.();
  }

  fail(error, index = this.utterances.length - 1) {
    this.speaking = false;
    this.pending = false;
    this.utterances[index].onerror?.({ error });
  }
}

function extractCore() {
  const app = fs.readFileSync(path.join(__dirname, '..', '..', 'PetalReader.html'), 'utf8');
  const begin = '/* ==PETAL-CORE-BEGIN== */';
  const end = '/* ==PETAL-CORE-END== */';
  const start = app.indexOf(begin);
  const finish = app.indexOf(end, start);
  if (start < 0 || finish < 0) throw new Error('Petal core markers are missing');
  return app.slice(start, finish + end.length);
}

function loadPetalCore({ voices = [] } = {}) {
  const speechSynthesis = new MockSpeechSynthesis(voices);
  const storage = new Map();
  const document = {
    addEventListener() {},
    createElement() { throw new Error('DOM creation is outside this characterization harness'); },
    createRange() { throw new Error('Ranges are outside this characterization harness'); },
    documentElement: {},
    body: {},
    scrollingElement: {}
  };
  const window = {
    speechSynthesis,
    localStorage: {
      getItem(key) { return storage.has(key) ? storage.get(key) : null; },
      setItem(key, value) { storage.set(key, value); },
      removeItem(key) { storage.delete(key); }
    },
    CSS: undefined,
    Highlight: undefined,
    addEventListener() {},
    innerHeight: 800,
    scrollBy() {}
  };
  const context = {
    window,
    document,
    navigator: {
      language: 'en-US',
      languages: ['en-US'],
      onLine: true,
      userAgent: 'Petal Reader test',
      userAgentData: null
    },
    performance: { now: () => 1000 },
    SpeechSynthesisUtterance: MockUtterance,
    Option: class {},
    Intl,
    Map,
    Set,
    Float64Array,
    console,
    setTimeout: () => 1,
    clearTimeout() {},
    setInterval: () => 1,
    clearInterval() {}
  };
  window.window = window;
  window.document = document;
  vm.runInNewContext(extractCore(), context, { filename: 'PetalReader.core.js' });
  return { PetalCore: window.PetalCore, speechSynthesis, storage };
}

function makeIndex(words) {
  const entries = words.map((word, index) => ({
    sp: word,
    tok: word,
    block: 0,
    seg: 0,
    punct: index === words.length - 1 ? 2 : 0,
    brk: index === words.length - 1 ? 2 : 0,
    est: 0.5
  }));
  const T = new Float64Array(entries.length + 1);
  for (let index = 0; index <= entries.length; index += 1) T[index] = index * 0.5;
  return {
    words: entries,
    segments: [{ w0: 0, w1: entries.length, block: 0, chars: words.join(' ').length + 1 }],
    chapters: [],
    blocks: [{ heading: 0 }],
    T,
    total: entries.length * 0.5,
    wordCount: entries.length
  };
}

module.exports = { loadPetalCore, makeIndex, MockSpeechSynthesis };
