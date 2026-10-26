import importlib.util
import pathlib
import shutil
import tempfile
import unittest
import zipfile


ROOT = pathlib.Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("petal_build", ROOT / "tools" / "build.py")
BUILD = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(BUILD)


def copy_build_inputs(destination):
    shutil.copytree(ROOT / "src", destination / "src")
    shutil.copytree(ROOT / "assets", destination / "assets")
    shutil.copytree(ROOT / "vscode-extension", destination / "vscode-extension")


class DeterministicBuildTests(unittest.TestCase):
    def test_committed_generated_outputs_are_current(self):
        self.assertEqual(BUILD.check_generated(ROOT), [])

    def test_vsix_metadata_is_normalized_and_sorted(self):
        package = next((ROOT / "vscode-extension").glob("*.vsix"))
        with zipfile.ZipFile(package) as archive:
            infos = archive.infolist()
        self.assertEqual([info.filename for info in infos], sorted(info.filename for info in infos))
        self.assertTrue(all(info.date_time == BUILD.FIXED_ZIP_TIME for info in infos))
        self.assertTrue(all(info.create_system == 3 for info in infos))
        self.assertTrue(all((info.external_attr >> 16) == 0o100644 for info in infos))

    def test_two_clean_builds_are_byte_identical(self):
        with tempfile.TemporaryDirectory(prefix="petal-build-a-") as first_dir:
            with tempfile.TemporaryDirectory(prefix="petal-build-b-") as second_dir:
                first = pathlib.Path(first_dir)
                second = pathlib.Path(second_dir)
                copy_build_inputs(first)
                copy_build_inputs(second)
                first_package = BUILD.build_all(first)
                second_package = BUILD.build_all(second)
                self.assertEqual(first_package.read_bytes(), second_package.read_bytes())


if __name__ == "__main__":
    unittest.main()
