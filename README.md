# PERSEPTOR — Paket Frontend GitHub Pages + Backend Supabase

**PERSEPTOR** (*Program Pembimbingan dan Supervisi Klinik Terintegrasi*) — "Mendampingi, Membina, Meningkatkan Mutu Pelayanan"

Paket ini adalah **frontend statis satu file (`index.html`)** yang siap dihosting di **GitHub Pages** (sesuai arah *frontend pakai GitHub*) dan menyimpan data **langsung ke Supabase** (*backend pakai Supabase*) melalui Supabase JS v2 — bukan localStorage.

## Isi Paket

| File | Fungsi |
|---|---|
| `index.html` | Aplikasi lengkap (login, dashboard, pemetaan, program, jadwal kalender, pelaksanaan 9 tab, instrumen 1–5, kasus anonim, temuan, rekomendasi, RTL + verifikasi, dokumentasi, berita acara cetak, laporan CSV/cetak, notifikasi, audit trail, QR kegiatan) |
| `schema.sql` | Skema PostgreSQL untuk Supabase: 20 tabel + relasi FK, RLS per peran, bucket Storage `dokumentasi`, seed master kompetensi & contoh Puskesmas |
| `README.md` | Panduan ini |

## Fitur Utama

- **5 Peran RBAC**: Superadmin Dinkes, Admin Dinkes, Perseptor/Pembimbing, Admin Puskesmas, Peserta/Tenaga Kesehatan — menu & akses data disesuaikan peran; keamanan ditegakkan server-side oleh **Row Level Security** Supabase.
- **12 tahapan alur kerja**: Pemetaan (skor prioritas 1–4 otomatis jadi dasar program) → Program (+duplikat) → Penetapan Perseptor (deteksi benturan jadwal) → Jadwal (kalender, 7 status, notifikasi) → Pelaksanaan → Instrumen (skala 1–5) → Observasi → Diskusi Kasus (anonim) → Temuan (11 kategori, risiko) → Rekomendasi → RTL (5 status, auto-"Terlambat", verifikasi bersejarah) → Pelaporan.
- **Detail kegiatan 9 tab**: Ringkasan | Peserta | Instrumen | Observasi | Kasus | Temuan | Rekomendasi | RTL | Dokumentasi.
- **Berita Acara otomatis**: buat → sunting → cetak/PDF; **QR kegiatan** siap cetak.
- **Laporan** 4 tipe dengan cetak/PDF dan ekspor CSV (bisa dibuka di Excel).
- **Audit trail** setiap tambah/ubah/hapus; **notifikasi in-app**; pencarian global (Ctrl+K).

## Langkah Deploy

### 1. Buat proyek Supabase (± 5 menit)
1. Daftar/masuk ke [supabase.com](https://supabase.com) → **New project** (pilih region terdekat, mis. Singapore).
2. Setelah proyek aktif, buka **SQL Editor** → **New query** → salin seluruh isi `schema.sql` → **Run**. Semua tabel, RLS, dan seed akan dibuat.
3. Buka **Authentication → Users → Add user → Create new user**: buat akun superadmin (mis. `superadmin@dinkes.go.id`) dengan sandi kuat, centang *Auto Confirm User*.
4. Jalankan di SQL Editor untuk mendaftarkan profil (ganti email sesuai langkah 3):
   ```sql
   insert into public.users (id, email, nama, role)
   select id, email, 'Dra. Kartika Dewi, M.Si', 'SUPERADMIN_DINKES'
   from auth.users where email = 'superadmin@dinkes.go.id'
   on conflict (id) do nothing;
   ```
5. Ulangi langkah 3–4 untuk akun lain (Admin Dinkes, Perseptor, Admin Puskesmas, Peserta). Untuk Admin Puskesmas/Peserta, isi juga `puskesmas_id` / `tenaga_id` (lihat contoh tercatat di bagian bawah `schema.sql`).
6. Salin **Project URL** dan **anon public key** dari **Settings → API**.

### 2. Hubungkan frontend ke Supabase
Dua cara, pilih salah satu:
- **Cara A (disarankan untuk produksi):** buka `index.html`, cari baris `const EMBEDDED_CONFIG = { url: '', anonKey: '' };` lalu isi, contoh:
  ```js
  const EMBEDDED_CONFIG = { url: 'https://abcdxyz.supabase.co', anonKey: 'eyJhbGciOi...' };
  ```
- **Cara B (tanpa edit file):** buka aplikasi → akan muncul layar *Hubungkan ke Supabase* → tempel URL & anon key → **Simpan & Hubungkan** (tersimpan di browser per pengguna).

> ⚠️ *Anon key* memang dirancang publik; keamanan data dijauhkan oleh RLS, jadi **jangan** pakai `service_role key` di frontend.

### 3. Upload ke GitHub & aktifkan GitHub Pages
```bash
git init
git add index.html schema.sql README.md
git commit -m "PERSEPTOR: frontend GitHub Pages + Supabase"
git branch -M main
git remote add origin https://github.com/<username>/<repo>.git
git push -u origin main
```
Lalu di GitHub: **Settings → Pages → Source: Deploy from a branch → Branch: `main` / (root) → Save.**
Aplikasi aktif di: `https://<username>.github.io/<repo>/` (tunggu 1–2 menit).

## Mode Demo (tanpa Supabase)
Pada layar awal tersedia tombol **Coba Mode Demo** — aplikasi berjalan penuh dengan data contoh yang disimpan di browser (localStorage) **hanya untuk pratinjau/latihan**, jelas ditandai banner "MODE DEMO". Untuk pemakaian resmi selalu gunakan mode Supabase agar data permanen dan bisa diakses lintas perangkat.

## Struktur Data (ringkas)
`users, puskesmas, perseptor, kompetensi, tenaga_kesehatan, pemetaan, program, jadwal, peserta, penilaian, kasus, temuan, rekomendasi, rtl, verifikasi_rtl, evaluasi, dokumentasi, berita_acara, notifikasi, audit_log` — semua terhubung foreign key dan dilindungi RLS berbasis peran + cakupan Puskesmas. Berkas dokumentasi disimpan di **Supabase Storage** bucket `dokumentasi` (URL publik untuk tampilan).

## Catatan & Pengembangan Lanjutan
- **RTL otomatis "Terlambat"** dihitung saat halaman dibuka (batas waktu lewat & belum selesai).
- **e-signature, notifikasi WhatsApp/email** adalah tahap lanjutan: bisa diintegrasikan via Supabase Edge Functions + provider pihak ketiga tanpa mengubah frontend.
- Karena backend-nya PostgreSQL, skema ini juga kompatibel jika kelak dimigrasikan ke aplikasi server (mis. Next.js + Prisma) tanpa mengubah struktur data.
- Ganti sandi melalui Supabase Dashboard (Authentication → Users) atau aktifkan fitur reset password email dari Supabase Auth.

## Lisensi & Kredit
Dibangun untuk Dinas Kesehatan Kabupaten & Puskesmas. Teknologi: vanilla JS SPA, Supabase JS v2, Chart.js, QRCode.js — semuanya via CDN, tanpa proses build.
