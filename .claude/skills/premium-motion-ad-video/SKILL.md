---
name: premium-motion-ad-video
description: Panduan gaya video iklan/edukasi pendek (TikTok/Reels/Shorts 9:16) gaya "talking head + motion graphics premium" — hook header, caption kata-demi-kata, kad langkah bernombor, latar angkasa biru-ungu, UI mockup, auto-sync waveform, dan CTA "Part 2?". Guna bila user minta buat/edit video iklan pendek, skrip video, storyboard, atau motion graphic dalam gaya ini.
---

# Premium Motion Ad Video — Panduan Skill & Effect

Dikaji daripada video rujukan "AKU SURUH AI EDIT VIDEO AKU… HASIL DIA 🤯"
(@syafiqnurmad, 576×1024, 30fps, ~68 saat). Gunakan panduan ini sebagai
template setiap kali buat video gaya sama.

---

## 1. Spesifikasi Teknikal

| Item | Nilai |
|---|---|
| Nisbah | 9:16 menegak (1080×1920 untuk export; rujukan 576×1024) |
| FPS | 30 |
| Durasi | 60–70 saat (sweet spot TikTok) |
| Bahasa | Bahasa Melayu santai/pasar ("korang", "tengok ni", "je", "dah") |
| Safe zone | Elak 15% bawah & kanan (UI TikTok, watermark @handle) |

---

## 2. Struktur Cerita (Timeline)

| Masa | Bahagian | Isi |
|---|---|---|
| 0–5s | **HOOK** | Header thumbnail statik di atas + talking head di bawah. Janji hasil: "Video yang korang tengok ni… software editing langsung tak sentuh. Semua AI Claude yang buat." |
| 5–9s | **PREVIEW PROSES** | Montaj pantas kad `01/05 SKRIP → 02/05 VOICEOVER → 03/05 ANIMASI → 04/05 MUZIK → 05/05 RENDER (59%)` — ~0.8s setiap kad |
| 9–11s | **TRANSISI** | "Meh saya tunjuk macam mana 👇" + logo jenama muncul kiri atas |
| 11–50s | **LANGKAH 1–6** | Setiap langkah ada pil label tetap di atas (`① PLAN dulu`, `② BAGI bahan`, `③ VOICEover`, `④ AUTO sync`, `⑤ SEMAK & betulkan`, `⑥ SIMPAN JADI skill`) |
| 50–58s | **RUMUSAN / RAHSIA** | "Rahsia dia bukan *prompt magic* 🪄" → kata kunci gergasi `01/04 PLAN`, `02/04 BAHAN`, `04/04 BETULKAN` → "TU JE." |
| 58–64s | **CTA** | "PART 2?" + pil `💬 KOMEN "NAK"` + 👇 + logo jenama, latar talking head di-blur |
| 64–68s | **OUTRO** | End card TikTok (logo + bar carian @handle) |

**Formula:** Hook hasil → bukti ringkas (montaj) → langkah bernombor → rumus 3–4 kata → CTA bersiri (Part 2) untuk engagement komen.

---

## 3. Identiti Visual

### Palet warna
| Peranan | Warna (anggaran) |
|---|---|
| Latar angkasa (atas) | Navy gelap `#0B1530` |
| Latar angkasa (bawah) | Ungu-indigo `#3B2A8C` → `#5B3FD0` (gradient menegak) |
| Aksen utama / highlight caption | Biru `#2F7DE1` – `#3B8BEB` |
| Teks utama | Putih `#FFFFFF` |
| Teks kata belum disebut | Putih 35–45% opacity |
| Hook keyword | Kuning `#FFD21F` ("EDIT VIDEO") & biru ("AI") |
| Badge "HASIL DIA" | Merah `#E5202E` dengan emoji 🤯 |
| Status berjaya | Hijau `#22C55E` (✓, bar progress siap) |

### Tipografi
- **Tajuk / caption:** Sans-serif tebal, *italic*, UPPERCASE (cth. Montserrat ExtraBold Italic / Poppins Black Italic).
- **Aksen kontras:** Serif italic nipis untuk perkataan kedua dalam label (cth. "PLAN *dulu*", "AUTO *sync*", "prompt *magic*"). Kombinasi **BOLD SANS + serif italic** ialah tanda tangan gaya ini.
- **Nombor langkah:** `01 / 05` kecil, letter-spacing lebar, di atas tajuk.

### Latar
- Gradient angkasa navy → ungu dengan **bintang kecil berkelip** (partikel putih kecil, opacity berubah perlahan).
- Untuk momen "wow": **sunburst / sinaran radial** biru di belakang subjek ("PART PALING best 🔥", "PART 2?").

---

## 4. Senarai Effect (Effect Library)

### A. Hook Header (0–5s)
- Skrin dibahagi: **30% atas = panel thumbnail**, 70% bawah = talking head.
- Panel atas: teks 3 baris ("AKU SURUH **AI** / **EDIT VIDEO** / AKU…") + badge merah "HASIL DIA 🤯".
- Di belakang teks: **kad UI terapung bercahaya neon** (editor, butang "AI" bulat bersinar, panel Voiceover dengan waveform, ikon 🎬 🎙️) — glow biru/oren/ungu, sedikit condong.
- Garis pemisah biru nipis antara panel dan video.

### B. Caption Kata-demi-Kata (Karaoke Highlight)
- Posisi: tengah bawah (~68–75% tinggi skrin), 2–3 perkataan sekali.
- Kata **sedang disebut** = teks putih dalam **kotak biru bucu bulat** (pill highlight).
- Kata **belum disebut** = putih pudar/ghost.
- Animasi: highlight melompat ke kata seterusnya tepat pada timing suara; kata baharu masuk dengan **pop scale 90%→100%** + sedikit blur.
- Kadangkala caption guna **bayang/glow** tanpa kotak untuk kata penekanan.

### C. Pil Label Langkah (Step Pill)
- Pil gelap separa lut sinar di tengah atas: bulatan biru bernombor + "**BOLD** *serif italic*".
- Kekal sepanjang langkah tu; tukar nombor bila masuk langkah baru (slide/fade).
- Logo jenama kecil (cth. "AI ACADEMY") kekal kiri atas sepanjang bahagian langkah.

### D. Kad Montaj Proses (01/05 … 05/05)
- Latar angkasa penuh, setiap kad ~0.8s, transisi **blur + fade** pantas.
- Setiap kad = tajuk italic besar + ilustrasi animasi:
  - **SKRIP:** kertas putih condong, baris teks "menaip" muncul satu-satu.
  - **VOICEOVER:** ikon mikrofon 🎙️ + waveform biru bergerak.
  - **ANIMASI:** grid ikon emoji (🌀 💥 ✨ ⭐ 🔷 💫) dalam tile kaca, terapung/berputar.
  - **MUZIK:** bar equalizer ungu-biru melonjak + not muzik ♪ terapung.
  - **RENDER:** cincin progress bulat gradient hijau→biru dengan peratus mengira naik.

### E. UI Mockup (Simulasi Skrin)
- Tetingkap browser gelap (3 titik merah/kuning/hijau, URL `claude.ai`), ikon ✳️ oren, soalan serif "Apa kita nak buat hari ni?".
- **Efek menaip** dalam kotak input dengan kursor berkelip.
- Kad aplikasi lain (cth. ElevenLabs): nama app, nama fail `voiceover.mp3 · Bahasa Melayu`, waveform, butang putih "⬇ DOWNLOAD" → bar progress → butang hijau "✓ DAH MASUK CLAUDE".

### F. Checklist Terapung (Overlay atas Talking Head)
- Pil putih kecil muncul satu-satu di sisi kiri (stagger ~0.4s): `📦 PRODUK ✓`, `🎯 TARGET ✓`, `💬 MESEJ ✓` — tanda ✓ hijau.
- Varian: kad "📝 DRAF SKRIP" kaca gelap dengan baris placeholder; bubble chat (avatar oren + teks menaip) "Boleh bagi logo, gambar & screenshot".
- Varian aliran: `📝 BRIEF PENDEK` → ⬇ → `🎬 VIDEO SIAP! ✓`; senarai `PRODUK A / B / C`.

### G. Grid Aset ("BAHAN yang Claude minta")
- Tajuk italic biru + subtajuk serif.
- 3 tile bucu bulat muncul berturutan (pop): LOGO (putih), GAMBAR (ungu), SCREENSHOT (teal) + kotak putus-putus "⬆ UPLOAD".

### H. Background Removal + Composite
- Subjek (talking head) dipotong dari dapur dan diletak atas **latar angkasa / sunburst**.
- Tambah **rim light / glow** biru-hijau nipis di tepi badan supaya tak nampak "ditampal".
- Transisi masuk: latar asal → zoom/blur → latar angkasa.

### I. Auto-Sync Waveform (Efek Paling "Wow")
- Waveform biru besar melintang di belakang subjek.
- **Playhead** garis putih menegak bergerak kiri→kanan.
- Chip perkataan (KIRA, TIMING, SETIAP, PERKATAAN, MASA, SUARA…) tersusun di 2 lorong bawah waveform seperti timeline editor; chip yang dilalui playhead **menyala biru**.
- Caption bawah selari dengan chip yang menyala → tunjuk "teks keluar tepat masa suara". Tambah pil kuning "👆 MACAM CAPTION NI!".

### J. Kad Stack Fitur
- Kad kaca gelap bertindan dari atas, masuk satu-satu (slide down + fade): `✨ ANIMASI [ikon kotak biru]`, `🎵 MUZIK [equalizer]`, `💨 WHOOSH! [garis laju]`.
- Penutup: butang pil biru bercahaya "🤖 SEMUA AUTO!".

### K. Preview Frame (Video dalam Video)
- Video asal dikecilkan dalam bingkai telefon bucu bulat + label "▶ PREVIEW".
- Bubble putih "🤔 TAK PUAS HATI?" pop di bawah.
- Diikuti bubble chat menaip "Hook ni lemah la 😕" atas talking head.

### L. Progress "Simpan jadi Skill"
- Kad gelap "⚡ SKILL BARU" + medan teks monospace `premium-motion-ad-video` + bar progress biru→hijau.

### M. Kata Kunci Gergasi (Recap)
- Perkataan tunggal SANGAT besar (PLAN / BAHAN / BETULKAN / TU JE.) di atas kepala subjek, italic, gradient putih→biru-kelabu, dengan nombor `01/04` kecil.
- Transisi: **motion blur mendatar** / slide pantas + ghost trail.
- "RAHSIA" putih + "BUKAN" biru + "*prompt magic* 🪄" serif.

### N. CTA "PART 2?"
- Teks "PART 2?" besar italic di atas, sunburst latar.
- Pil putih `💬 KOMEN "NAK"` dengan **ripple bulatan** (cincin putih mengembang) seperti diketuk.
- Latar (subjek) di-**gaussian blur**, logo jenama dalam kad putih muncul atas pil, emoji 👇 melantun.

### O. Transisi Umum
- Cut pantas setiap 1–3 saat (tiada jeda mati).
- **Blur-dissolve** antara kad montaj.
- **Push/zoom-in** bila tukar dari dapur ke latar angkasa.
- **Whoosh SFX** pada setiap kad/teks masuk; "pop/click" pada checklist & butang.

---

## 5. Audio
- Voiceover jelas (boleh dijana ElevenLabs, Bahasa Melayu).
- Muzik latar upbeat/tech, volume rendah (~-20 dB bawah suara).
- SFX: whoosh (transisi), pop (pil/checklist), typing (UI menaip), ding (✓ siap), riser sebelum "PART PALING best".

---

## 6. Aliran Kerja 6 Langkah (Isi Video = Cara Buat Video Ni)
1. **PLAN dulu** — Bagitau AI: produk apa, target siapa, mesej apa. AI bagi draf skrip; edit sikit.
2. **BAGI bahan** — Logo, gambar, screenshot yang AI minta. Bagi je semua.
3. **VOICEOVER** — Jana suara (ElevenLabs), download, upload balik ke Claude.
4. **AUTO SYNC** — AI kira timing setiap perkataan → caption tepat masa suara; animasi, muzik, whoosh semua auto.
5. **SEMAK & betulkan** — Tengok preview; tak puas hati, bagitau ("Hook ni lemah la") → AI terus betulkan.
6. **SIMPAN JADI skill** — Suruh simpan sebagai skill (`premium-motion-ad-video`). Lepas ni bagi brief pendek je → video siap.

**Rahsia:** bukan prompt magic — **PLAN → BAHAN → BETULKAN**. Tu je.

---

## 7. Cara Guna Skill Ni (Brief Template)

Bila user bagi brief, kumpul dulu:
```
PRODUK   :
TARGET   :
MESEJ    :
HOOK     : (janji hasil dalam ≤8 perkataan)
LANGKAH  : (3–6 poin, setiap satu 2 perkataan "BOLD + serif")
CTA      : (cth. Komen "NAK" untuk Part 2)
BAHAN    : logo / gambar / screenshot / voiceover
HANDLE   : @...
```
Kemudian hasilkan: skrip berkod masa ikut jadual Seksyen 2, senarai overlay ikut Effect Library (Seksyen 4), dan caption kata-demi-kata dengan kata highlight.

## 8. Checklist Kualiti
- [ ] Hook dalam 2 saat pertama, ada janji hasil + emoji reaksi
- [ ] Tiada frame statik > 3 saat
- [ ] Setiap perkataan ada caption, kata semasa di-highlight biru
- [ ] Pil langkah bernombor konsisten
- [ ] Palet navy-ungu-biru + aksen kuning/merah/hijau sahaja
- [ ] Kombinasi font BOLD italic sans + serif italic
- [ ] SFX whoosh/pop pada setiap elemen masuk
- [ ] Recap 3–4 kata kunci gergasi sebelum CTA
- [ ] CTA bersiri (Part 2) + logo jenama + subjek blur
- [ ] Teks penting di luar zon UI TikTok
