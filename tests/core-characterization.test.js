const test = require('node:test');
const assert = require('node:assert/strict');

const { loadPetalCore, makeIndex } = require('./helpers/load-petal-core');

function readerWith(words) {
  const { PetalCore, speechSynthesis } = loadPetalCore();
  const reader = new PetalCore.Reader({ follow: false, prefix: 'test.' });
  reader.index = makeIndex(words);
  reader.dirty = false;
  return { PetalCore, reader, speechSynthesis };
}

test('formats durations and clamps transport values', () => {
  const { PetalCore } = loadPetalCore();
  assert.equal(PetalCore.fmtTime(0), '00:00');
  assert.equal(PetalCore.fmtTime(65), '01:05');
  assert.equal(PetalCore.fmtTime(3661), '1:01:01');
  assert.equal(PetalCore.clamp(-2, 0, 10), 0);
  assert.equal(PetalCore.clamp(12, 0, 10), 10);
});

test('play sends indexed text to speech and follows word boundaries', () => {
  const { reader, speechSynthesis } = readerWith(['Hello', 'bright', 'world.']);
  const states = [];
  const positions = [];
  reader.on('state', (state) => states.push(state));
  reader.on('word', (position) => positions.push(position));

  reader.play();

  assert.equal(reader.state, 'playing');
  assert.equal(speechSynthesis.utterances.length, 1);
  assert.equal(speechSynthesis.utterances[0].text, 'Hello bright world. ');
  speechSynthesis.start();
  speechSynthesis.boundary(6);
  speechSynthesis.boundary(13);

  assert.equal(reader.pos, 2);
  assert.deepEqual(states, ['playing']);
  assert.deepEqual(positions, [0, 1, 2]);

  speechSynthesis.end();
  assert.equal(reader.state, 'stopped');
  assert.equal(reader.pos, 0);
});

test('pause and stop cancel active speech with stable state transitions', () => {
  const { reader, speechSynthesis } = readerWith(['One', 'two.']);

  reader.play();
  speechSynthesis.start();
  reader.pause();
  assert.equal(reader.state, 'paused');
  assert.equal(speechSynthesis.cancelCount, 1);

  reader.play(1);
  assert.equal(reader.pos, 1);
  reader.stop();
  assert.equal(reader.state, 'stopped');
  assert.equal(reader.pos, 0);
  assert.equal(speechSynthesis.cancelCount, 2);
});

test('permission failures pause playback and emit an actionable message', () => {
  const { reader, speechSynthesis } = readerWith(['Permission', 'check.']);
  const messages = [];
  reader.on('toast', (message) => messages.push(message));

  reader.play();
  speechSynthesis.fail('not-allowed');

  assert.equal(reader.state, 'paused');
  assert.equal(messages.at(-1), 'Press Play to start. The browser needs a click first.');
});
