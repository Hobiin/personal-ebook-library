"""Membuat ikon PWA (PNG) tanpa library tambahan. Jalankan dari akar proyek:
    python tools/make_icons.py
"""
import struct
import zlib
from pathlib import Path

ACCENT = (47, 107, 94)      # hijau tua #2F6B5E
PAPER = (250, 248, 245)     # krem #FAF8F5

# Bentuk ikon dalam koordinat relatif 0..1: (x0, y0, x1, y1, warna)
SHAPES = [
    (0.24, 0.30, 0.49, 0.70, PAPER),   # halaman kiri
    (0.51, 0.30, 0.76, 0.70, PAPER),   # halaman kanan
]
# Garis teks tipis di tiap halaman
for page_x0 in (0.24, 0.51):
    for i, y in enumerate((0.40, 0.48, 0.56)):
        x_end = page_x0 + 0.25 - (0.10 if i == 2 else 0.04)
        SHAPES.append((page_x0 + 0.04, y, x_end, y + 0.02, ACCENT))


def render(size):
    rows = []
    for py in range(size):
        y = (py + 0.5) / size
        row = bytearray([0])  # filter byte: 0 (None)
        for px in range(size):
            x = (px + 0.5) / size
            color = ACCENT
            for x0, y0, x1, y1, c in SHAPES:
                if x0 <= x < x1 and y0 <= y < y1:
                    color = c
            row.extend(color)
        rows.append(bytes(row))
    return b"".join(rows)


def write_png(path, size):
    def chunk(tag, data):
        body = tag + data
        return (struct.pack(">I", len(data)) + body
                + struct.pack(">I", zlib.crc32(body) & 0xFFFFFFFF))

    header = struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)  # 8-bit RGB
    data = (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", header)
            + chunk(b"IDAT", zlib.compress(render(size), 9))
            + chunk(b"IEND", b""))
    Path(path).write_bytes(data)
    print("dibuat:", path, f"({size}x{size})")


out = Path("assets/icons")
out.mkdir(parents=True, exist_ok=True)
write_png(out / "icon-180.png", 180)            # apple-touch-icon (iOS)
write_png(out / "icon-192.png", 192)            # manifest
write_png(out / "icon-512.png", 512)            # manifest
write_png(out / "icon-maskable-512.png", 512)   # manifest (maskable)