"""Synthesised grunge/rock backing track timed to the eAduan hologram video."""
import sys, wave
import numpy as np

OUT, DUR = sys.argv[1], float(sys.argv[2])
SR = 44100
N = int(DUR * SR)
BEAT = 0.5            # 120 bpm
BAR = 4 * BEAT
rng = np.random.RandomState(7)
L, R = np.zeros(N), np.zeros(N)

def fft_filter(x, lo=None, hi=None):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    g = np.ones_like(f)
    if hi: g *= 1 / np.sqrt(1 + (f / hi) ** 4)
    if lo: g *= 1 / np.sqrt(1 + (lo / np.maximum(f, 1)) ** 4)
    return np.fft.irfft(X * g, len(x))

def put(buf, sig, at):
    s = int(at * SR)
    if s >= N: return
    e = min(N, s + len(sig)); buf[s:e] += sig[:e - s]

def saw(freq, n, phase=0.0):
    t = np.arange(n) / SR
    return 2 * ((t * freq + phase) % 1) - 1

NOTE = {"D": 73.42, "F": 87.31, "G": 98.0, "A#": 116.54, "C": 130.81, "A": 110.0}

# ---------- guitar ----------
def power_chord(root, dur, mute=False, detune=1.0):
    n = int(dur * SR)
    x = sum(saw(root * m * detune * (1 + 0.003 * k), n, 0.17 * k) for k, m in enumerate([1, 1.498, 2, 2.997]))
    t = np.arange(n) / SR
    env = np.exp(-t * (18 if mute else 1.2)) * np.minimum(1, t * 300)
    rel = np.minimum(1, (dur - t) * 60)
    return np.tanh(6.0 * x * env) * rel * (0.6 if mute else 1.0)

def riff_bar(chords, start, buf_l, buf_r, gain=0.22):
    # 8th-note grunge pattern: big chord, mutes, accents
    pattern = [(0, 1.0, False), (1, 0.5, True), (2, 0.5, True), (3, 1.0, False),
               (4, 0.5, True), (5, 1.0, False), (6, 0.5, True), (7, 0.5, False)]
    for step, length, mute in pattern:
        root = NOTE[chords[0] if step < 4 else chords[1]]
        dur = BEAT / 2 * (1.0 if mute else length * 2 if step == 7 else 1.0)
        put(buf_l, gain * power_chord(root, dur, mute, 1.0), start + step * BEAT / 2)
        put(buf_r, gain * power_chord(root, dur, mute, 1.004), start + step * BEAT / 2 + 0.008)

def ring_chord(root, at, dur, gain=0.24):
    put(L, gain * power_chord(NOTE[root], dur), at)
    put(R, gain * power_chord(NOTE[root], dur, detune=1.004), at + 0.01)

# ---------- bass ----------
def bass_note(root, at, dur, gain=0.32):
    n = int(dur * SR); t = np.arange(n) / SR
    f = NOTE[root] / 2
    x = 0.7 * np.sin(2 * np.pi * f * t) + 0.3 * saw(f, n)
    env = np.minimum(1, t * 200) * np.minimum(1, (dur - t) * 40)
    s = gain * np.tanh(2 * x) * env
    put(L, s, at); put(R, s, at)

# ---------- drums ----------
def kick(at, g=0.9):
    n = int(0.35 * SR); t = np.arange(n) / SR
    f = 45 + 110 * np.exp(-t * 30)
    s = g * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9)
    s[:300] += g * 0.4 * rng.randn(300) * np.linspace(1, 0, 300)
    put(L, s, at); put(R, s, at)

def snare(at, g=0.55):
    n = int(0.25 * SR); t = np.arange(n) / SR
    noise = fft_filter(rng.randn(n), lo=1500, hi=9000)
    s = g * (0.8 * noise * np.exp(-t * 16) + 0.5 * np.sin(2 * np.pi * 190 * t) * np.exp(-t * 25))
    put(L, s, at); put(R, s * 0.9, at)

def hat(at, g=0.12, open_=False):
    n = int((0.25 if open_ else 0.05) * SR); t = np.arange(n) / SR
    s = g * fft_filter(rng.randn(n), lo=7000) * np.exp(-t * (12 if open_ else 70))
    put(L, s * 0.7, at); put(R, s, at)

def crash(at, g=0.3):
    n = int(2.2 * SR); t = np.arange(n) / SR
    s = g * fft_filter(rng.randn(n), lo=4000) * np.exp(-t * 2.2)
    put(L, s, at); put(R, s * 0.85, at + 0.004)

def rock_beat(start, bars, fill_end=True):
    for b in range(bars):
        t0 = start + b * BAR
        for k in range(8):
            hat(t0 + k * BEAT / 2, 0.13 if k % 2 == 0 else 0.08)
        kick(t0); kick(t0 + 1.5 * BEAT); kick(t0 + 2 * BEAT); kick(t0 + 2.75 * BEAT, 0.6)
        snare(t0 + BEAT); snare(t0 + 3 * BEAT)
        if fill_end and b == bars - 1:
            for k in range(4): snare(t0 + 3 * BEAT + k * BEAT / 4, 0.35 + 0.08 * k)

PROG = [("D", "D"), ("F", "G"), ("D", "D"), ("A#", "C")]

def band(start, bars, prog_offset=0):
    for b in range(bars):
        c = PROG[(b + prog_offset) % len(PROG)]
        riff_bar(c, start + b * BAR, L, R)
        bass_note(c[0], start + b * BAR, BAR / 2); bass_note(c[1], start + b * BAR + BAR / 2, BAR / 2)

# ---------- arrangement (matches the video events) ----------
# 0.0-2.75 intro: riff alone, then hats + snare build
riff_bar(("D", "D"), 0.0, L, R, 0.3)
riff_bar(("F", "G"), BAR, L, R, 0.3)
for k in range(8): hat(BAR + k * BEAT / 2, 0.1)
for k in range(6): snare(2.0 + 0.125 * k, 0.2 + 0.05 * k)
# 2.75-4.0 stop for the notification bell: low feedback drone only
n = int(1.25 * SR); t = np.arange(n) / SR
drone = 0.06 * np.tanh(3 * np.sin(2 * np.pi * NOTE["D"] * 2 * t)) * np.minimum(1, t * 3)
put(L, drone, 2.75); put(R, drone, 2.75)
# 4.0-15.75 full band (e-mail hologram / reading)
crash(4.0); band(4.0, 6); rock_beat(4.0, 6)
# 16.0 accent on "TERIMA ADUAN"
crash(15.8, 0.35); kick(15.8); ring_chord("D", 16.0, 1.0)
for k in range(4): hat(16.0 + k * 0.25, 0.1)
# 17.0-18.0 dissolve: sustained chord ring
ring_chord("A#", 17.0, 1.0, 0.2)
# 18.0-21.0 PIC continues work: band again
crash(18.0); band(18.0, 2, 1); rock_beat(18.0, 1, False); rock_beat(20.0, 1, True)
# 21.0 final hit
crash(21.0, 0.35); kick(21.0); ring_chord("D", 21.0, max(0.2, DUR - 21.0))
bass_note("D", 21.0, max(0.2, DUR - 21.0))

# tone shaping: cut fizz and mud from the guitars/mix
L = fft_filter(L, lo=35, hi=7000); R = fft_filter(R, lo=35, hi=7000)

# duck under the sound effects (bell, e-mail ping, tap, dissolve)
tt = np.arange(N) / SR
duck = np.ones(N)
for a, b in [(0.3, 1.1), (2.8, 4.4), (5.5, 6.5), (15.8, 16.6), (17.0, 18.0)]:
    duck = np.minimum(duck, 1 - 0.5 * np.clip(np.minimum((tt - a + 0.1) / 0.1, (b - tt) / 0.3), 0, 1))
fade = np.clip(np.minimum(tt / 0.3, (DUR - tt) / 0.7), 0, 1)
mix = np.stack([L, R], 1) * (duck * fade)[:, None]
rms = np.sqrt((mix[int(4.5 * SR):int(15 * SR)] ** 2).mean())
mix = mix * (10 ** (-11 / 20) / rms)          # bring the band to about -11 dBFS RMS
mix = np.tanh(1.3 * mix) / 1.3                # soft-clip drum peaks (glue/compression)
mix = 0.95 * mix / np.max(np.abs(mix))
with wave.open(OUT, "wb") as wf:
    wf.setnchannels(2); wf.setsampwidth(2); wf.setframerate(SR)
    wf.writeframes((mix * 32767).astype(np.int16).tobytes())
print("ok", DUR)
