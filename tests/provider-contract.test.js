const test = require('node:test');
const assert = require('node:assert/strict');

const { loadPetalCore, makeIndex } = require('./helpers/load-petal-core');

test('browser provider exposes stable capabilities and normalized events', () => {
  const { PetalProviders, speechSynthesis, window } = loadPetalCore();
  const provider = new PetalProviders.BrowserSpeechProvider(window);
  assert.deepEqual(
    {
      alignment: provider.capabilities.alignment,
      audioDelivery: provider.capabilities.audioDelivery,
      network: provider.capabilities.network,
      privacy: provider.capabilities.privacy
    },
    { alignment: 'word', audioDelivery: 'provider-playback', network: 'optional', privacy: 'device' }
  );

  const events = [];
  const session = provider.createSession({ text: 'Hello world', rate: 1.25 }, {
    onStart: (event) => events.push(['start', event.audioTimeMs]),
    onBoundary: (event) => events.push(['boundary', event.charIndex, event.kind]),
    onEnd: () => events.push(['end'])
  });
  session.start();
  speechSynthesis.start();
  speechSynthesis.boundary(6);
  speechSynthesis.end();

  assert.equal(speechSynthesis.utterances[0].rate, 1.25);
  assert.deepEqual(events, [['start', 0], ['boundary', 6, 'word'], ['end']]);
});

test('browser provider invalidates late events after cancellation', () => {
  const { PetalProviders, speechSynthesis, window } = loadPetalCore();
  const provider = new PetalProviders.BrowserSpeechProvider(window);
  const events = [];
  const session = provider.createSession({ text: 'Cancel me' }, {
    onEnd: () => events.push('end'),
    onError: (event) => events.push(event.code)
  });
  session.start();
  session.cancel();
  speechSynthesis.end();
  speechSynthesis.fail('mystery-error');
  assert.deepEqual(events, []);
});

test('reader accepts a deterministic provider without browser speech globals', () => {
  const { PetalCore, PetalProviders } = loadPetalCore();
  class MockProvider extends PetalProviders.SpeechProvider {
    constructor() {
      super({ alignment: 'word', audioDelivery: 'provider-playback', network: 'none', privacy: 'device', canCancel: true, supportsVoiceList: true });
      this.sessions = [];
    }
    get supported() { return true; }
    listVoices() { return []; }
    createSession(options, events) {
      const session = {
        options,
        active: true,
        start() { events.onStart?.({ audioTimeMs: 0 }); },
        pause() {},
        resume() {},
        cancel() { this.active = false; },
        dispose() { this.active = false; },
        boundary(charIndex) { if (this.active) events.onBoundary?.({ charIndex, kind: 'word' }); },
        end() { if (this.active) events.onEnd?.(); }
      };
      this.sessions.push(session);
      return session;
    }
  }

  const provider = new MockProvider();
  const reader = new PetalCore.Reader({ follow: false, prefix: 'provider-test.', provider });
  reader.index = makeIndex(['Mock', 'provider', 'works.']);
  reader.dirty = false;
  reader.play();

  assert.equal(provider.sessions.length, 1);
  assert.equal(provider.sessions[0].options.text, 'Mock provider works. ');
  provider.sessions[0].boundary(5);
  assert.equal(reader.pos, 1);
  reader.stop();
  provider.sessions[0].end();
  assert.equal(reader.state, 'stopped');
});
