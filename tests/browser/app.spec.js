const { test, expect } = require('@playwright/test');

const unsafeClipboard = '<h2 id="unsafe" onclick="window.hacked=true">Unsafe chapter</h2>' +
  '<script>window.hacked=true</script><iframe srcdoc="bad"></iframe>' +
  '<a href="javascript:window.hacked=true">bad link</a>';

async function installBrowserMocks(page) {
  await page.addInitScript((clipboardHtml) => {
    class MockUtterance {
      constructor(text) {
        this.text = text;
        this.voice = null;
        this.lang = '';
        this.rate = 1;
        this.pitch = 1;
        this.volume = 1;
      }
    }
    const speech = {
      speaking: false,
      pending: false,
      paused: false,
      utterances: [],
      cancelCount: 0,
      voices: [{ name: 'Local Test Voice', voiceURI: 'local-test', lang: 'en-US', localService: true, default: true }],
      addEventListener() {},
      removeEventListener() {},
      getVoices() { return this.voices; },
      speak(utterance) { this.utterances.push(utterance); this.pending = true; },
      cancel() { this.cancelCount += 1; this.speaking = false; this.pending = false; this.paused = false; },
      pause() { this.paused = true; },
      resume() { this.paused = false; },
      start() { const utterance = this.utterances.at(-1); this.pending = false; this.speaking = true; utterance.onstart?.(); },
      boundary(charIndex) { this.utterances.at(-1).onboundary?.({ charIndex, charLength: 4, name: 'word', elapsedTime: 0.2 }); }
    };
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: MockUtterance, configurable: true });
    Object.defineProperty(window, 'speechSynthesis', { value: speech, configurable: true });
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        read: async () => [{
          types: ['text/html'],
          getType: async () => new Blob([clipboardHtml], { type: 'text/html' })
        }]
      }
    });
    window.__mockSpeech = speech;
  }, unsafeClipboard);
}

test.beforeEach(async ({ page }) => {
  await installBrowserMocks(page);
  await page.goto('/PetalReader.html');
});

test('loads chapters and follows deterministic speech boundaries', async ({ page }) => {
  await page.locator('#editor').evaluate((editor) => {
    editor.innerHTML = '<h1>Demo chapter</h1><p>Hello bright world.</p>';
    editor.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
  });

  await expect(page.locator('#chapterList li')).toHaveCount(1);
  await page.getByRole('button', { name: 'Play' }).click();
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();
  await page.evaluate(() => { window.__mockSpeech.start(); window.__mockSpeech.boundary(5); });
  await expect.poll(() => page.evaluate(() => CSS.highlights && CSS.highlights.has('petal-word'))).toBe(true);

  await page.getByRole('button', { name: 'Stop' }).click();
  await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();
  expect(await page.evaluate(() => window.__mockSpeech.cancelCount)).toBeGreaterThan(0);
});

test('sanitizes pasted HTML before it enters the document', async ({ page }) => {
  await page.getByRole('button', { name: 'Paste' }).click();
  await expect(page.locator('#editor')).toContainText('Unsafe chapter');

  const result = await page.locator('#editor').evaluate((editor) => ({
    dangerousElements: editor.querySelectorAll('script,iframe,object,embed').length,
    eventAttributes: Array.from(editor.querySelectorAll('*')).some((element) =>
      Array.from(element.attributes).some((attribute) => attribute.name.toLowerCase().startsWith('on'))),
    dangerousLinks: Array.from(editor.querySelectorAll('[href]')).some((element) => /^javascript:/i.test(element.getAttribute('href'))),
    leakedId: !!editor.querySelector('#unsafe'),
    hacked: window.hacked === true
  }));
  expect(result).toEqual({ dangerousElements: 0, eventAttributes: false, dangerousLinks: false, leakedId: false, hacked: false });
});

test('exposes named controls for keyboard and assistive-technology use', async ({ page }) => {
  await expect(page).toHaveTitle(/Petal Reader/);
  await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();
  await expect(page.getByRole('complementary', { name: 'Voice and reading settings' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Text to read aloud' })).toBeVisible();
  await expect(page.locator('#track')).toHaveAttribute('role', 'slider');
  await expect(page.locator('#track')).toHaveAttribute('aria-label', 'Playback position');
});
