#!/usr/bin/env python3
"""Losslessly restore the reviewed ENV-01 atlas from its exact indexed pixels."""
import base64, hashlib, zlib
from pathlib import Path
from PIL import Image
PALETTE_HEX = "182b37ff1c2b37ff1d3040ff1e3645ff233744ff273748ff334b5cff344a59ff3b5162ff3e5364ff476b7bff526474ff647788ff74838fff758a94ff9caeb7ffa5b4b9ffd3bd93ffd9e6e3ffe3d8b5ffe4e9e5ffefb55cff"
INDEXED_ZLIB_BASE64 = """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"""
EXPECTED_RGBA_SHA256 = "81baf1fcaa72604f7b2c1b7877c4804c5828992bba816f393180d77b8496c73b"
def main():
    palette = bytes.fromhex(PALETTE_HEX)
    indices = zlib.decompress(base64.b64decode("".join(INDEXED_ZLIB_BASE64.split())))
    assert len(indices) == 128 * 128
    rgba = b"".join(palette[i*4:i*4+4] for i in indices)
    assert hashlib.sha256(rgba).hexdigest() == EXPECTED_RGBA_SHA256
    target = Path(__file__).resolve().parent.parent / "public/rebirth/art/urban-ground-atlas.png"
    target.parent.mkdir(parents=True,exist_ok=True)
    Image.frombytes("RGBA", (128,128), rgba).save(target, optimize=True)
    print("Restored reviewed ENV-01 pixels:", target, target.stat().st_size)
if __name__ == "__main__": main()
