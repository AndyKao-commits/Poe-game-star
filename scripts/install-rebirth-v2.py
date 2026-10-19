#!/usr/bin/env python3
"""Install exactly the owner-approved Rebirth V2 candidate files from a ZIP.

Usage:
    python3 scripts/install-rebirth-v2.py /path/to/rebirth_t04_v2.zip

Only writes the six files named in the SHA-256 manifest after validating ALL
members first. Does not enable the game, modify metadata approvals or deploy.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import pathlib
import sys
import zipfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
MANIFEST = ROOT / "docs/rebirth/T04_CANDIDATE_MANIFEST.json"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check-only', action='store_true')
    parser.add_argument('archive')
    args = parser.parse_args()

    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    expected = {
        path: digest
        for asset_id in ("CHAR-01", "ENV-01")
        for path, digest in manifest[asset_id]["files"].items()
    }

    with zipfile.ZipFile(args.archive) as archive:
        names = archive.namelist()
        for name in expected:
            if names.count(name) > 1:
                raise ValueError(f'Duplicate required ZIP member: {name}')
        for name, digest in expected.items():
            if name not in names:
                raise ValueError(f"Missing required archive member: {name}")
            member = archive.getinfo(name)
            if member.is_dir() or member.file_size > 2_000_000:
                raise ValueError(f"Invalid archive member: {name}")
            data = archive.read(name)
            if hashlib.sha256(data).hexdigest() != digest:
                raise ValueError(f"SHA-256 mismatch: {name}")

        if args.check_only:
            print('PASS: all six candidate SHA-256 hashes verified; no files written.')
            return 0

        # Verify everything before changing any project files.
        for name in expected:
            destination = ROOT / name
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_bytes(archive.read(name))
            print(f"Installed: {name}")

    print("PASS: six exact V2 files installed. Art remains provisional; entry gate unchanged.")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (OSError, ValueError, zipfile.BadZipFile) as error:
        print(f"BLOCKED: {error}", file=sys.stderr)
        sys.exit(1)
