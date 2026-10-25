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


class EngineSelectionCharacterizationTests(unittest.TestCase):
    def test_auto_uses_edge_only_when_package_and_network_are_available(self):
        self.assertEqual(MAKE_AUDIO.resolve_engine("auto", True, True), "edge")
        self.assertEqual(MAKE_AUDIO.resolve_engine("auto", True, False), "windows")
        self.assertEqual(MAKE_AUDIO.resolve_engine("auto", False, True), "windows")

    def test_explicit_engine_is_preserved(self):
        self.assertEqual(MAKE_AUDIO.resolve_engine("edge", False, False), "edge")
        self.assertEqual(MAKE_AUDIO.resolve_engine("windows", True, True), "windows")


if __name__ == "__main__":
    unittest.main()
