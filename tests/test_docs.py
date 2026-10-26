import pathlib
import re
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
REQUIRED = [
    "CONTRIBUTING.md", "SECURITY.md", "CODE_OF_CONDUCT.md",
    ".github/PULL_REQUEST_TEMPLATE.md",
    ".github/ISSUE_TEMPLATE/bug_report.md",
    ".github/ISSUE_TEMPLATE/feature_request.md",
    "guides/getting-started.md", "guides/voices-and-privacy.md",
    "guides/audio-export.md", "guides/development.md",
    "guides/architecture.md", "guides/tts-provider-evaluation.md",
]


class DocumentationTests(unittest.TestCase):
    def test_required_project_documents_exist(self):
        for relative in REQUIRED:
            self.assertTrue((ROOT / relative).is_file(), relative)

    def test_local_markdown_links_resolve(self):
        for markdown in [ROOT / "README.md", *(ROOT / "guides").glob("*.md"), ROOT / "CONTRIBUTING.md"]:
            text = markdown.read_text(encoding="utf-8")
            for target in re.findall(r"\[[^]]+\]\(([^)]+)\)", text):
                if "://" in target or target.startswith("#"):
                    continue
                path = target.split("#", 1)[0]
                self.assertTrue((markdown.parent / path).resolve().exists(), f"{markdown}: {target}")


if __name__ == "__main__":
    unittest.main()
