# Countdown Majlis Apresiasi Guru dan Staf MRSM Sultan Azlan Shah 2026

Video countdown 30 saat, 720×1280 (9:16), 30 fps. Dibina semula daripada video rujukan
(intro "bento grid" 3D yang bergerak antara tile) menggunakan **Three.js**, **Remotion** dan **Hyperframes**.

## Struktur

| Fail | Fungsi |
|---|---|
| `src/config.js` | **Semua teks/tarikh/atur cara/countdown.** Ubah di sini sahaja. |
| `src/scene.js` | Scene Three.js deterministik: `renderAt(t)` → satu frame. Tiada state antara frame. |
| `remotion/` | Komposisi Remotion `CountdownApresiasi` (frame ÷ fps → `renderAt`). |
| `hyperframes/index.html` | Komposisi Hyperframes (timeline GSAP → `renderAt`). |
| `preview.html` | Pratonton pantas dalam pelayar. |
| `assets/` | Logo MRSM (`logo.png`) dan font (Playfair Display, Plus Jakarta Sans). |

Satu scene dikongsi oleh ketiga-tiga pipeline, jadi output Remotion dan Hyperframes sama.

## Guna

```bash
npm install

# Pratonton (buka http://localhost:8765/preview.html, tambah ?t=12 untuk satu frame)
npm run preview

# Render
npm run remotion:render      # -> out/countdown-remotion.mp4
npm run hf:render            # -> out/countdown-hyperframes.mp4
```

Pengguna Linux tanpa GPU: tambah `--browser-executable=<path chromium>` pada Remotion.

## Countdown harian

`countdown.daysLeft` dalam config ialah nombor tetap; jika `null`, ia dikira dari `countdown.today`
hingga `event.date`. Untuk satu siri (6, 5, 4 … hari lagi, ESOK, HARI INI) dengan Remotion:

```bash
for n in 6 5 4 3 2 1 0; do
  npx remotion render remotion/index.js CountdownApresiasi out/countdown-$n.mp4 \
    --props="{\"config\":{\"countdown\":{\"daysLeft\":$n}}}"
done
```

Banner akan memaparkan `N HARI LAGI`, `ESOK` (1) atau `HARI INI` (0).

## Garis masa

| Masa | Babak |
|---|---|
| 0–3 s | Latar fade-in, tile jatuh satu demi satu (bayang placeholder), header muncul |
| 3–6 s | Maskot turun, teks header terbuka, kamera menghampiri kalendar |
| 6–9 s | Kalendar: tarikh 27 dibulatkan, pil "JUMAAT · 10.30 PAGI" |
| 9–13 s | Kaunter masa menggulung 10.30 → 12.30 (bersurai) |
| 13–17 s | Kad atur cara bertukar (Sarapan, Pendaftaran, TESTAC, Perasmian) → kad "Sijil & Anugerah" |
| 18–23 s | Peta: laluan emas dilukis, pin jatuh, "BILIK TERATAI" |
| 23–25 s | Tile kecil: masa, TESTAC, jamuan, hadir |
| 25–30 s | Kamera tarik balik; banner "N HARI LAGI" meluncur naik; fade keluar |

## Nota

- Logo: `assets/logo.png` ialah logo MRSM daripada repo ini. Logo sekolah dalam video rujukan tidak digunakan.
- Maskot dilukis dengan canvas (bukan aset daripada video rujukan).
- Tiada audio dalam output. Tambah trek muzik pada Remotion (`<Audio />`) atau Hyperframes jika perlu.
- Atur cara penuh (7.30 pagi – 12.30 t/hari) hanya sebahagian dipaparkan; tambah/ubah entri di `stats.agenda`.
