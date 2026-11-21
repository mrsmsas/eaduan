#!/usr/bin/env python3
"""Hasilkan assets/sfx.wav (30s, stereo, 44.1kHz): bunyi effect disegerakkan dengan garis masa src/scene.js.
Semua bunyi disintesis (tiada sampel luar). Guna: python3 scripts/make_sfx.py"""
import numpy as np, wave, sys, os
SR = 44100; DUR = 30.0
N = int(SR * DUR)
L = np.zeros(N); R = np.zeros(N)
rng = np.random.default_rng(7)

def put(sig, t0, pan=0.0, gain=1.0):
    i = int(t0 * SR); 
    if i >= N: return
    sig = sig[: N - i] * gain
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    L[i:i + len(sig)] += sig * l; R[i:i + len(sig)] += sig * r

def tt(d): return np.arange(int(d * SR)) / SR
def env(d, a=0.002, k=8):  # serangan pantas + susutan eksponen
    t = tt(d); return np.minimum(1, t / a) * np.exp(-k * t / d)

def lowpass_sweep(x, f0, f1, q=0.0):
    """Lowpass satu-kutub dengan potongan menyapu f0 -> f1."""
    n = len(x); fc = np.geomspace(f0, f1, n); a = 1 - np.exp(-2 * np.pi * fc / SR); y = np.zeros(n); s = 0.0
    for i in range(n): s += a[i] * (x[i] - s); y[i] = s
    return y
def bandpass_sweep(x, f0, f1):
    lo = lowpass_sweep(x, f0 * 1.6, f1 * 1.6); lo2 = lowpass_sweep(x, f0 * 0.6, f1 * 0.6); return lo - lo2

def thud(f0=150, f1=48, d=0.32, g=1.0):
    t = tt(d); ph = 2 * np.pi * np.cumsum(np.geomspace(f0, f1, len(t))) / SR
    s = np.sin(ph) * env(d, 0.001, 7); click = lowpass_sweep(rng.standard_normal(len(t)), 2500, 400) * env(d, 0.0005, 40) * 0.5
    return (s + click) * g
def pop(f0=720, f1=300, d=0.12, g=0.7):
    t = tt(d); ph = 2 * np.pi * np.cumsum(np.geomspace(f0, f1, len(t))) / SR
    return np.sin(ph) * env(d, 0.001, 6) * g
def bell(f=1320, d=1.4, g=0.5):
    t = tt(d); s = np.zeros_like(t)
    for m, a, k in [(1, 1, 1.0), (2.76, .5, 1.6), (5.4, .25, 2.4), (8.93, .12, 3.2)]:
        s += a * np.sin(2 * np.pi * f * m * t) * np.exp(-k * 4 * t / d)
    return s * np.minimum(1, t / 0.002) * g
def tick(f=2400, d=0.025, g=0.35):
    t = tt(d); n = bandpass_sweep(rng.standard_normal(len(t)), f, f); return n / (np.abs(n).max() + 1e-9) * env(d, 0.0003, 9) * g
def whoosh(d=1.0, f0=300, f1=3500, g=0.5, peak=0.5):
    n = rng.standard_normal(int(d * SR)); y = lowpass_sweep(n, f0, f1); y = y / (np.abs(y).max() + 1e-9)
    x = np.linspace(0, 1, len(y)); a = np.sin(np.pi * x ** (np.log(0.5) / np.log(peak))) ** 1.5
    return y * a * g
def boing(f=380, d=0.22, g=0.35):
    t = tt(d); fr = f * (1 + 0.9 * (t / d)) + 18 * np.sin(2 * np.pi * 22 * t); ph = 2 * np.pi * np.cumsum(fr) / SR
    return np.sin(ph) * env(d, 0.003, 5) * g
def sparkle(d=0.9, g=0.3, n=7, lo=3000, hi=7000):
    out = np.zeros(int(d * SR))
    for _ in range(n):
        s0 = rng.uniform(0, d * 0.7); f = rng.uniform(lo, hi); b = bell(f, 0.28, 0.4)[: len(out) - int(s0 * SR)]
        out[int(s0 * SR): int(s0 * SR) + len(b)] += b
    return out * g
def riser(d=0.8, g=0.3):
    n = rng.standard_normal(int(d * SR)); y = lowpass_sweep(n, 200, 6000); y /= np.abs(y).max() + 1e-9
    return y * (np.linspace(0, 1, len(y)) ** 2) * g
def shimmer(d=1.9, g=0.18):  # laluan emas dilukis
    t = tt(d); fr = np.geomspace(900, 3200, len(t)); ph = 2 * np.pi * np.cumsum(fr) / SR
    return (np.sin(ph) + 0.4 * np.sin(2.01 * ph)) * np.sin(np.pi * np.linspace(0, 1, len(t))) ** 1.5 * g

# ---------- garis masa (saat) — selari dengan src/scene.js ----------
put(riser(0.7, 0.35), 0.0, 0)                                               # fade-in latar
appear = [0.5, 0.9, 1.0, 1.3, 1.6, 1.7, 1.8, 2.0, 2.1, 2.2]                 # tile jatuh
for i, a in enumerate(appear):
    put(thud(g=0.8 - 0.03 * i), a + 0.30, pan=(-0.5 + 0.11 * i), gain=1)
    put(pop(g=0.35), a + 0.31, pan=(-0.5 + 0.11 * i))
put(whoosh(0.9, 400, 4200, 0.18, 0.4), 0.45, -0.2); put(whoosh(0.9, 400, 4200, 0.16, 0.4), 1.25, 0.2)
put(boing(), 2.95, 0.3, 1.0); put(sparkle(1.0, 0.28), 3.2, 0)                # maskot turun, tajuk muncul
put(bell(1760, 1.2, 0.22), 3.35, 0)
for a, b, f0, f1, p in [(4.8, 6.3, 250, 3200, 0.55), (8.9, 9.5, 300, 3600, 0.5), (12.4, 14.0, 250, 3200, 0.55),
                        (17.4, 18.6, 250, 3200, 0.55), (22.5, 23.4, 300, 3600, 0.5), (24.3, 26.0, 250, 3000, 0.6)]:
    put(whoosh(b - a, f0, f1, 0.42, p), a, pan=-0.15)                      # pergerakan kamera
for h in [5.9, 9.2, 10.7, 13.9, 18.4, 23.4, 27.2, 28.7]: put(boing(g=0.28), h - 0.05, 0.25)   # maskot melompat
put(shimmer(0.7, 0.14), 6.5, 0); put(bell(1568, 1.3, 0.4), 7.05, 0); put(pop(900, 500, 0.1, 0.4), 7.35, 0.2)   # bulatan tarikh + pil
# kaunter berdetik (masa menggulung)
for a, b, n in [(9.2, 11.0, 44), (11.55, 12.45, 22)]:
    for k, tm in enumerate(np.linspace(a, b, n)): put(tick(2000 + 900 * (k / n), g=0.28), tm, pan=0.35)
put(bell(1175, 1.4, 0.45), 11.0, 0.2); put(bell(1397, 1.4, 0.45), 11.5, 0.2); put(bell(1760, 1.8, 0.5), 12.45, 0.2)   # ding
for sw in [14.4, 14.9, 15.4]: put(whoosh(0.28, 700, 5200, 0.3, 0.5), sw - 0.02, 0.0); put(tick(1800, g=0.3), sw + 0.1, -0.2)  # kad bertukar
put(whoosh(0.55, 300, 5000, 0.45, 0.5), 15.65, 0); put(thud(g=0.7), 15.98, -0.1)                         # pusingan kad
put(sparkle(1.1, 0.34, 9), 16.4, 0.1); put(bell(1976, 1.4, 0.3), 16.5, 0.1)                           # kilau
put(shimmer(1.9, 0.2), 18.4, 0.1)                                                                    # laluan peta
put(thud(150, 60, 0.3, 0.8), 20.45, 0.2); put(pop(900, 450, 0.14, 0.5), 20.5, 0.2); put(bell(1568, 1.2, 0.35), 20.55, 0.2)  # pin jatuh
for tm in [23.35, 23.55]: put(pop(1100, 700, 0.09, 0.4), tm, 0.0); put(tick(3000, g=0.3), tm + 0.02, 0.2)
put(whoosh(0.9, 250, 5500, 0.5, 0.45), 25.95, 0); put(thud(120, 42, 0.5, 1.0), 26.75, 0); put(sparkle(1.4, 0.38, 12), 26.8, 0); put(bell(1318, 2.2, 0.45), 26.85, 0)  # banner naik
put(bell(1047, 2.0, 0.25), 29.15, 0)                                                                  # penutup

# ---------- master ----------
def fade(x, a=0.0, b=0.0):
    if a: x[: int(a * SR)] *= np.linspace(0, 1, int(a * SR))
    if b: x[-int(b * SR):] *= np.linspace(1, 0, int(b * SR))
for x in (L, R): fade(x, 0.01, 0.8)
y = np.stack([L, R], 1); y = np.tanh(y * 1.1) / np.tanh(1.1); y *= 0.7 / np.abs(y).max()
out = os.path.join(os.path.dirname(__file__), '..', 'assets', 'sfx.wav')
with wave.open(out, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((y * 32767).astype('<i2').tobytes())
print('ok', os.path.abspath(out), f'peak={np.abs(y).max():.2f}')
