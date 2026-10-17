"""Storytime → animated watercolor video. Every frame and every sound is generated in code.

Style derived from the reference sheet in motion/refs (watercolor washes with bleeding edges, thin
wobbly ink outlines, round characters with dot eyes, grainy white paper). No reference artwork is
copied; motifs are original primitives in that style. See motion/notes.md for the style spec.

    render_storybook_video(book, out_path)   # book = {"title", "pages": [{"text", "text_native", "illustration"}]}
"""
import math
import os
import re
import subprocess
import tempfile
import wave

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

W, H, FPS = 720, 1280, 24
TITLE_DUR, PAGE_DUR, OUTRO_DUR, TURN = 3.0, 4.8, 3.2, 0.45

# Palette sampled from the references (Pillow k-means over all 15 images), plus a leaf green.
PAPER = (246, 242, 233)
INK = (36, 33, 25)
WASH = {
    "peach": (207, 147, 124), "sky": (106, 156, 184), "sand": (226, 188, 156), "deep": (56, 107, 134),
    "rose": (197, 83, 92), "mustard": (210, 162, 44), "cocoa": (129, 79, 60), "leaf": (111, 154, 91),
}
PAGE_WASHES = [("sky", "sand"), ("peach", "leaf"), ("mustard", "sky"), ("rose", "sand"), ("leaf", "peach"), ("deep", "mustard")]

FONT_DIR = "/System/Library/Fonts"
TEXT_FONT = f"{FONT_DIR}/Supplemental/ChalkboardSE.ttc"
CJK_FONT = f"{FONT_DIR}/STHeiti Medium.ttc"


def _font(path, size, fallback="/System/Library/Fonts/Supplemental/Georgia.ttf"):
    try:
        return ImageFont.truetype(path, size)
    except OSError:
        return ImageFont.truetype(fallback, size)


# ---------- animation kit ----------

def clamp(x, a=0.0, b=1.0):
    return max(a, min(b, x))


def seg(t, start, end):
    return clamp((t - start) / max(1e-6, end - start))


def smooth(x):
    return x * x * (3 - 2 * x)


def ease_out_back(x, s=1.70158):
    x -= 1
    return 1 + x * x * ((s + 1) * x + s)


# ---------- watercolor primitives ----------

_grain = None


def paper():
    global _grain
    if _grain is None:
        rng = np.random.default_rng(7)
        n = rng.normal(0, 1, (H // 2, W // 2)).astype(np.float32)
        n = np.asarray(Image.fromarray(((n * 18) + 128).clip(0, 255).astype(np.uint8)).resize((W, H), Image.BILINEAR)).astype(np.float32) - 128
        base = np.array(PAPER, np.float32)[None, None] + n[..., None] * 0.35
        _grain = Image.fromarray(base.clip(0, 255).astype(np.uint8))
    return _grain.copy()


def _blob_points(cx, cy, r, rng, wobble=0.18, n=48, squash=1.0):
    phase = rng.uniform(0, 2 * math.pi, 4)
    pts = []
    for k in range(n):
        a = 2 * math.pi * k / n
        rr = r * (1 + wobble * (0.5 * math.sin(3 * a + phase[0]) + 0.3 * math.sin(5 * a + phase[1]) + 0.2 * math.sin(7 * a + phase[2])))
        pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a) * squash))
    return pts


def wash_layer(size, color, seed, cx, cy, r, alpha=150, squash=1.0):
    """A soft watercolor pool: noisy edge, granulation, darker rim where pigment collects."""
    rng = np.random.default_rng(seed)
    w, h = size
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).polygon(_blob_points(cx, cy, r, rng, 0.22, 64, squash), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(r * 0.06 + 2))
    rim = ImageChops.subtract(mask, mask.filter(ImageFilter.GaussianBlur(r * 0.12 + 3)))
    m = np.asarray(mask, np.float32) / 255
    g = rng.normal(0, 1, (h // 4 + 1, w // 4 + 1)).astype(np.float32)
    g = np.asarray(Image.fromarray(((g * 40) + 128).clip(0, 255).astype(np.uint8)).resize((w, h), Image.BILINEAR), np.float32) / 255
    a = (m * (0.75 + 0.35 * g) + np.asarray(rim, np.float32) / 255 * 0.9).clip(0, 1) * alpha
    layer = np.zeros((h, w, 4), np.uint8)
    layer[..., :3] = color
    layer[..., 3] = a.clip(0, 255).astype(np.uint8)
    return Image.fromarray(layer, "RGBA")


def ink_path(draw, pts, rng, width=3, closed=True, jitter=1.6):
    pts = [(x + rng.normal(0, jitter), y + rng.normal(0, jitter)) for x, y in pts]
    if closed:
        pts = pts + pts[:1]
    draw.line(pts, fill=INK + (235,), width=width, joint="curve")


def face(draw, cx, cy, s, rng, mood="smile"):
    ex = s * 0.28
    for sx in (-1, 1):
        draw.ellipse([cx + sx * ex - s * 0.07, cy - s * 0.09, cx + sx * ex + s * 0.07, cy + s * 0.05], fill=INK + (255,))
        draw.ellipse([cx + sx * ex - s * 0.025, cy - s * 0.06, cx + sx * ex + s * 0.01, cy - s * 0.025], fill=(255, 255, 255, 230))
        draw.ellipse([cx + sx * (ex + s * 0.1) - s * 0.09, cy + s * 0.08, cx + sx * (ex + s * 0.1) + s * 0.09, cy + s * 0.16], fill=WASH["rose"] + (110,))
    if mood == "smile":
        draw.arc([cx - s * 0.13, cy + s * 0.02, cx + s * 0.13, cy + s * 0.2], 15, 165, fill=INK + (255,), width=max(2, int(s * 0.035)))
    else:
        draw.arc([cx - s * 0.1, cy + s * 0.14, cx + s * 0.1, cy + s * 0.26], 200, 340, fill=INK + (255,), width=max(2, int(s * 0.035)))


# ---------- motifs: original characters/objects in the reference style ----------

def _canvas(s):
    return Image.new("RGBA", (s, s), (0, 0, 0, 0))


def motif(kind, s, seed, boil):
    """Draw one motif on an s×s transparent sprite. boil = 0..2 re-jitters the ink (hand-drawn 'boil')."""
    rng = np.random.default_rng(seed * 10 + boil)
    img = _canvas(s)
    c = s / 2
    def fill(color, cx, cy, r, squash=1.0, alpha=200):
        img.alpha_composite(wash_layer((s, s), color, seed + int(r), cx, cy, r, alpha, squash))
    d = ImageDraw.Draw(img)
    lw = max(2, s // 90)

    if kind in ("kid", "grandma", "mom", "brother", "cousins"):
        col = {"kid": "sand", "grandma": "peach", "mom": "rose", "brother": "sky", "cousins": "leaf"}[kind]
        fill(WASH[col], c, c * 1.05, s * 0.32, 1.05)
        ink_path(d, _blob_points(c + 4, c * 1.05 - 3, s * 0.31, np.random.default_rng(seed), 0.08, 40, 1.05), rng, lw)
        if kind == "grandma":
            fill(WASH["sand"], c, c * 0.62, s * 0.16, 0.7, 210)
            ink_path(d, _blob_points(c, c * 0.62, s * 0.15, np.random.default_rng(seed + 1), 0.1, 24, 0.7), rng, lw)
        if kind == "brother":  # little cap so he never reads as the sun
            fill(WASH["deep"], c, c * 0.72, s * 0.2, 0.45, 230)
            ink_path(d, [(c - s * 0.22, c * 0.78), (c - s * 0.1, c * 0.6), (c + s * 0.12, c * 0.6), (c + s * 0.22, c * 0.76), (c + s * 0.36, c * 0.8)], rng, lw, closed=False)
        face(d, c, c * 1.0, s * 0.42, rng)
        for k in range(4):  # little dangling legs, like the jellyfish/duck refs
            x = c - s * 0.15 + k * s * 0.1
            d.line([(x, c * 1.05 + s * 0.3), (x + rng.normal(0, 3), c * 1.05 + s * 0.42)], fill=INK + (230,), width=lw)
        if kind == "cousins":
            for dx in (-0.36, 0.36):
                fill(WASH["sky" if dx < 0 else "peach"], c + dx * s, c * 1.25, s * 0.13)
                face(d, c + dx * s, c * 1.22, s * 0.18, rng)
    elif kind == "sun":
        for k in range(12):
            a = 2 * math.pi * k / 12 + boil * 0.04
            ink_path(d, [(c + math.cos(a) * s * 0.3, c + math.sin(a) * s * 0.3), (c + math.cos(a) * s * 0.44, c + math.sin(a) * s * 0.44)], rng, lw, closed=False)
        fill(WASH["mustard"], c, c, s * 0.25)
        ink_path(d, _blob_points(c, c, s * 0.24, np.random.default_rng(seed), 0.05, 36), rng, lw)
        face(d, c, c, s * 0.32, rng)
    elif kind == "mango":
        fill(WASH["mustard"], c, c * 1.05, s * 0.28, 1.2)
        fill(WASH["peach"], c + s * 0.08, c * 1.15, s * 0.16, 1.1, 150)
        ink_path(d, _blob_points(c, c * 1.05, s * 0.27, np.random.default_rng(seed), 0.07, 36, 1.2), rng, lw)
        fill(WASH["leaf"], c + s * 0.12, c * 0.55, s * 0.1, 0.5, 220)
        d.line([(c, c * 0.62), (c + s * 0.02, c * 0.5)], fill=INK + (240,), width=lw + 1)
        face(d, c, c * 1.08, s * 0.32, rng)
    elif kind == "icecream":
        cone = [(c - s * 0.16, c * 1.05), (c + s * 0.16, c * 1.05), (c, s * 0.9)]
        fill(WASH["sand"], c, s * 0.72, s * 0.14, 1.6)
        ink_path(d, cone, rng, lw)
        for k in range(3):
            d.line([(c - s * 0.12 + k * s * 0.08, c * 1.08), (c - s * 0.02 + k * s * 0.05, s * 0.85)], fill=INK + (120,), width=1)
        for i, (col, dy) in enumerate([("rose", 0.0), ("sky", -0.2), ("sand", -0.38)]):
            fill(WASH[col], c, c * (0.98 + dy), s * 0.17)
            ink_path(d, _blob_points(c, c * (0.98 + dy), s * 0.165, np.random.default_rng(seed + i), 0.06, 30), rng, lw)
        face(d, c, c * 0.62, s * 0.24, rng)
    elif kind == "house":
        fill(WASH["sand"], c, c * 1.2, s * 0.28, 0.75)
        ink_path(d, [(c - s * 0.3, c * 0.95), (c + s * 0.3, c * 0.95), (c + s * 0.3, c * 1.48), (c - s * 0.3, c * 1.48)], rng, lw)
        fill(WASH["rose"], c, c * 0.75, s * 0.26, 0.5, 210)
        ink_path(d, [(c - s * 0.38, c * 0.96), (c, c * 0.45), (c + s * 0.38, c * 0.96)], rng, lw, closed=False)
        fill(WASH["sky"], c, c * 1.32, s * 0.06, 1.4, 220)
        ink_path(d, [(c - s * 0.06, c * 1.48), (c - s * 0.06, c * 1.18), (c + s * 0.06, c * 1.18), (c + s * 0.06, c * 1.48)], rng, lw, closed=False)
    elif kind == "broom":
        d.line([(c - s * 0.25, c * 0.4), (c + s * 0.05, c * 1.2)], fill=WASH["cocoa"] + (255,), width=lw * 3)
        fill(WASH["mustard"], c + s * 0.12, c * 1.42, s * 0.18, 0.8)
        for k in range(7):
            x0 = c + s * 0.0 + k * s * 0.04
            ink_path(d, [(c + s * 0.05, c * 1.2), (x0 + rng.normal(0, 4), c * 1.65)], rng, max(1, lw - 1), closed=False)
    elif kind == "city":
        for k, (col, hh) in enumerate([("sky", 0.55), ("sand", 0.75), ("deep", 0.45)]):
            x = c - s * 0.32 + k * s * 0.22
            top = s * (0.9 - hh)
            fill(WASH[col], x + s * 0.1, (top + s * 0.9) / 2, s * 0.12, hh / 0.24 * 0.95, 190)
            ink_path(d, [(x, s * 0.9), (x, top), (x + s * 0.2, top), (x + s * 0.2, s * 0.9)], rng, lw, closed=False)
            for wy in np.arange(top + s * 0.06, s * 0.85, s * 0.09):
                d.rectangle([x + s * 0.05, wy, x + s * 0.08, wy + s * 0.04], fill=INK + (150,))
    elif kind == "school":
        fill(WASH["rose"], c, c * 1.1, s * 0.26, 1.0)
        ink_path(d, [(c - s * 0.24, c * 0.85), (c + s * 0.24, c * 0.85), (c + s * 0.24, c * 1.4), (c - s * 0.24, c * 1.4)], rng, lw)
        ink_path(d, [(c - s * 0.12, c * 0.85), (c - s * 0.1, c * 0.62), (c + s * 0.1, c * 0.62), (c + s * 0.12, c * 0.85)], rng, lw, closed=False)
        face(d, c, c * 1.12, s * 0.3, rng)
    elif kind == "heart":
        fill(WASH["rose"], c - s * 0.1, c * 0.9, s * 0.15)
        fill(WASH["rose"], c + s * 0.1, c * 0.9, s * 0.15)
        fill(WASH["rose"], c, c * 1.1, s * 0.17, 1.1)
        ink_path(d, [(c, c * 1.45)] + [(c + s * 0.27 * math.sin(a) ** 3 * 1.0, c * 0.95 - s * 0.02 * (13 * math.cos(a) - 5 * math.cos(2 * a) - 2 * math.cos(3 * a) - math.cos(4 * a))) for a in np.linspace(0.1, 2 * math.pi - 0.1, 40)], rng, lw)
    else:  # "bubbles": the fallback, like the dotted bubbles in the pufferfish ref
        for k in range(7):
            x, y, r = rng.uniform(s * 0.2, s * 0.8), rng.uniform(s * 0.2, s * 0.8), rng.uniform(s * 0.04, s * 0.1)
            fill(WASH["sky"], x, y, r, 1.0, 120)
            d.ellipse([x - r, y - r, x + r, y + r], outline=INK + (200,), width=max(1, lw - 1))
    return img


# Characters first (kids connect with faces), then objects, then mood.
KEYWORDS = [
    (r"cousin", "cousins"), (r"brother|ah-?wei", "brother"), (r"grandma|ah-?ma|granny", "grandma"),
    (r"\bmom\b|mama|mother", "mom"),
    (r"mango|fruit", "mango"), (r"ice ?cream|cone", "icecream"), (r"broom|sweep", "broom"),
    (r"school|bag", "school"), (r"house|home|roof|courtyard", "house"), (r"city|town|road|street|building|taipei", "city"),
    (r"sun|sunny|summer|bright", "sun"), (r"love|warm|heart|hug|smile", "heart"),
]


def pick_motifs(text):
    found = []
    for pat, kind in KEYWORDS:
        if re.search(pat, text, re.I) and kind not in found:
            found.append(kind)
    if not found:
        found = ["kid"]
    return found[:2]


# ---------- text ----------

def wrap(draw, text, font, max_w):
    out = []
    for raw in text.split("\n"):
        words, line = raw.split(), ""
        for w in words:
            test = (line + " " + w).strip()
            if draw.textlength(test, font=font) <= max_w:
                line = test
            else:
                out.append(line)
                line = w
        if line:
            out.append(line)
    return out


def wrap_cjk(draw, text, font, max_w):
    out = []
    for raw in text.split("\n"):
        line = ""
        for ch in raw:
            if draw.textlength(line + ch, font=font) > max_w:
                out.append(line)
                line = ch
            else:
                line += ch
        if line:
            out.append(line)
    return out


def text_sprite(lines, font, color, line_h):
    scratch = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
    w = int(max((scratch.textlength(l, font=font) for l in lines), default=1)) + 20
    img = Image.new("RGBA", (w, line_h * len(lines) + 20), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    for i, l in enumerate(lines):
        d.text((10, 10 + i * line_h), l, font=font, fill=color + (255,))
    return img


# ---------- scenes ----------

TITLE_SLOT = 0
SPRITE = 360


def slots(n):
    """Screen positions for 1 or 2 characters on a card."""
    return [(W * 0.5, H * 0.66)] if n == 1 else [(W * 0.27, H * 0.64), (W * 0.73, H * 0.70)]


class Card:
    """One card of the movie (title, a page, or the end). Text is laid out once; drawing is compositing."""

    def __init__(self, kind, idx, title="", text="", native=None, illustration=""):
        self.kind, self.idx = kind, idx
        f_title, f_text, f_cjk = _font(TEXT_FONT, 74), _font(TEXT_FONT, 50), _font(CJK_FONT, 40)
        scratch = ImageDraw.Draw(Image.new("RGB", (1, 1)))
        self.lines, self.native = [], None
        if kind == "title":
            self.kicker = text_sprite(["S T O R Y T I M E"], _font(TEXT_FONT, 30), WASH["rose"], 38)
            self.lines = [text_sprite([l], f_title, INK, 84) for l in wrap(scratch, title, f_title, W - 140)]
            self.actors = ["sun", pick_motifs(title + " " + illustration)[0]]
        elif kind == "outro":
            self.lines = [text_sprite(["Told by Grandma"], f_title, INK, 84), text_sprite(["fireside"], _font(TEXT_FONT, 34), WASH["rose"], 40)]
            self.actors = ["grandma", "heart"]
        else:
            self.lines = [text_sprite([l], f_text, INK, 64) for l in wrap(scratch, text, f_text, W - 130)]
            if native:
                self.native = text_sprite(wrap_cjk(scratch, native, f_cjk, W - 140), f_cjk, WASH["deep"], 54)
            self.actors = pick_motifs(text + " " + illustration)
        if len(self.actors) > 1 and self.actors[0] == self.actors[1]:
            self.actors = self.actors[:1]
        self.pos = dict(zip(self.actors, slots(len(self.actors))))

    def rest_time(self, dur):
        """When this card's reveal is done: the viewer pauses here."""
        if self.kind == "page":
            return min(dur - TURN - 0.05, line_times(len(self.lines), len(self.lines))[1] + 0.4)
        return min(dur - TURN - 0.05, 1.6)

    def draw_text(self, img, t, dx):
        """Text for this card at local time t, shifted by dx (it travels with the page during a pan)."""
        if self.kind == "title":
            k = self.kicker
            img.alpha_composite(_fade(k, seg(t, 0.2, 0.7)), (int(dx + W / 2 - k.width / 2), 230))
            y = 290
            for ln in self.lines:
                p = smooth(seg(t, 0.4, 1.1))
                img.alpha_composite(_fade(ln, p), (int(dx + W / 2 - ln.width / 2), int(y + (1 - p) * 30)))
                y += ln.height - 22
        elif self.kind == "outro":
            for i, ln in enumerate(self.lines):
                p = smooth(seg(t, 0.3 + 0.4 * i, 1.0 + 0.4 * i))
                img.alpha_composite(_fade(ln, p), (int(dx + W / 2 - ln.width / 2), int(330 + i * 95 + (1 - p) * 24)))
        else:
            y = 160
            n = len(self.lines)
            for i, ln in enumerate(self.lines):
                a, b = line_times(i, n)
                p = smooth(seg(t, a, b))
                img.alpha_composite(_fade(ln, p), (int(dx + W / 2 - ln.width / 2), int(y + (1 - p) * 22)))
                y += ln.height - 18
            if self.native is not None:
                a, b = line_times(n, n)
                p = smooth(seg(t, a, b + 0.3))
                img.alpha_composite(_fade(self.native, p), (int(dx + W / 2 - self.native.width / 2), y + 26))


def line_times(i, n):
    """When line i (of n) fades in on a page; index n = the native-language block. Fits in ~2.6 s."""
    step = min(0.6, 2.2 / max(1, n))
    start = 0.35 + i * step
    return start, start + 0.45


def _fade(img, p):
    if p >= 1:
        return img
    out = img.copy()
    out.putalpha(img.getchannel("A").point(lambda v: int(v * p)))
    return out


class Movie:
    """All cards laid side by side in one watercolor world; the camera pans between them and the
    characters who stay in the story travel with you from card to card."""

    def __init__(self, book):
        pages = book["pages"]
        self.cards = [Card("title", 0, title=book["title"], illustration=pages[0].get("illustration", ""))]
        self.cards += [Card("page", i + 1, text=p["text"], native=p.get("text_native"), illustration=p.get("illustration", "")) for i, p in enumerate(pages)]
        self.cards.append(Card("outro", len(pages) + 1))
        self.durs = [TITLE_DUR] + [PAGE_DUR] * len(pages) + [OUTRO_DUR]
        self.starts = list(np.cumsum([0] + self.durs[:-1]))
        self.total = float(sum(self.durs))

        # one continuous panorama: each card's washes sit in its stretch of the world and bleed into the next
        n = len(self.cards)
        world = Image.new("RGB", (W * n + W, H))
        g = paper()
        for k in range(n + 1):
            world.paste(g, (k * W, 0))
        world = world.convert("RGBA")
        for k, card in enumerate(self.cards):
            rng = np.random.default_rng(100 + k * 17)
            cols = PAGE_WASHES[(k - 1) % len(PAGE_WASHES)] if card.kind == "page" else (("peach", "sky") if card.kind == "title" else ("sand", "rose"))
            for j, col in enumerate(cols):
                r = W * rng.uniform(0.34, 0.46)
                cx = k * W + W * (0.22 + 0.56 * j) + rng.uniform(-80, 80)
                cy = H * (0.6 + 0.12 * j) + rng.uniform(-90, 90)
                box = (int(cx - r * 1.6), 0, int(cx + r * 1.6), H)
                layer = wash_layer((box[2] - box[0], H), WASH[col], 100 + k * 17 + j, cx - box[0], cy, r, 95, 1.1)
                world.alpha_composite(layer, (max(0, box[0]), 0), (max(0, -box[0]), 0))
        self.world = world.convert("RGB")

        kinds = sorted({a for c in self.cards for a in c.actors})
        self.sprites = {a: [motif(a, SPRITE, 300 + i, b) for b in range(3)] for i, a in enumerate(kinds)}
        self._scaled = {}

    def card_at(self, t):
        k = max(i for i, s in enumerate(self.starts) if s <= t)
        return k, t - self.starts[k]

    def rest_times(self):
        """Absolute times where each card has finished revealing (the viewer pauses on these)."""
        return [round(float(s + c.rest_time(d)), 2) for c, s, d in zip(self.cards, self.starts, self.durs)]

    def _sprite(self, kind, boil, scale):
        key = (kind, boil, round(scale, 2))
        if key not in self._scaled:
            sp = self.sprites[kind][boil]
            w = max(1, int(SPRITE * scale))
            self._scaled[key] = sp.resize((w, w), Image.LANCZOS) if w != SPRITE else sp
            if len(self._scaled) > 400:
                self._scaled.clear()
        return self._scaled[key]

    def frame(self, t):
        k, local = self.card_at(t)
        card, dur = self.cards[k], self.durs[k]
        pan = smooth(seg(local, dur - TURN, dur)) if k + 1 < len(self.cards) else 0.0
        cam = k * W + pan * W + math.sin(t * 0.35) * 6  # gentle drift so nothing is ever fully still
        img = self.world.crop((int(cam), 0, int(cam) + W, H)).convert("RGBA")
        boil = int(t * 8) % 3

        # text belongs to the page, so it slides away with the world during the pan
        card.draw_text(img, local, -(cam - k * W))

        nxt = self.cards[k + 1] if k + 1 < len(self.cards) else None
        placed = []
        for a in card.actors:
            x0, y0 = card.pos[a]
            if nxt is not None and a in nxt.pos and pan > 0:
                # stays in the story: hops across to its spot on the next card while the world moves under it
                x1, y1 = nxt.pos[a]
                q = smooth(pan)
                x, y = x0 + (x1 - x0) * q, y0 + (y1 - y0) * q - math.sin(math.pi * q) * 120
                scale = 1.0 + 0.08 * math.sin(math.pi * q)
            else:
                # leaving: anchored to its page, drifts off with the scenery
                x, y = x0 - pan * W, y0
                scale = 1.0
                if k == 0:  # first card: characters pop in
                    scale = max(0.01, ease_out_back(seg(local, 0.35 + 0.25 * card.actors.index(a), 1.0 + 0.25 * card.actors.index(a))))
            y += math.sin(t * 2.4 + hash(a) % 7) * 12
            placed.append((a, x, y, scale))
        if nxt is not None and pan > 0:
            for a in nxt.actors:
                if a not in card.pos:  # arriving with the next page from the right
                    x1, y1 = nxt.pos[a]
                    placed.append((a, x1 + (1 - pan) * W, y1 + math.sin(t * 2.4 + hash(a) % 7) * 12, 1.0))
        for a, x, y, scale in placed:
            sp = self._sprite(a, boil, scale)
            img.alpha_composite(sp, (int(x - sp.width / 2), int(y - sp.height / 2)))
        return img.convert("RGB")


# ---------- soundtrack ----------

SR = 48000
PENTA = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99]  # C major pentatonic


def score(movie):
    scenes, starts, total = list(zip(movie.cards, movie.durs)), movie.starts, movie.total
    t = np.arange(int(SR * total)) / SR
    out = np.zeros_like(t)

    def env_add(t0, sig_fn, dur, gain):
        i0, i1 = int(t0 * SR), min(len(t), int((t0 + dur) * SR))
        if i0 >= len(t):
            return
        x = t[i0:i1] - t0
        fade = np.minimum(1, x / 0.005) * np.minimum(1, (dur - x) / 0.02)
        out[i0:i1] += gain * sig_fn(x) * fade

    def pluck(t0, f, gain=0.35):
        env_add(t0, lambda x: (np.sin(2 * np.pi * f * x) + 0.3 * np.sin(4 * np.pi * f * x)) * np.exp(-x * 5), 1.6, gain)

    def bell(t0, f, gain=0.3):
        env_add(t0, lambda x: sum(a * np.sin(2 * np.pi * f * m * x) for m, a in [(1, 1), (2.76, 0.4), (5.4, 0.2)]) * np.exp(-x * 2.2), 3.0, gain)

    def swish(t0, gain=0.12):
        rng = np.random.default_rng(int(t0 * 100))
        n = rng.normal(0, 1, int(0.5 * SR) + 8)
        n = np.convolve(n, np.ones(24) / 24, mode="same")
        env_add(t0, lambda x: n[: len(x)] * np.sin(np.pi * np.clip(x / 0.5, 0, 1)), 0.5, gain)

    def pad(t0, dur, freqs, gain=0.06):
        env_add(t0, lambda x: sum(np.sin(2 * np.pi * f * x) + np.sin(2 * np.pi * f * 1.004 * x) for f in freqs) * np.minimum(1, x / 1.2) * np.minimum(1, (dur - x) / 1.0), dur, gain)

    pad(0, total, [130.81, 196.0], 0.035)
    bell(0.3, PENTA[5], 0.12)
    bell(0.9, PENTA[3], 0.08)
    for k, ((scene, dur), s0) in enumerate(zip(scenes, starts)):
        if scene.kind == "page":
            n = len(scene.lines)
            base = (k * 2) % 4
            for i in range(n):
                pluck(s0 + line_times(i, n)[0], PENTA[min(len(PENTA) - 1, base + i)], 0.22 + 0.04 * min(i, 3))
            if scene.native is not None:
                pluck(s0 + line_times(n, n)[0], PENTA[base] / 2, 0.18)
        if k + 1 < len(scenes):
            swish(s0 + dur - TURN)
        if scene.kind == "outro":
            for j, f in enumerate([PENTA[0], PENTA[2], PENTA[3], PENTA[5]]):
                pluck(s0 + 0.3 + j * 0.12, f, 0.25)
            bell(s0 + 0.9, PENTA[5], 0.22)
    # fade the whole track out
    out *= np.minimum(1, (total - t) / 1.2)
    out /= max(1e-9, np.abs(out).max())
    return (out * 0.8).astype(np.float32)


def write_wav(path, samples):
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((samples * 32767).astype("<i2").tobytes())


# ---------- render ----------

def render_storybook_video(book, out_path, strip_path=None):
    """Render the whole storybook as one movie. Returns duration + per-card pause points for the viewer."""
    movie = Movie(book)
    tmp = tempfile.mkdtemp(prefix="storytime-")
    video, audio = os.path.join(tmp, "video.mp4"), os.path.join(tmp, "score.wav")

    if strip_path:  # self-review strip: each card at rest, plus the middle of each pan
        times = []
        for s0, d, r in zip(movie.starts, movie.durs, movie.rest_times()):
            times += [r, s0 + d - TURN / 2]
        times = [t for t in times if t < movie.total]
        tw, th = W // 4, H // 4
        strip = Image.new("RGB", (min(8, len(times)) * tw, ((len(times) + 7) // 8) * th), "white")
        for i, tt in enumerate(times):
            strip.paste(movie.frame(tt).resize((tw, th)), ((i % 8) * tw, (i // 8) * th))
        strip.save(strip_path)

    p = subprocess.Popen(
        ["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
         "-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p", "-crf", "20", "-g", str(FPS), video],
        stdin=subprocess.PIPE,
    )
    for i in range(int(FPS * movie.total)):
        p.stdin.write(movie.frame(i / FPS).tobytes())
    p.stdin.close()
    p.wait()

    write_wav(audio, score(movie))
    subprocess.run(
        ["ffmpeg", "-y", "-v", "error", "-i", video, "-i", audio, "-af", "loudnorm=I=-14:TP=-1.5:LRA=11",
         "-c:v", "copy", "-c:a", "aac", "-b:a", "160k", "-ar", "48000", "-shortest", "-movflags", "+faststart", out_path],
        check=True,
    )
    return {"duration": movie.total, "rest_times": movie.rest_times(), "path": out_path}
