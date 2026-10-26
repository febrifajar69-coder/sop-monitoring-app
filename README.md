# Sistem Special Order Part (SOP) & Monitoring Follow Up SA
**PT. Agung Automall Gianyar**

Aplikasi web responsif (HP, Tablet, Laptop, PC) untuk pembuatan Form Order **Special Order Part (SOP)** oleh **Partman** dan pemantauan serta pengisian **Follow Up 1, 2, dan 3** oleh **Service Advisor (SA)** yang terintegrasi langsung dengan kedua Google Spreadsheet bengkel.

---

## Fitur Utama

1. **Menu Pembuatan Form Order (Khusus Partman)**
   - **Auto-Lookup Pelanggan (`Sheet RAW`):** Mengetik `NOPOL` otomatis mencari Nama Customer, No. Telp, dan Alamat dari 50.784 data pelanggan di Spreadsheet 1.
   - **Pilihan SA (`J11`) & Input Manual PIC untuk `OTHER`:**
     - Mendukung pilihan `AJS`, `AYU`, `FIK`, `WBN`, dan `OTHER`.
     - Khusus saat memilih **`OTHER`**, muncul kotak input manual **Nama PIC / SA** (misal `PONI`, `MRA`, `PHW`, `THS`, `WSK`, `PTW`) yang otomatis dikirim ke **Sheet `OTHER`** dan tertulis di **Kolom R (`SA`)** serta pada form cetak.
   - **Multi-Item Part Dinamis per No. Polisi:** Bisa menambahkan lebih dari 1 item part dalam 1 Form Order.
   - **Cetak / Print Form Order (`SOP LEMBAR 1` & `SOP LEMBAR 2`):**
     - **Lembar 1 (Customer)** & **Lembar 2 (Internal Partsman-SA-MRA)** siap cetak ukuran A4/F4 atau simpan PDF.

2. **Menu Monitoring Follow Up SA (`AJS` | `AYU` | `FIK` | `WBN` | `OTHER`)**
   - **Pembatasan Hak Edit SA:** Seluruh data Order & Item Part dari Partman bersifat **Read-Only (Terkunci)**. SA hanya dapat mengisi dan menyimpan kolom **Follow Up 1**, **Follow Up 2**, dan **Follow Up 3** (Kolom `N`, `O`, `P`).

---

## Cara Memasang Script API di Google Spreadsheet (Tanpa Menghapus Script Lama)

1. Buka **Spreadsheet 1 (Form Order)**:
   `https://docs.google.com/spreadsheets/d/12PjXEGd8Z52O40lB-_nA89vJH6wXSneBmBsSmDYlchk/edit`
2. Klik menu **Extensions (Ekstensi) -> Apps Script** di bagian atas.
3. **Tidak perlu menghapus script lama Anda:** Di panel sebelah kiri (**Files**), klik tombol **`+` (Add a file) -> Script**, lalu beri nama file baru tersebut: **`WebAppAPI`**.
4. Buka file [`google-apps-script/WebAppAPI.gs`](./google-apps-script/WebAppAPI.gs) dari proyek ini, salin seluruh isinya, lalu **paste** ke dalam file `WebAppAPI.gs` di Google Apps Script dan tekan `Ctrl + S`.
5. Klik tombol biru **Deploy -> New deployment** di pojok kanan atas:
   - Pilih jenis (**Select type**): **Web app**
   - **Description**: `API SOP & Monitoring SA`
   - **Execute as**: `Me` (Email Anda)
   - **Who has access**: `Anyone` (Siapa saja)
6. Klik **Deploy**, berikan izin akses (*Authorize access*), lalu salin **Web app URL** yang muncul (`https://script.google.com/macros/s/.../exec`).
7. Tempelkan URL tersebut pada variabel `APPS_SCRIPT_URL` di dalam file [`config.js`](./config.js) (atau langsung melalui tombol **⚙ Pengaturan & Script API** di pojok kanan atas aplikasi web).

---

## Cara Push ke GitHub & Deploy di Vercel

1. **Push ke GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Aplikasi SOP & Monitoring SA"
   git branch -M main
   git remote add origin https://github.com/USERNAME_ANDA/NAMA_REPO_ANDA.git
   git push -u origin main
   ```
2. **Deploy di Vercel:**
   - Buka [vercel.com](https://vercel.com) dan login menggunakan akun GitHub Anda.
   - Klik **Add New... -> Project**, lalu pilih repository GitHub yang baru Anda *push*.
   - Klik **Deploy** (tidak perlu pengaturan build tambahan karena `vercel.json` sudah dikonfigurasi).
   - Dalam beberapa detik aplikasi siap dibuka di HP, Tablet, Laptop, dan PC!
