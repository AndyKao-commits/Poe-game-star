#!/usr/bin/env python3
"""Reconstruct pixel-identical CHAR-01 V2 artwork from the reviewed candidate.
The indexed pixels are losslessly embedded; no placeholder or legacy assets.
This is a recovery exporter, not a substitute for the original layered ORA.
"""
import base64, hashlib, io, zlib
from pathlib import Path
from PIL import Image
PALETTE_HEX = "00000000141c2cff1d2839ff26374bff2d4358ff3b4b5eff4ce0e0ff536e7cff725044ffad585dffad7469ffb8c5c8ffc7ffffffd5a66cffd8a18affff6672ffffc7b5ff"
INDEXED_ZLIB_BASE64 = """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"""
EXPECTED_RGBA_SHA256 = "19c2dba86a069d912e489e7799751b10198a9e52506ce06f8c39ba2fa48f8bf3"
def main():
    palette = bytes.fromhex(PALETTE_HEX)
    indices = zlib.decompress(base64.b64decode("".join(INDEXED_ZLIB_BASE64.split())))
    assert len(indices) == 288 * 192
    rgba = b"".join(palette[i*4:i*4+4] for i in indices)
    assert hashlib.sha256(rgba).hexdigest() == EXPECTED_RGBA_SHA256
    image = Image.frombytes("RGBA", (288,192), rgba)
    target = Path(__file__).resolve().parent.parent / "public/rebirth/art/aze-character.png"
    target.parent.mkdir(parents=True,exist_ok=True)
    image.save(target, optimize=True)
    print("Restored reviewed CHAR-01 V2 pixels:", target, target.stat().st_size)
if __name__ == "__main__": main()
