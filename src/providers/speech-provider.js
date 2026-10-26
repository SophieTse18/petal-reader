/* ==PETAL-CORE-BEGIN== */
/* Speech provider contract shared by production and test providers. */
(function (global) {
  'use strict';

  const CAPABILITY_VALUES = {
    alignment: new Set(['word', 'character', 'mark', 'estimated', 'none']),
    audioDelivery: new Set(['provider-playback', 'stream', 'buffer']),
    network: new Set(['required', 'optional', 'none']),
    privacy: new Set(['device', 'remote'])
  };

  class SpeechProvider {
    constructor(capabilities) {
      this.capabilities = Object.freeze(Object.assign({
        alignment: 'none',
        audioDelivery: 'provider-playback',
        network: 'none',
        privacy: 'device',
        canPause: false,
        canResume: false,
        canCancel: true,
        canStream: false,
        supportsVoiceList: false
      }, capabilities || {}));
      for (const key of Object.keys(CAPABILITY_VALUES)) {
        if (!CAPABILITY_VALUES[key].has(this.capabilities[key])) {
          throw new TypeError('Invalid speech-provider capability: ' + key + '=' + this.capabilities[key]);
        }
      }
    }
    get supported() { return false; }
    get busy() { return false; }
    get paused() { return false; }
    listVoices() { return []; }
    onVoicesChanged() { return () => {}; }
    createSession() { throw new Error('Speech provider does not implement createSession()'); }
  }

  global.PetalProviders = { SpeechProvider };
})(typeof window !== 'undefined' ? window : this);
