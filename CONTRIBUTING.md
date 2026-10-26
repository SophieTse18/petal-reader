# Contributing

Thanks for helping Petal Reader stay simple for users and maintainable for contributors.

1. Open an issue for behavior changes or a new speech provider before investing in implementation.
2. Keep `PetalReader.html` dependency-free and directly openable from `file://`.
3. Edit canonical files under `src/`, then run `python3 tools/build.py`.
4. Run `npm test` and `python3 tools/build.py --check`.
5. Commit generated outputs with the source change that produced them.

Pull requests should explain user impact, privacy/network changes, test evidence, manual smoke evidence, and rollback. Keep commits focused and runnable.

A provider proposal must include the measurements in [the evaluation protocol](guides/tts-provider-evaluation.md). Never commit API keys or add a browser-side secret. A remote provider needs an explicit backend, privacy, cost, and retention design before implementation.

Generated files include `PetalReader.html`, `docs/`, `vscode-extension/media/`, and the VSIX. Reviews should focus on `src/` and build inputs first, then verify generated consistency.

By participating, you agree to follow [the code of conduct](CODE_OF_CONDUCT.md).
