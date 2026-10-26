/* Browser Web Speech implementation of the speech-provider contract. */
(function (global) {
  'use strict';

  const SpeechProvider = global.PetalProviders.SpeechProvider;

  function stableError(error) {
    const known = new Set([
      'canceled', 'interrupted', 'audio-busy', 'audio-hardware', 'network',
      'synthesis-unavailable', 'synthesis-failed', 'language-unavailable',
      'voice-unavailable', 'text-too-long', 'invalid-argument', 'not-allowed'
    ]);
    return known.has(error) ? error : 'provider-error';
  }

  class BrowserSpeechSession {
    constructor(provider, options, events) {
      this.provider = provider;
      this.events = events || {};
      this.active = true;
      this.started = false;
      const utterance = new provider.Utterance(options.text || '');
      if (options.voice) utterance.voice = options.voice;
      if (options.language) utterance.lang = options.language;
      utterance.rate = options.rate == null ? 1 : options.rate;
      utterance.pitch = options.pitch == null ? 1 : options.pitch;
      utterance.volume = options.volume == null ? 1 : options.volume;
      utterance.onstart = () => this._emit('onStart', { audioTimeMs: 0 });
      utterance.onboundary = (event) => this._emit('onBoundary', {
        charIndex: event.charIndex || 0,
        charLength: event.charLength || 0,
        audioTimeMs: Number.isFinite(event.elapsedTime) ? event.elapsedTime * 1000 : null,
        kind: event.name || 'word',
        name: event.name || 'word'
      });
      utterance.onend = () => { this._emit('onEnd'); this.active = false; };
      utterance.onerror = (event) => {
        const raw = (event && event.error) || 'provider-error';
        this._emit('onError', { code: stableError(raw), retryable: !['not-allowed', 'invalid-argument'].includes(raw), providerMessage: raw });
        this.active = false;
      };
      this.utterance = utterance;
    }
    _emit(name, payload) {
      if (!this.active) return;
      const handler = this.events && this.events[name];
      if (handler) handler(payload);
    }
    start() {
      if (!this.active || this.started) return;
      this.started = true;
      this.provider.synth.speak(this.utterance);
    }
    pause() { if (this.active) this.provider.synth.pause(); }
    resume() { if (this.active) this.provider.synth.resume(); }
    cancel() {
      if (!this.active) return;
      this.active = false;
      this.provider.synth.cancel();
    }
    dispose() {
      this.active = false;
      this.events = null;
      this.utterance.onstart = null;
      this.utterance.onboundary = null;
      this.utterance.onend = null;
      this.utterance.onerror = null;
    }
  }

  class BrowserSpeechProvider extends SpeechProvider {
    constructor(host) {
      super({
        alignment: 'word',
        audioDelivery: 'provider-playback',
        network: 'optional',
        privacy: 'device',
        canPause: true,
        canResume: true,
        canCancel: true,
        canStream: false,
        supportsVoiceList: true
      });
      this.host = host;
      this.synth = host && host.speechSynthesis;
      this.Utterance = host && host.SpeechSynthesisUtterance;
      if (!this.Utterance && typeof SpeechSynthesisUtterance !== 'undefined') this.Utterance = SpeechSynthesisUtterance;
    }
    get supported() { return !!(this.synth && this.Utterance); }
    get busy() { return !!(this.synth && (this.synth.speaking || this.synth.pending)); }
    get paused() { return !!(this.synth && this.synth.paused); }
    listVoices() {
      if (!this.synth) return [];
      try { return this.synth.getVoices() || []; } catch (error) { return []; }
    }
    onVoicesChanged(callback) {
      if (!this.synth) return () => {};
      if (this.synth.addEventListener) {
        this.synth.addEventListener('voiceschanged', callback);
        return () => this.synth.removeEventListener && this.synth.removeEventListener('voiceschanged', callback);
      }
      this.synth.onvoiceschanged = callback;
      return () => { if (this.synth.onvoiceschanged === callback) this.synth.onvoiceschanged = null; };
    }
    createSession(options, events) {
      if (!this.supported) throw new Error('Browser speech is not supported');
      return new BrowserSpeechSession(this, options || {}, events || {});
    }
  }

  global.PetalProviders.BrowserSpeechProvider = BrowserSpeechProvider;
  global.PetalProviders.BrowserSpeechSession = BrowserSpeechSession;
})(typeof window !== 'undefined' ? window : this);
