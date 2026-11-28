# Showcase Inovasi (`/team`)

Catatan kerja untuk halaman **showcase peserta KIJB 2025** yang dibuka dari podium di tur 3DVista.
Dibuat 28 Nov 2026 di branch `kijb-v2`. Tujuan dokumen ini: supaya kita (atau siapa pun) bisa
kembali ke pekerjaan ini kapan saja tanpa menebak apa yang sudah dibuat, kenapa, dan apa yang belum.

## Ringkasnya

Sebelumnya detail peserta ditampilkan sebagai popup bawaan 3DVista dengan panah chevron untuk
pindah antar inovasi (UX kurang nyaman). Sekarang:

```
POI di podium  --klik-->  window.kijbOpenTeam('<kategori>')   (custom.js)
                              |
                              v
        overlay layar penuh di atas tur  =  iframe ke  /team/?embed=1&c=<kategori>
                              |
        daftar inovasi kategori  -->  detail inovasi  -->  (kembali ke daftar / tutup)
```

Overlay ditutup dengan tombol X, Esc, atau klik area gelap. Tur di bawahnya tidak dimuat ulang,
jadi posisi kamera user tetap sama. Halaman `/team` juga bisa dibuka sendiri (tanpa tur).

## Status (per 28 Nov 2026)

| Bagian | Status |
|---|---|
| Halaman `/team` (kategori, daftar, detail, responsif, mode embed) | Selesai, sudah diuji desktop, tablet, HP |
| Data 30 inovasi (judul resmi, kategori, urutan) | Selesai, dari `vote.kijbvirtualspace.com` |
| PDF submisi | 27 dari 30. 24 statis, 3 besar lewat R2 (**belum diunggah**, lihat TODO) |
| Deskripsi, video YouTube, Instagram, instansi | **Belum ada datanya** (kolom sudah disiapkan, otomatis tersembunyi bila kosong) |
| POI podium | **1 dari 6** tersambung (PEMDA KOTA). 5 lainnya belum ada POI-nya |
| Pembuka overlay di tur | Selesai |
| Deploy ke staging / produksi | Lihat bagian Deploy. Produksi (`kijbvirtualspace.com`) sengaja tidak disentuh |

## Peta file

| Path | Fungsi |
|---|---|
| `public/Vista/team/index.html`, `team.css`, `team.js` | Halaman. Tanpa framework dan tanpa build step |
| `public/Vista/team/data/inovasi.json` | **Sumber data tunggal.** Edit file ini untuk menambah deskripsi, video, dst. |
| `public/Vista/team/pdf/<slug>.pdf` | 24 PDF statis (di bawah 25 MiB) |
| `functions/team/pdf/[[path]].js` | Pages Function: PDF dari R2 dulu, lalu jatuh ke file statis |
| `public/Vista/custom.js` | `window.kijbOpenTeam(kategori)` dan `kijbCloseTeam()` (bagian bawah file) |
| `public/Vista/custom.css` | Gaya overlay `.kijb-team-overlay` (bagian 5) |
| `scripts/patch-team-poi.py` | Mengubah aksi klik POI di `script_general.js` dan `script_mobile.js` (idempoten) |
| `scripts/upload-team-pdfs-to-r2.sh` | Mengunggah 3 PDF besar dari history git ke R2 |
| `server.js` | Rute `/team/` untuk jalur VPS/Docker (index direktori dimatikan di sana) |

## Data

`inovasi.json` punya `categories` (6, urutan podium) dan `items` (30). Field tiap item:

| Field | Wajib | Keterangan |
|---|---|---|
| `id` | ya | Slug unik, dipakai di URL (`#/pemda-kota/bogor-smart-health`) |
| `category` | ya | Salah satu id kategori |
| `order` | ya | Urutan dalam kategori |
| `short`, `title` | ya | Nama pendek (judul daftar) dan judul resmi lengkap |
| `pdf` | tidak | `pdf/<slug>.pdf`. Tombol "Lihat dokumen" |
| `pdfHost` | tidak | `"r2"` bila PDF > 25 MiB dan disajikan dari R2 (hanya catatan, kode tidak membacanya) |
| `description` | tidak | Teks biasa; baris kosong jadi paragraf |
| `video` | tidak | URL YouTube apa pun (`watch?v=`, `youtu.be`, `embed`, `shorts`). Jadi pemutar + tombol |
| `instagram` | tidak | URL `https://` |
| `org` | tidak | Nama instansi |

Field kosong (`null`) tidak ditampilkan. Semua teks dirender lewat `textContent` (aman dari XSS).

**Asal data:**
- Judul dan kategori: halaman publik `https://vote.kijbvirtualspace.com/<kategori>` (30 inovasi: 4+5+6+5+5+5).
- PDF: history git `kijb-v2` commit `3c0c07f11` (`public/Vista/files/`), dihapus di `ae6e895` ("remove unused PDFs").
  Dipetakan ke inovasi dengan **membaca teks halaman 1-2 tiap PDF** (`pdftotext`), bukan dari nama file.
  Nama file menyesatkan (mis. `Presentasi_en.pdf` = SIMOTIP, `7. PDF atau Slide Inovasi_en.pdf` = KETUPAT LEBARAN).
- Tanpa PDF: **e-Voting, BUNG SENJA, TAPAL DESA** (tidak ada file submisinya di sumber mana pun).
- PDF yang bukan peserta (tidak dipakai): `Buku Panduan KIJB`, `CTS DECK 1`, `Doc1` (kosong), `TITIK 0` (deck PT Titik Inovasi Teknologi).

**Peringatan soal data lama:** contoh "Port-KidD" (SMAN 1 Kota Bogor) dan ~30 deskripsi lain di
`locale/en.txt` branch `kijb-v2` (BERSEKA, TiTaTu, Depok Single Window, dst.) **bukan** peserta
di daftar vote 2025. Branch `main` tidak punya data peserta sama sekali (hanya 1 PDF, Buku Panduan).
Jangan mengira `main` sebagai sumber data.

## PDF besar (> 25 MiB)

Cloudflare Pages menolak file di atas 25 MiB. Tiga PDF melebihi itu: `apo-mayangan` (61 MB),
`ngupahan` (56 MB), `konservasi-mata-air` (29 MB). Mereka disajikan dari R2 lewat
`functions/team/pdf/[[path]].js` (key `team/pdf/<slug>.pdf`, binding `MEDIA_BUCKET`).

Sampai diunggah, tombol PDF ketiga inovasi itu menghasilkan 404:

```bash
export R2_ACCESS_KEY_ID=... R2_SECRET_ACCESS_KEY=... R2_BUCKET=kijb-v2
./scripts/upload-team-pdfs-to-r2.sh --dry-run   # lalu tanpa --dry-run
```

Token R2 (Object Read & Write, akun Cendana) dibuat di dashboard. **Hapus token setelah selesai.**

## POI di podium

Tur punya 11 panorama. Podium kategori ada di `360_Exhibition_01`, `360_Booth_01`, `360_Booth_02`
(`Gallery_01..06` hanya ruang galeri dengan POI panah dan "Info Red 01" per peserta, belum dipakai di sini).

Yang tersambung sekarang: POI "Info Red 01" di `360_Exhibition_01` (yaw 113.23, pitch 3.43),
yaitu podium berlabel **PEMDA KOTA** -> `pemda-kota`. Area klik: `HotspotPanoramaOverlayArea_0A29341B_1B0A_85C1_41A1_9AD7687FC6E6`.
Aksi aslinya (toggle popup `Container_047BEA97...`, dibuat di commit `3c0c07f`) sudah diganti oleh
`scripts/patch-team-poi.py`. Di `script_mobile.js` POI yang sama ada tetapi kontainer popup-nya tidak,
jadi dulu rusak diam-diam di HP posisi tegak. Patch memperbaikinya.

**Cara menambah 5 POI lainnya (disarankan, tahan ekspor ulang):** di 3DVista Studio, tambahkan POI di
tiap podium dengan aksi **Execute JS**:

| Podium | Isi aksi JS |
|---|---|
| BUMN / BUMD | `window.kijbOpenTeam('bumn-bumd')` |
| Kementerian / Lembaga / PT | `window.kijbOpenTeam('kementrian-lembaga-pt')` |
| Pemda Kabupaten | `window.kijbOpenTeam('pemda-kabupaten')` |
| Pemda Kota | `window.kijbOpenTeam('pemda-kota')` |
| Pemprov Jabar | `window.kijbOpenTeam('pemprov-jabar')` |
| SMP / SMA Sederajat | `window.kijbOpenTeam('smp-sma-sederajat')` |

Urutan podium dari kiri: BUMN/BUMD, Kementerian/Lembaga/PT, Pemda Kabupaten, Pemda Kota, Pemprov Jabar, SMP/SMA.
(Ejaan `kementrian` mengikuti slug di situs vote.)

Alternatif tanpa Studio: tambahkan `"HotspotPanoramaOverlayArea_<id>": "<kategori>"` ke `POIS` di
`scripts/patch-team-poi.py`, lalu jalankan skripnya. Skrip hanya mengubah aksi klik POI yang **sudah ada**;
membuat POI baru butuh posisi (yaw/pitch) yang belum kita punya.

**Jalankan ulang skrip setelah setiap ekspor tur dari 3DVista:** `python3 scripts/patch-team-poi.py`
(`--check` hanya melapor dan keluar dengan kode 1 jika ada yang belum dipatch).

## Cache (penting)

- `custom.css` / `custom.js` dirujuk dengan `?v=...` statis di `index.htm` dan `index.html` (di Pages tidak ada
  `server.js` yang menyisipkan versi dinamis). **Naikkan nilai `v` di kedua file itu setiap kali custom.css/js berubah**,
  kalau tidak pengunjung bisa memakai salinan lama berjam-jam. Versi sekarang: `20261128b`.
  Hal yang sama untuk `team.css`, `team.js`, dan `data/inovasi.json` (`?v=` di `team/index.html` dan `team.js`).
- `script_general.js` / `script_mobile.js` di-cache Cloudflare/browser sampai ~4 jam (`max-age=14400`).
  Setelah patch POI di-deploy, sebagian pengunjung baru melihat perilaku baru setelah itu.

## Deploy

- Staging: project Pages `kijb-staging` (akun Cendana), production branch `kijb-v2`, build command
  `rm -rf public/Vista/media`, output `public/Vista`, binding R2 `MEDIA_BUCKET` -> bucket `kijb-v2`.
  Tile `media/` disajikan dari R2 (lihat `functions/media`), disinkronkan oleh workflow
  `.github/workflows/sync-media-to-r2.yml`. Domain: `staging.kijbvirtualspace.com`.
- Produksi `kijbvirtualspace.com` memakai project lain (branch `main`) dan **belum** punya `/team`. Memindahkannya
  adalah pekerjaan terpisah.
- VPS/Docker (branch `main`): `server.js` melayani `/team/`, tapi **3 PDF besar tidak ada** di disk (hanya di R2/history),
  jadi tombol PDF-nya 404 di sana.

## Keputusan desain (supaya tidak diperdebatkan ulang tanpa konteks)

- **Overlay iframe, bukan tab baru:** user tetap di tur dan kembali ke posisi yang sama.
- **JSON statis, bukan membaca Worker `vote-kijb`:** tanpa backend, mudah diedit tim. Judul dan kategori disalin
  dari situs vote; bila daftar peserta di sana berubah, perbarui `inovasi.json` secara manual.
- **Hash routing (`#/kategori/id`):** jalan di hosting statis mana pun, tautan dalam bisa dibagikan, tombol back browser bekerja.
- **Tanpa framework:** satu halaman kecil, tidak perlu build step di Pages.
- **Halaman terpisah dari engine 3DVista:** popup native tidak ada di `script_mobile.js`, jadi satu halaman web
  memberi pengalaman sama di desktop dan HP.

## TODO / alasan untuk revisit

- [ ] Unggah 3 PDF besar ke R2 (`scripts/upload-team-pdfs-to-r2.sh`).
- [ ] Tambahkan 5 POI podium lainnya (Studio, lihat tabel di atas) dan verifikasi tiap podium membuka kategori yang benar.
- [ ] Isi `description`, `video`, `instagram`, `org` untuk 30 inovasi (butuh data dari panitia/peserta).
- [ ] Cari PDF untuk e-Voting, BUNG SENJA, TAPAL DESA.
- [ ] Putuskan nasib popup lama (`Container_047BEA97...` dan ~33 `window_*`) yang kini tidak terpakai; aman dibiarkan.
- [ ] Pindahkan `/team` ke produksi (`kijbvirtualspace.com`) setelah staging disetujui (`main`, project terpisah, akun lain).

## Cara menguji lokal

```bash
cd public/Vista && python3 -m http.server 8099      # lalu buka http://127.0.0.1:8099/team/
```

- Halaman: `/team/`, `/team/#/pemda-kota`, `/team/#/pemda-kota/bogor-smart-health`, `/team/?c=pemda-kota&embed=1`.
- Di tur, buka overlay tanpa mengklik POI: jalankan `window.kijbOpenTeam('pemda-kota')` di console.
- Memicu aksi klik POI sebenarnya: `tour._getRootPlayer()['HotspotPanoramaOverlayArea_0A29341B_1B0A_85C1_41A1_9AD7687FC6E6'].trigger('click')`.
- Server statis sederhana tidak menjalankan Pages Functions, jadi PDF yang hanya ada di R2 (3 besar) tidak bisa diuji lokal.
- Browser punya cache heuristik untuk file statis; saat menguji ubahan, segarkan dengan `fetch(url, {cache:'reload'})` atau hard refresh.
