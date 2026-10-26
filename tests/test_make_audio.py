import importlib.util
import pathlib
import unittest


ROOT = pathlib.Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("make_audio", ROOT / "tools" / "make_audio.py")
MAKE_AUDIO = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MAKE_AUDIO)


class MarkdownCharacterizationTests(unittest.TestCase):
    def test_markdown_is_split_at_top_level_headings(self):
        chapters = MAKE_AUDIO.markdown_chapters(
            "# Course\n\nIntro text\n\n## Week one\n\nFirst lesson\n\n## Week two\n\nSecond lesson"
        )
        self.assertEqual(
            chapters,
            [
                ("Course", "Course. Intro text."),
                ("Week one", "Week one. First lesson."),
                ("Week two", "Week two. Second lesson."),
            ],
        )

    def test_safe_names_remove_cross_platform_reserved_characters(self):
        self.assertEqual(MAKE_AUDIO.safe_name('Week 1: "Start" / Review?', "Audio"), "Week 1 Start Review")
        self.assertEqual(MAKE_AUDIO.safe_name("...", "Audio"), "Audio")


class EngineSelectionTests(unittest.TestCase):
    def test_auto_uses_edge_when_package_and_network_are_available(self):
        self.assertEqual(
            MAKE_AUDIO.resolve_engine("auto", platform="linux", edge_available=True, network_available=True),
            "edge",
        )

    def test_auto_uses_windows_only_on_windows_with_powershell(self):
        self.assertEqual(
            MAKE_AUDIO.resolve_engine(
                "auto",
                platform="win32",
                edge_available=False,
                network_available=False,
                powershell_available=True,
            ),
            "windows",
        )

    def test_auto_rejects_platform_incompatible_fallbacks(self):
        for platform in ("darwin", "linux"):
            with self.subTest(platform=platform):
                with self.assertRaisesRegex(MAKE_AUDIO.EngineUnavailable, "macOS/Linux"):
                    MAKE_AUDIO.resolve_engine(
                        "auto",
                        platform=platform,
                        edge_available=False,
                        network_available=True,
                        powershell_available=False,
                    )

    def test_explicit_windows_requires_windows_and_powershell(self):
        with self.assertRaisesRegex(MAKE_AUDIO.EngineUnavailable, "only available on Windows"):
            MAKE_AUDIO.resolve_engine("windows", platform="darwin", powershell_available=True)
        with self.assertRaisesRegex(MAKE_AUDIO.EngineUnavailable, "requires Windows PowerShell"):
            MAKE_AUDIO.resolve_engine("windows", platform="win32", powershell_available=False)

    def test_explicit_edge_requires_package_and_network(self):
        with self.assertRaisesRegex(MAKE_AUDIO.EngineUnavailable, "edge-tts package"):
            MAKE_AUDIO.resolve_engine("edge", platform="linux", edge_available=False, network_available=True)
        with self.assertRaisesRegex(MAKE_AUDIO.EngineUnavailable, "internet connection"):
            MAKE_AUDIO.resolve_engine("edge", platform="linux", edge_available=True, network_available=False)


if __name__ == "__main__":
    unittest.main()
