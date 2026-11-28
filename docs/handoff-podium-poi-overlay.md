# Handoff: popup web di POI podium (tanpa tab baru)

Untuk engineer yang melanjutkan pekerjaan POI podium di tur KIJB Virtual Space.
Dokumen ini menjelaskan **mekanismenya**. Status pekerjaan, data, dan TODO lengkap ada di
[`team-showcase.md`](team-showcase.md).

Branch: `kijb-v2` (commit `48608fd0d` showcase, `b0ef204f4` perapian popup; pastikan sudah di-push sebelum dibuka).
Staging: `https://staging.kijbvirtualspace.com` (project Pages `kijb-staging`).

## Masalahnya

Podium menampilkan detail peserta lewat popup native 3DVista dengan panah chevron. Kita ingin POI di podium
membuka **halaman web** (`/team`: daftar inovasi, lalu detail) **tanpa membawa user keluar dari tur**.
Tab baru (`window.open`) membuat user kehilangan posisi di tur, apalagi di HP.

## Idenya dalam satu gambar

```
klik POI  -->  aksi JS di tur:  window.kijbOpenTeam('pemda-kota')
                      |
                      v   (custom.js)
   <div id="kijb-team-overlay">  position:fixed; inset:0; z-index sangat tinggi
        <iframe src="team/?embed=1&c=pemda-kota">          <-- halaman web kita
                      |
   tombol X / Esc / klik area gelap  -->  overlay dihapus dari DOM
```

Tur 3DVista **tidak dimuat ulang dan tidak di-pause**; overlay hanya lapisan HTML di atasnya. Saat ditutup,
user kembali ke posisi kamera yang sama. Tiga bagian yang bekerja sama:

### 1. Aksi di POI (3DVista memanggil fungsi global)

Aksi klik sebuah POI di 3DVista boleh berupa JavaScript. Kita hanya memanggil satu fungsi global:

```js
try{window.kijbOpenTeam('pemda-kota')}catch(e){console.log(e)}
```

Di Studio: pilih POI, Action **Execute JS**, isi `window.kijbOpenTeam('<id-kategori>')`.
Id kategori: `bumn-bumd`, `kementrian-lembaga-pt`, `pemda-kabupaten`, `pemda-kota`, `pemprov-jabar`, `smp-sma-sederajat`
(ejaan `kementrian` mengikuti slug di situs vote).

Di build yang sudah diekspor, aksi itu tersimpan sebagai string `"click"` pada objek
`HotspotPanoramaOverlayArea_...` di `public/Vista/script_general.js` dan `script_mobile.js`.
`scripts/patch-team-poi.py` mengganti string itu secara idempoten (lihat bagian "Patch").

### 2. Pembuka overlay (`public/Vista/custom.js`, bagian bawah file)

`custom.js` dimuat `defer` oleh `index.htm`/`index.html`, jadi `window.kijbOpenTeam` sudah ada sebelum user sempat klik.
Intinya:

```js
window.kijbOpenTeam = function (category) {
  if (document.getElementById('kijb-team-overlay')) return;      // cegah dobel
  lastFocus = document.activeElement;                            // untuk mengembalikan fokus
  var overlay = document.createElement('div');                   // role=dialog aria-modal=true
  var frame   = document.createElement('iframe');
  frame.src   = 'team/?embed=1' + (category ? '&c=' + encodeURIComponent(category) : '');
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });  // klik area gelap
  overlay.appendChild(frame); document.body.appendChild(overlay);
  document.addEventListener('keydown', onKey, true);             // Esc menutup
  window.addEventListener('message', onMessage);                 // iframe minta ditutup
};
```

- `src` memakai **URL relatif** (`team/...`), jadi benar di `/` (Pages) maupun `/3DVista/` (VPS).
- Gaya overlay ada di `custom.css` (bagian 5): `position:fixed; inset:0; z-index:2147483000`, panel maks 1100 px,
  layar penuh di HP, sudut membulat dan bayangan di desktop (>= 900x600).
- Menutup: hapus node dari DOM, lepas listener, kembalikan fokus ke elemen sebelumnya. Ada juga `window.kijbCloseTeam()`.

### 3. Halaman di dalam iframe (`public/Vista/team/`)

Halaman statis biasa (HTML + CSS + JS tanpa framework). Dengan `?embed=1` ia:
- menampilkan tombol **X** dan menyembunyikan lebar maksimum (mengisi seluruh iframe, scroll di dalam),
- menutup lewat `postMessage` ke parent (iframe tidak boleh menghapus dirinya sendiri):

```js
window.parent.postMessage({ type: 'kijb-team-close' }, location.origin);   // team.js
```

Parent (`custom.js`) hanya menerima pesan bila **origin sama** dan `type === 'kijb-team-close'`:

```js
function onMessage(e) {
  if (e.origin !== window.location.origin) return;
  if (e.data && e.data.type === 'kijb-team-close') close();
}
```

`?c=<kategori>` membuka kategori langsung (`#/pemda-kota`). Navigasi di dalam halaman (kategori -> daftar -> detail)
memakai hash (`#/kategori/id`), jadi tombol kembali di halaman bekerja tanpa reload dan tidak butuh rewrite server.

## Kenapa iframe, bukan alternatifnya

| Opsi | Masalah |
|---|---|
| `window.open` / tab baru | User meninggalkan tur; di HP terasa terputus |
| Popup native 3DVista (`WebFrame` di `Window`) | Harus dibuat per komponen di Studio; popup galeri lama **tidak ada** di `script_mobile.js`; chevron sulit dinavigasi |
| Navigasi penuh ke `/team` | Tur dimuat ulang, kamera kembali ke awal |
| **Overlay + iframe (dipakai)** | Satu halaman untuk desktop dan HP, tur tidak tersentuh, mudah ditutup |

## Batasan yang perlu diketahui

- **Same-origin.** Halaman harus satu origin dengan tur. Itu yang membuat `postMessage` aman dan menghindari blokir
  `X-Frame-Options`/`frame-ancestors`. Untuk memuat situs lain (mis. `vote.kijbvirtualspace.com`) di overlay yang sama,
  situs itu harus mengizinkan di-frame, dan `kijbOpenTeam` perlu digeneralisasi (sekarang hanya menerima id kategori).
- **Tur tetap berjalan di belakang** (audio, animasi). Overlay tidak mem-pause tur. Bila perlu, panggil API pause tur
  (`tour.pause()` / `tour.resume()`) di `open`/`close`.
- **Cache.** `custom.css`/`custom.js` dirujuk dengan `?v=` statis di `index.htm` dan `index.html`. Naikkan nilainya setiap
  file berubah (sekarang `20261128b`). `script_general.js`/`script_mobile.js` di-cache sampai ~4 jam di Cloudflare.
- **Pages Function.** `functions/team/pdf/[[path]].js` hanya untuk PDF besar dari R2; mekanisme overlay tidak bergantung padanya.
- **Server statis sederhana** (mis. `python3 -m http.server`) cukup untuk menguji overlay, tapi tidak menjalankan Pages Functions.

## Patch aksi POI di build yang sudah diekspor

```bash
python3 scripts/patch-team-poi.py --check   # lapor saja; keluar dengan kode 1 bila ada yang belum dipatch
python3 scripts/patch-team-poi.py           # terapkan (idempoten)
```

Pemetaan ada di konstanta `POIS` (id area klik -> id kategori). Skrip hanya mengubah aksi POI yang **sudah ada**; ia tidak
membuat POI baru (butuh yaw/pitch). Saat ini baru **satu** POI tersambung: podium **PEMDA KOTA** di scene `360_Exhibition_01`
(yaw 113.23, pitch 3.43, area `HotspotPanoramaOverlayArea_0A29341B_1B0A_85C1_41A1_9AD7687FC6E6`).

**Setiap ekspor ulang dari 3DVista menimpa `script_*.js`.** Cara paling awet: set aksi **Execute JS** langsung di Studio
untuk keenam POI. Sampai itu dilakukan, jalankan ulang skrip patch setelah tiap ekspor.

## Yang perlu dikerjakan di sisi Studio

1. Tambahkan POI di 5 podium lain (BUMN/BUMD, Kementerian/Lembaga/PT, Pemda Kabupaten, Pemprov Jabar, SMP/SMA Sederajat)
   dengan aksi `window.kijbOpenTeam('<id-kategori>')`. Podium ada di `360_Exhibition_01`, `360_Booth_01`, `360_Booth_02`.
2. Urutan podium dari kiri: BUMN/BUMD, Kementerian/Lembaga/PT, Pemda Kabupaten, Pemda Kota, Pemprov Jabar, SMP/SMA.
3. Setelah ekspor, jalankan `python3 scripts/patch-team-poi.py --check` untuk memastikan tidak ada aksi lama yang tersisa,
   lalu uji tiap podium membuka kategori yang benar.

## Cara menguji

```bash
cd public/Vista && python3 -m http.server 8099      # buka http://127.0.0.1:8099/
```

Tanpa mengklik POI, di console browser:

```js
window.kijbOpenTeam('pemda-kota')     // buka overlay
window.kijbCloseTeam()                // tutup
// memicu aksi klik POI yang sebenarnya:
tour._getRootPlayer()['HotspotPanoramaOverlayArea_0A29341B_1B0A_85C1_41A1_9AD7687FC6E6'].trigger('click')
```

Yang layak dicek: X, Esc, klik area gelap menutup; membuka dua kali tidak menumpuk overlay; fokus kembali ke tur;
halaman nyaman di HP (layar penuh) dan desktop (panel melayang); tombol kembali di halaman bekerja.
Lakukan hard refresh karena cache browser menyimpan file statis.

## Peta file

| Path | Fungsi |
|---|---|
| `public/Vista/custom.js` | `kijbOpenTeam` / `kijbCloseTeam` (bagian bawah file) |
| `public/Vista/custom.css` | Gaya overlay `.kijb-team-overlay` (bagian 5) |
| `public/Vista/team/` | Halaman: `index.html`, `team.css`, `team.js`, `data/inovasi.json`, `pdf/` |
| `scripts/patch-team-poi.py` | Mengubah aksi klik POI di `script_general.js` dan `script_mobile.js` |
| `docs/team-showcase.md` | Status, data, TODO, keputusan desain |
