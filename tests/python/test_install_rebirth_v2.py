"""T04 candidate installer: validate before write, including failure cases."""
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import zipfile

SOURCE = Path(__file__).resolve().parents[2] / 'scripts/install-rebirth-v2.py'
spec = importlib.util.spec_from_file_location('t04_installer', SOURCE)
installer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(installer)


class TestInstaller(unittest.TestCase):
    def test_valid_and_tampered_zip(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            paths = [
                'public/rebirth/art/aze-character.json',
                'public/rebirth/art/aze-character.png',
                'art/rebirth/source/aze-character.ora',
                'public/rebirth/art/urban-ground-atlas.json',
                'public/rebirth/art/urban-ground-atlas.png',
                'art/rebirth/source/urban-ground-atlas.ora',
            ]
            payloads = {p: f'fixture-{i}'.encode() for i, p in enumerate(paths)}
            manifest = {'CHAR-01': {'files': {}}, 'ENV-01': {'files': {}}}
            for p, data in payloads.items():
                key = 'CHAR-01' if 'aze-character' in p else 'ENV-01'
                manifest[key]['files'][p] = hashlib.sha256(data).hexdigest()
            (root / 'manifest.json').write_text(json.dumps(manifest))
            archive = root / 'candidate.zip'
            with zipfile.ZipFile(archive, 'w') as z:
                for p, data in payloads.items():
                    z.writestr(p, data)
            with patch.object(installer, 'ROOT', root), patch.object(installer, 'MANIFEST', root / 'manifest.json'):
                with patch('sys.argv', ['installer', '--check-only', str(archive)]):
                    self.assertEqual(installer.main(), 0)
                    self.assertFalse((root / 'public').exists())
                with patch('sys.argv', ['installer', str(archive)]):
                    self.assertEqual(installer.main(), 0)
                self.assertEqual((root / paths[0]).read_bytes(), payloads[paths[0]])
                with zipfile.ZipFile(archive, 'w') as z:
                    for p, data in payloads.items():
                        z.writestr(p, b'bad' if p == paths[0] else data)
                with patch('sys.argv', ['installer', str(archive)]):
                    with self.assertRaisesRegex(ValueError, 'SHA-256 mismatch'):
                        installer.main()
                self.assertEqual((root / paths[0]).read_bytes(), payloads[paths[0]])


    def test_missing_member_is_rejected_before_any_write(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            paths = ['public/rebirth/art/aze-character.png', 'art/rebirth/source/aze-character.ora']
            payloads = {p: f'fixture-{i}'.encode() for i, p in enumerate(paths)}
            manifest = {
                'CHAR-01': {'files': {p: hashlib.sha256(data).hexdigest() for p, data in payloads.items()}},
                'ENV-01': {'files': {}},
            }
            (root / 'manifest.json').write_text(json.dumps(manifest))
            archive = root / 'candidate.zip'
            with zipfile.ZipFile(archive, 'w') as z:
                z.writestr(paths[0], payloads[paths[0]])
            with patch.object(installer, 'ROOT', root), patch.object(installer, 'MANIFEST', root / 'manifest.json'):
                with patch('sys.argv', ['installer', str(archive)]):
                    with self.assertRaisesRegex(ValueError, 'Missing required archive member'):
                        installer.main()
            self.assertFalse((root / 'public').exists())

    def test_duplicate_member_is_rejected_before_any_write(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            path = 'public/rebirth/art/aze-character.png'
            payload = b'original-v2'
            manifest = {
                'CHAR-01': {'files': {path: hashlib.sha256(payload).hexdigest()}},
                'ENV-01': {'files': {}},
            }
            (root / 'manifest.json').write_text(json.dumps(manifest))
            archive = root / 'candidate.zip'
            with zipfile.ZipFile(archive, 'w') as z:
                z.writestr(path, payload)
                z.writestr(path, payload)
            with patch.object(installer, 'ROOT', root), patch.object(installer, 'MANIFEST', root / 'manifest.json'):
                with patch('sys.argv', ['installer', str(archive)]):
                    with self.assertRaisesRegex(ValueError, 'Duplicate required ZIP member'):
                        installer.main()
            self.assertFalse((root / 'public').exists())

    def test_oversized_member_is_rejected_before_any_write(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            path = 'public/rebirth/art/aze-character.png'
            payload = b'x' * 2_000_001
            manifest = {
                'CHAR-01': {'files': {path: hashlib.sha256(payload).hexdigest()}},
                'ENV-01': {'files': {}},
            }
            (root / 'manifest.json').write_text(json.dumps(manifest))
            archive = root / 'candidate.zip'
            with zipfile.ZipFile(archive, 'w', compression=zipfile.ZIP_DEFLATED) as z:
                z.writestr(path, payload)
            with patch.object(installer, 'ROOT', root), patch.object(installer, 'MANIFEST', root / 'manifest.json'):
                with patch('sys.argv', ['installer', str(archive)]):
                    with self.assertRaisesRegex(ValueError, 'Invalid archive member'):
                        installer.main()
            self.assertFalse((root / 'public').exists())


if __name__ == '__main__':
    unittest.main()
