import math, random, subprocess, sys, wave
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

SRC, OUT = sys.argv[1], sys.argv[2]
W, H, FPS, SR = 1080, 1920, 30, 44100
DUR = 21.9
K = W / 512  # source -> output scale
F = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FB = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
def font(p, s): return ImageFont.truetype(p, s)
f_cap, f_tag, f_h, f_b, f_s, f_btn, f_badge = font(FB, 44), font(FB, 30), font(FB, 30), font(F, 25), font(F, 21), font(FB, 30), font(FB, 30)
CYAN, GREEN = (80, 230, 255), (90, 255, 160)

def clamp(x, a=0.0, b=1.0): return max(a, min(b, x))
def seg(t, a, b): return clamp((t - a) / (b - a))
def ease(x): return x * x * (3 - 2 * x)
def back(x): c = 1.7; x -= 1; return 1 + (c + 1) * x ** 3 + c * x ** 2
def lerp(a, b, u): return a + (b - a) * u

# phone position in the recording (source px), read off the frames
PHONE_KEYS = [(4.6, 262, 440), (5.5, 280, 400), (9.0, 275, 402), (13.0, 271, 410), (16.5, 270, 412), (17.5, 250, 425), (18.2, 245, 470)]
def phone_at(t):
    ks = PHONE_KEYS
    if t <= ks[0][0]: return ks[0][1] * K, ks[0][2] * K
    for (t0, x0, y0), (t1, x1, y1) in zip(ks, ks[1:]):
        if t <= t1:
            u = ease((t - t0) / (t1 - t0)); return lerp(x0, x1, u) * K, lerp(y0, y1, u) * K
    return ks[-1][1] * K, ks[-1][2] * K

# ---------- hologram drawing ----------
def holo_panel(size, title, lines, accent=CYAN, typed=1.0, button=None):
    w, h = size
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, w - 1, h - 1), 18, fill=(8, 45, 90, 165), outline=accent + (255,), width=3)
    for cx, cy, sx, sy in [(8, 8, 1, 1), (w - 9, 8, -1, 1), (8, h - 9, 1, -1), (w - 9, h - 9, -1, -1)]:
        d.line((cx, cy, cx + 36 * sx, cy), fill=(255, 255, 255, 240), width=4)
        d.line((cx, cy, cx, cy + 36 * sy), fill=(255, 255, 255, 240), width=4)
    d.text((26, 20), title, font=f_h, fill=(255, 255, 255, 255))
    d.line((26, 64, w - 26, 64), fill=accent + (220,), width=2)
    budget = int(sum(len(l[1]) for l in lines) * typed)
    y = 80
    for kind, txt in lines:
        show = txt[:max(0, budget)]; budget -= len(txt)
        fnt = f_b if kind == "b" else f_s
        col = (255, 235, 140, 255) if kind == "y" else (215, 248, 255, 255)
        d.text((28, y), show, font=f_b if kind == "y" else fnt, fill=col)
        y += 36 if kind != "s" else 31
    if button:
        bx, by, bw, bh, label, col, pulse = button
        r = int(10 * pulse)
        d.rounded_rectangle((bx - r, by - r, bx + bw + r, by + bh + r), 14, outline=col + (int(200 * (1 - pulse * 0.6)),), width=3)
        d.rounded_rectangle((bx, by, bx + bw, by + bh), 12, fill=col + (235,))
        tw = d.textlength(label, font=f_btn)
        d.text((bx + (bw - tw) / 2, by + (bh - 34) / 2), label, font=f_btn, fill=(255, 255, 255, 255))
    a = np.array(im)
    a[::4, :, 3] = (a[::4, :, 3] * 0.6).astype(np.uint8)
    return Image.fromarray(a)

def place(layer, panel, center, sy=1.0, sx=1.0, alpha=1.0, glitch=0.0, t=0.0):
    if alpha <= 0.01 or sy <= 0.01 or sx <= 0.01: return
    w, h = panel.size
    nw, nh = max(2, int(w * sx)), max(2, int(h * sy))
    p = panel.resize((nw, nh), Image.BILINEAR) if (nw, nh) != (w, h) else panel.copy()
    if glitch > 0:
        a = np.array(p); rr = random.Random(int(t * 1000))
        for _ in range(int(16 * glitch)):
            y0 = rr.randint(0, max(1, nh - 6)); hh = rr.randint(3, 20)
            a[y0:y0 + hh] = np.roll(a[y0:y0 + hh], rr.randint(-50, 50), axis=1)
        p = Image.fromarray(a)
    flick = 0.9 + 0.1 * math.sin(t * 47) * math.sin(t * 13)
    p.putalpha(p.getchannel("A").point(lambda v: int(v * alpha * flick)))
    layer.alpha_composite(p, (int(center[0] - nw / 2), int(center[1] - nh / 2)))

def beam(layer, src, box, alpha):
    if alpha <= 0: return
    x0, y0, x1, y1 = box
    ImageDraw.Draw(layer).polygon([(src[0] - 18, src[1]), (src[0] + 18, src[1]), (x1, y1), (x0, y1)], fill=(90, 220, 255, int(70 * alpha)))

def bell_icon(d, cx, cy, s, ang, alpha, badge=True):
    a = int(255 * alpha); c, sn = math.cos(ang), math.sin(ang)
    def R(x, y): return (cx + x * c - y * sn, cy + x * sn + y * c)
    d.polygon([R(-0.55 * s, 0.45 * s), R(-0.45 * s, -0.1 * s), R(-0.3 * s, -0.42 * s), R(0, -0.55 * s),
               R(0.3 * s, -0.42 * s), R(0.45 * s, -0.1 * s), R(0.55 * s, 0.45 * s)], fill=(255, 205, 60, a))
    p0, p1 = R(-0.1 * s, -0.7 * s), R(0.1 * s, -0.5 * s)
    d.ellipse((min(p0[0], p1[0]), min(p0[1], p1[1]), max(p0[0], p1[0]), max(p0[1], p1[1])), fill=(255, 205, 60, a))
    bx, by = R(0, 0.58 * s)
    d.ellipse((bx - 0.13 * s, by - 0.13 * s, bx + 0.13 * s, by + 0.13 * s), fill=(255, 170, 30, a))
    if badge:
        d.ellipse((cx + 0.3 * s, cy - 0.8 * s, cx + 0.8 * s, cy - 0.3 * s), fill=(235, 50, 50, a))
        d.text((cx + 0.55 * s, cy - 0.55 * s), "1", font=f_badge, fill=(255, 255, 255, a), anchor="mm")

# ---------- content ----------
PW, PH = 560, 400
ADUAN_LINES = [
    ("y", "Pengadu menghantar aduan…"),
    ("b", "No. Tiket : ELK-2311"),
    ("b", "Kategori  : ELK · Elektrik"),
    ("b", "Lokasi    : Makmal Komputer"),
    ("b", "Butiran   : Lampu siling tidak"),
    ("b", "            menyala."),
    ("s", "Status    : Aduan diterima sistem ✓"),
]
EMAIL_LINES = [
    ("s", "Kepada : PIC Elektrik (ELK)"),
    ("s", "Subjek : Aduan baharu ELK-2311"),
    ("b", "Satu aduan baharu telah"),
    ("b", "ditugaskan kepada anda."),
    ("b", "Lokasi: Makmal Komputer"),
]
BTN = (100, 296, 360, 72)
def aduan_panel(typed): return holo_panel((PW, PH), "ADUAN BAHARU · eAduan", ADUAN_LINES, typed=typed)
def email_panel(done, pulse, typed):
    label, col = ("✓  ADUAN DITERIMA", (22, 163, 74)) if done else ("TERIMA ADUAN", (37, 99, 235))
    return holo_panel((PW, PH), "✉  Emel eAduan MRSM SAS", EMAIL_LINES, accent=GREEN if done else CYAN,
                      typed=typed, button=BTN[:4] + (label, col, pulse))

CAPS = [(0.4, 2.7, "Hologram: aduan baharu dihantar\noleh pengadu"),
        (2.8, 5.2, "DING"),
        (5.3, 9.0, "Hologram emel aduan keluar\ndari telefon PIC"),
        (9.0, 15.4, "PIC membaca emel aduan"),
        (15.5, 17.0, "PIC menekan butang\nTERIMA ADUAN"),
        (17.0, 18.6, "Aduan diterima — hologram padam"),
        (18.7, 21.9, "PIC meneruskan kerja\nStatus: Dalam Tindakan")]

T_TAP = 15.8
ADUAN_C = (790, 470)          # first hologram, above the PIC's right side
ADUAN_DOCK = (250, 330)       # docked small, top-left
EMAIL_C = (790, 470)

def draw_caption(d, t):
    for a, b, txt in CAPS:
        if not (a <= t < b): continue
        al = min(seg(t, a, a + 0.3), 1 - seg(t, b - 0.3, b))
        A = int(255 * al)
        if txt == "DING":
            parts = [("Ding!", (255, 215, 80)), ("  Notifikasi aduan berbunyi", (255, 255, 255))]
            tw = sum(d.textlength(p, font=f_cap) for p, _ in parts) + 70
            x = (W - tw) / 2; y = 1640
            d.rounded_rectangle((x - 24, y - 18, x + tw + 24, y + 70), 18, fill=(0, 0, 0, int(175 * al)))
            bell_icon(d, x + 26, y + 26, 46, 0.25 * math.sin(t * 25), al, badge=False)
            x += 70
            for p, c in parts:
                d.text((x, y), p, font=f_cap, fill=c + (A,)); x += d.textlength(p, font=f_cap)
            continue
        lines = txt.split("\n")
        tw = max(d.textlength(l, font=f_cap) for l in lines)
        y0 = 1640 - 30 * (len(lines) - 1)
        d.rounded_rectangle(((W - tw) / 2 - 28, y0 - 18, (W + tw) / 2 + 28, y0 + 58 * len(lines) + 12), 18, fill=(0, 0, 0, int(175 * al)))
        for i, l in enumerate(lines):
            lw = d.textlength(l, font=f_cap)
            d.text(((W - lw) / 2, y0 + i * 58), l, font=f_cap, fill=(255, 255, 255, A))

# ---------- render ----------
dec = subprocess.Popen(["ffmpeg", "-loglevel", "error", "-i", SRC, "-t", str(DUR), "-vf", f"scale={W}:{H}:flags=lanczos,fps={FPS}",
                        "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
enc = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
                        "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", "24",
                        "-pix_fmt", "yuv420p", OUT + ".v.mp4"], stdin=subprocess.PIPE)
i = 0
while True:
    raw = dec.stdout.read(W * H * 3)
    if len(raw) < W * H * 3: break
    t = i / FPS
    frame = Image.frombytes("RGB", (W, H), raw).convert("RGBA")
    holo = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    hd = ImageDraw.Draw(holo)
    ph = phone_at(t)
    dis = seg(t, 17.0, 18.0)

    # 1) complaint hologram from the complainant
    if 0.3 <= t and dis < 1:
        op = ease(seg(t, 0.3, 0.9))
        dock = ease(seg(t, 2.3, 3.0))
        c = (lerp(ADUAN_C[0], ADUAN_DOCK[0], dock), lerp(ADUAN_C[1], ADUAN_DOCK[1], dock))
        sc = 1 - 0.45 * dock
        if dock < 0.5:  # data stream from the ceiling as if arriving from the network
            for k in range(14):
                rr = random.Random(k); x = c[0] + rr.uniform(-PW / 2, PW / 2); ph_ = (t * 1.8 + rr.random()) % 1
                yy = lerp(0, c[1] - PH / 2, ph_)
                hd.line((x, yy, x, yy + 40), fill=(120, 230, 255, int(160 * op * (1 - 2 * dock) * (1 - ph_))), width=3)
        place(holo, aduan_panel(seg(t, 0.7, 2.6)), c, sy=op * (1 - ease(dis)), sx=sc * (1 + 0.15 * ease(dis)),
              alpha=(1 - 0.3 * dock) * (1 - dis), glitch=dis + (0.6 if t < 0.55 else 0), t=t)

    # 2) notification bell next to the PIC's head
    if 2.8 <= t < 5.4:
        pop = back(seg(t, 2.8, 3.1)) * (1 - seg(t, 5.0, 5.4))
        ang = 0.5 * math.sin(t * 30) * math.exp(-2.5 * ((t - 2.85) % 0.8)) if t < 4.5 else 0
        bx, by = 730, 600
        if t < 4.7:
            for k in range(3):
                u = (t * 1.6 + k / 3) % 1; r = 70 + 110 * u
                hd.arc((bx - r, by - r, bx + r, by + r), 200, 340, fill=(255, 220, 90, int(220 * (1 - u))), width=6)
        bell_icon(hd, bx, by, 105 * max(pop, 0.01), ang, clamp(pop))

    # 3) e-mail hologram rising out of the phone
    if t >= 5.5 and dis < 1:
        rise = ease(seg(t, 5.5, 6.8))
        done = t >= T_TAP
        pulse = (math.sin(t * 6) * 0.5 + 0.5) if 14.6 <= t < T_TAP else (seg(t, T_TAP, T_TAP + 0.6) if done else 0)
        panel = email_panel(done, pulse, seg(t, 6.6, 9.5))
        c = (lerp(ph[0], EMAIL_C[0], rise), lerp(ph[1], EMAIL_C[1], rise))
        sc = 0.06 + 0.94 * rise
        beam(holo, (ph[0], ph[1] - 10), (c[0] - PW / 2 * sc, c[1] - PH / 2 * sc, c[0] + PW / 2 * sc, c[1] + PH / 2 * sc), 1 - dis)
        hd.ellipse((ph[0] - 34, ph[1] - 20, ph[0] + 34, ph[1] + 14), fill=(120, 230, 255, int(90 * (1 - dis))))
        place(holo, panel, c, sy=sc * (1 - ease(dis)), sx=sc, alpha=(0.4 + 0.6 * rise) * (1 - dis), glitch=dis, t=t)
        # 4) tap: ripple on the phone and on the hologram button
        if T_TAP <= t < T_TAP + 0.9:
            u = seg(t, T_TAP, T_TAP + 0.9)
            for cx, cy, R in [(ph[0], ph[1] - 4, 70), (c[0] - PW / 2 + BTN[0] + BTN[2] / 2, c[1] - PH / 2 + BTN[1] + BTN[3] / 2, 200)]:
                r = 12 + R * u
                hd.ellipse((cx - r, cy - r, cx + r, cy + r), outline=(120, 255, 170, int(255 * (1 - u))), width=6)
        if 14.6 <= t < T_TAP:  # hint arrow on the phone
            a = int(200 * (0.5 + 0.5 * math.sin(t * 8)))
            hd.ellipse((ph[0] - 22, ph[1] - 26, ph[0] + 22, ph[1] + 18), outline=(255, 255, 255, a), width=4)

    # 5) dissolve sparkles
    if 0 < dis < 1:
        rr = random.Random(int(t * 100))
        for _ in range(70):
            x, y = rr.randint(120, 1060), rr.randint(140, 900)
            s = rr.randint(2, 6)
            hd.ellipse((x - s, y - s + dis * 90, x + s, y + s + dis * 90), fill=(150, 240, 255, int(230 * (1 - dis))))

    frame = Image.alpha_composite(frame, holo.filter(ImageFilter.GaussianBlur(12)))
    frame = Image.alpha_composite(frame, holo)
    d = ImageDraw.Draw(frame)
    d.rounded_rectangle((30, 40, 390, 96), 14, fill=(0, 0, 0, 150))
    d.text((50, 50), "eAduan MRSM SAS", font=f_tag, fill=(255, 255, 255, 255))
    draw_caption(d, t)
    out = frame.convert("RGB")
    f = min(seg(t, 0, 0.4), 1 - seg(t, DUR - 0.6, DUR))
    if f < 1: out = Image.blend(Image.new("RGB", (W, H)), out, f)
    enc.stdin.write(out.tobytes())
    if i % 90 == 0: print("frame", i, flush=True)
    i += 1
enc.stdin.close(); enc.wait(); dec.wait()
DUR = i / FPS

# ---------- sound effects, mixed over the original audio ----------
n = int(DUR * SR); fx = np.zeros(n)
def add(sig, at):
    s = int(at * SR); e = min(n, s + len(sig))
    if s < n: fx[s:e] += sig[:e - s]
def env(dd, decay): x = np.arange(int(dd * SR)) / SR; return x, np.exp(-decay * x) * np.minimum(1, x * 400)
def ding(at, vol=0.5):
    x, e = env(1.8, 2.8)
    add(vol * e * (np.sin(2 * np.pi * 1318 * x) + 0.5 * np.sin(2 * np.pi * 2637 * x) + 0.25 * np.sin(2 * np.pi * 3955 * x)), at)
def sweep(at, f0, f1, dur, vol):
    x = np.arange(int(dur * SR)) / SR; fr = f0 + (f1 - f0) * x / dur
    add(vol * np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.sin(np.pi * x / dur) * (1 + 0.3 * np.sin(2 * np.pi * 30 * x)), at)
def click(at, vol=0.5):
    x, e = env(0.06, 80); add(vol * e * (np.sin(2 * np.pi * 2200 * x) + 0.6 * np.random.randn(len(x))), at)
sweep(0.3, 250, 1100, 0.8, 0.18)
ding(2.85); ding(3.65)
sweep(5.5, 400, 1600, 1.0, 0.16)
x, e = env(0.3, 20); add(0.22 * e * np.sin(2 * np.pi * 880 * x), 5.5)
click(T_TAP)
for k, fr in enumerate([880, 1320]):
    x, e = env(0.6, 6); add(0.3 * e * np.sin(2 * np.pi * fr * x), T_TAP + 0.1 + 0.15 * k)
sweep(17.0, 1400, 150, 1.2, 0.18)
with wave.open(OUT + ".fx.wav", "wb") as wf:
    wf.setnchannels(1); wf.setsampwidth(2); wf.setframerate(SR)
    wf.writeframes((np.clip(fx, -1, 1) * 32767).astype(np.int16).tobytes())
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", OUT + ".v.mp4", "-i", SRC, "-i", OUT + ".fx.wav",
                "-filter_complex", f"[1:a]atrim=0:{DUR},volume=0.8,afade=t=out:st={DUR - 0.6}:d=0.6[o];[2:a]volume=1.0[f];[o][f]amix=inputs=2:duration=first:normalize=0[a]",
                "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", OUT], check=True)
print("done", i, "frames")
