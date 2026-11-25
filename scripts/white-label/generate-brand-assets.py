#!/usr/bin/env python3
"""Growth OS CRM: regenerate every upstream app icon with the ScalePoint mark.

Overwrites the upstream PNGs in packages/twenty-front/public/images/icons/**
(same paths and sizes, so no code or manifest references change) and the
upstream logo SVG used inside the app. Source art:
packages/twenty-front/public/images/growth-os/ (copied from the Growth OS
brand kit, /workspace/projects/growth-os/brand/). Re-run after upstream merges:

    python3 scripts/white-label/generate-brand-assets.py
"""
import base64
import io
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
PUBLIC = ROOT / "packages/twenty-front/public"
BRAND = PUBLIC / "images/growth-os"
ICON = Image.open(BRAND / "favicon-512.png").convert("RGBA")
WHITE = (255, 255, 255, 255)


def app_icon(size: int, pad: float = 0.16, bg=WHITE) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), bg)
    inner = max(1, round(size * (1 - 2 * pad)))
    mark = ICON.copy()
    mark.thumbnail((inner, inner), Image.LANCZOS)
    canvas.alpha_composite(mark, ((size - mark.width) // 2, (size - mark.height) // 2))
    return canvas


def tile(width: int, height: int) -> Image.Image:
    canvas = Image.new("RGBA", (width, height), WHITE)
    side = round(min(width, height) * 0.62)
    mark = ICON.copy()
    mark.thumbnail((side, side), Image.LANCZOS)
    canvas.alpha_composite(mark, ((width - mark.width) // 2, (height - mark.height) // 2))
    return canvas


count = 0
for path in sorted((PUBLIC / "images/icons").rglob("*.png")):
    with Image.open(path) as current:
        width, height = current.size
    image = app_icon(width) if width == height else tile(width, height)
    image.convert("RGB").save(path, optimize=True) if "ios" in path.parts else image.save(path, optimize=True)
    count += 1

# In-app upstream logo (onboarding, app connection header, standard-field badge).
buffer = io.BytesIO()
app_icon(128, pad=0.12).save(buffer, format="PNG", optimize=True)
data = base64.b64encode(buffer.getvalue()).decode()
(PUBLIC / "images/integrations/twenty-logo.svg").write_text(
    '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">'
    '<title>Growth OS CRM</title>'
    f'<image width="40" height="40" href="data:image/png;base64,{data}"/></svg>\n'
)
print(f"Regenerated {count} app icons and images/integrations/twenty-logo.svg")
