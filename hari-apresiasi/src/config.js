// Semua kandungan video ada di sini. Tukar nilai, render semula.
// Sumber: poster "Majlis Apresiasi Guru dan Staf MRSM Sultan Azlan Shah 2026".
export default {
  org: { logo: 'logo.png' }, // logo MRSM (assets/logo.png)
  header: {
    pre: 'Majlis',
    main: 'APRESIASI',
    sub: 'GURU DAN STAF · 2026',
    tagline: 'MRSM Sultan Azlan Shah',
  },
  event: {
    date: '2026-11-27',            // Jumaat
    time: '10.30 PAGI',             // label pada pil kalendar
    venue: 'BILIK TERATAI',         // tempat (tile peta)
    venueSub: 'MRSM SULTAN AZLAN SHAH',
    footerVenue: 'BILIK TERATAI',
  },
  // Countdown. daysLeft = nombor tetap; kalau null, dikira dari `today` (YYYY-MM-DD) hingga event.date.
  countdown: { daysLeft: null, today: '2026-11-21' },
  stats: {
    // Kaunter tile trofi: menggulung masa (minit sejak tengah malam)
    counter: { label1: 'MASA MAJLIS', unit1: 'pagi', value1: 630, label2: 'BERSURAI', unit2: 'tengah hari', value2: 750 },
    // Tile kad bertukar-tukar (atur cara)
    agenda: [
      { lines: ['Sarapan'], big: '7.30', unit: 'pagi' },
      { lines: ['Pendaftaran', 'Guru dan Staf'], big: '8.15', unit: 'pagi' },
      { lines: ['Mesyuarat Agung', 'TESTAC'], big: '8.30', unit: 'pagi' },
      { lines: ['Perasmian &', 'Sijil Anugerah'], big: '10.30', unit: 'pagi' },
    ],
    // Kad maroon selepas pusingan (menggantikan "Tokoh Murid")
    highlight: { label: 'PENYAMPAIAN', title: ['SIJIL &', 'ANUGERAH'], note1: 'Dirasmikan oleh Tuan Pengetua', note2: '10.30 pagi' },
    pagi: { big: '7.30 PAGI', label: ['Sarapan &', 'pendaftaran'] },
    tile3: { n: '8.30', label: ['Mesyuarat Agung', 'TESTAC'] },
    tile4: { n: 'Jamuan', label: ['di Bilik Jasmin', '12.30 t/hari'] },
    tile5: { title: 'HADIR', label: ['semua guru', 'dan staf'] },
  },
};
