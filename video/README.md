# Video eAduan: PIC terima aduan (hologram)

- `eaduan_PIC_hologram_pro.mp4`: versi terbaik, gred warna sinematik (teal), zoom kamera, kilatan, aberasi kromatik, kad penutup berlogo, muzik rock
- `eaduan_PIC_hologram_rock.mp4`: versi akhir, muzik latar grunge/rock dan kesan bunyi (audio asal dibuang)
- `eaduan_PIC_hologram.mp4`: versi dengan audio asal rakaman dan kesan bunyi

Sumber: rakaman IMG_2191 (Google Drive `projects/`), 1080x1920, 22 saat.

## Jana semula

```
python3 skrip/overlay.py IMG_2191.mov eaduan_PIC_hologram.mp4 ../logo.png   # gred warna, hologram, kapsyen, kesan bunyi, kad penutup
python3 skrip/music.py music.wav 21.9                              # muzik rock disintesis
ffmpeg -i eaduan_PIC_hologram.mp4.v.mp4 -i music.wav -i eaduan_PIC_hologram.mp4.fx.wav \
  -filter_complex "[1:a]volume=0.7[m];[2:a]pan=stereo|c0=c0|c1=c0[f];[m][f]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k eaduan_PIC_hologram_rock.mp4
```

Perlu Python 3 (Pillow, NumPy) dan ffmpeg.
