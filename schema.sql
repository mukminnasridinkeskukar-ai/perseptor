-- ============================================================================
-- PERSEPTOR — Skema Database Supabase (PostgreSQL)
-- Program Pembimbingan dan Supervisi Klinik Terintegrasi
-- Cara pakai: Supabase Dashboard → SQL Editor → New query → paste → RUN
-- ============================================================================

-- ============ FUNGSI & HELPER ============
create extension if not exists "pgcrypto";

create or replace function public.current_app_user()
returns public.users language sql stable security definer set search_path = public as $$
  select * from users where id = auth.uid();
$$;

create or replace function public.is_dinkes()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from users where id = auth.uid() and role in ('SUPERADMIN_DINKES','ADMIN_DINKES'));
$$;

create or replace function public.my_puskesmas_id()
returns uuid language sql stable security definer set search_path = public as $$
  select puskesmas_id from users where id = auth.uid();
$$;

create or replace function public.my_perseptor_id()
returns uuid language sql stable security definer set search_path = public as $$
  select perseptor_id from users where id = auth.uid();
$$;

create or replace function public.my_tenaga_id()
returns uuid language sql stable security definer set search_path = public as $$
  select tenaga_id from users where id = auth.uid();
$$;

create or replace function public.role_()
returns text language sql stable security definer set search_path = public as $$
  select role from users where id = auth.uid();
$$;

-- updated_at otomatis
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ============ TABEL UTAMA ============
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  nama text not null,
  role text not null check (role in ('SUPERADMIN_DINKES','ADMIN_DINKES','PERSEPTOR','ADMIN_PUSKESMAS','PESERTA')),
  puskesmas_id uuid,
  perseptor_id uuid,
  tenaga_id uuid,
  aktif boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.puskesmas (
  id uuid primary key default gen_random_uuid(),
  kode text not null unique,
  nama text not null,
  kecamatan text not null,
  alamat text,
  kepala text,
  kontak text,
  email text,
  status text not null default 'AKTIF' check (status in ('AKTIF','NONAKTIF')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_pkm_upd on public.puskesmas;
create trigger trg_pkm_upd before update on public.puskesmas for each row execute function public.touch_updated_at();

create table if not exists public.perseptor (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  nip text,
  profesi text not null,
  jabatan text,
  unit_kerja text,
  area_keahlian text,
  str text, sip text, sertifikat text,
  kompetensi text,
  status text not null default 'AKTIF' check (status in ('AKTIF','NONAKTIF')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_prs_upd on public.perseptor;
create trigger trg_prs_upd before update on public.perseptor for each row execute function public.touch_updated_at();

create table if not exists public.kompetensi (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  kategori text not null,
  deskripsi text,
  created_at timestamptz not null default now()
);

create table if not exists public.tenaga_kesehatan (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  nip_nik text,
  profesi text not null,
  jabatan text,
  puskesmas_id uuid references public.puskesmas(id) on delete set null,
  kompetensi text,
  masa_kerja int default 0,
  status text not null default 'AKTIF' check (status in ('AKTIF','NONAKTIF')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_tk_upd on public.tenaga_kesehatan;
create trigger trg_tk_upd before update on public.tenaga_kesehatan for each row execute function public.touch_updated_at();

alter table public.users
  add constraint fk_users_pkm foreign key (puskesmas_id) references public.puskesmas(id) on delete set null,
  add constraint fk_users_prs foreign key (perseptor_id) references public.perseptor(id) on delete set null,
  add constraint fk_users_tk  foreign key (tenaga_id)    references public.tenaga_kesehatan(id) on delete set null;

-- ============ ALUR KERJA ============
create table if not exists public.pemetaan (
  id uuid primary key default gen_random_uuid(),
  tahun int not null default extract(year from now()),
  puskesmas_id uuid references public.puskesmas(id) on delete cascade,
  tenaga_id uuid references public.tenaga_kesehatan(id) on delete cascade,
  kompetensi_id uuid references public.kompetensi(id) on delete set null,
  skor int not null check (skor between 1 and 4),
  tingkat text not null check (tingkat in ('RENDAH','SEDANG','TINGGI','SANGAT TINGGI')),
  catatan text,
  status text not null default 'AKTIF',
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.program (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  tahun int not null default extract(year from now()),
  deskripsi text,
  mulai date, selesai date,
  status text not null default 'RENCANA' check (status in ('RENCANA','BERJALAN','SELESAI')),
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.jadwal (
  id uuid primary key default gen_random_uuid(),
  program_id uuid references public.program(id) on delete set null,
  puskesmas_id uuid references public.puskesmas(id) on delete cascade,
  perseptor_id uuid references public.perseptor(id) on delete set null,
  judul text not null,
  tanggal date not null,
  jam_mulai time not null default '08:30',
  jam_selesai time not null default '11:30',
  lokasi text,
  metode text not null,
  status text not null default 'DIJADWALKAN' check (status in ('DIRENCANAKAN','DIJADWALKAN','DIKONFIRMASI','BERLANGSUNG','SELESAI','DITUNDA','DIBATALKAN')),
  catatan text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.peserta (
  id uuid primary key default gen_random_uuid(),
  jadwal_id uuid not null references public.jadwal(id) on delete cascade,
  tenaga_id uuid not null references public.tenaga_kesehatan(id) on delete cascade,
  hadir text not null default 'MENUNGGU' check (hadir in ('HADIR','TIDAK_HADIR','MENUNGGU')),
  catatan text,
  created_at timestamptz not null default now(),
  unique (jadwal_id, tenaga_id)
);

-- Instrumen: PERSIAPAN/PENILAIAN (skor 1-5) dan OBSERVASI (skor null, catatan naratif)
create table if not exists public.penilaian (
  id uuid primary key default gen_random_uuid(),
  jadwal_id uuid not null references public.jadwal(id) on delete cascade,
  tenaga_id uuid references public.tenaga_kesehatan(id) on delete set null,
  kategori text not null default 'PENILAIAN' check (kategori in ('PERSIAPAN','PENILAIAN','OBSERVASI')),
  aspek text not null,
  skor int check (skor between 1 and 5),
  catatan text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.kasus (
  id uuid primary key default gen_random_uuid(),
  jadwal_id uuid not null references public.jadwal(id) on delete cascade,
  kode_anonim text not null,
  usia int, jenis_kelamin text check (jenis_kelamin in ('L','P')),
  diagnosis text not null,
  tindakan text, hasil text, pembahasan text,
  created_at timestamptz not null default now()
);

create table if not exists public.temuan (
  id uuid primary key default gen_random_uuid(),
  jadwal_id uuid not null references public.jadwal(id) on delete cascade,
  kategori text not null,
  uraian text not null,
  risiko text not null default 'SEDANG' check (risiko in ('RENDAH','SEDANG','TINGGI')),
  bukti text,
  rekomendasi text not null,
  penanggung_jawab text not null,
  batas_waktu date not null,
  status text not null default 'DITINDAKLANJUTI',
  created_at timestamptz not null default now()
);

create table if not exists public.rekomendasi (
  id uuid primary key default gen_random_uuid(),
  jadwal_id uuid not null references public.jadwal(id) on delete cascade,
  masalah text not null,
  akar_masalah text,
  isi text not null,
  penanggung_jawab text not null,
  target date not null,
  indikator text,
  status text not null default 'BERJALAN',
  created_at timestamptz not null default now()
);

create table if not exists public.rtl (
  id uuid primary key default gen_random_uuid(),
  temuan_id uuid references public.temuan(id) on delete cascade,
  rekomendasi_id uuid references public.rekomendasi(id) on delete set null,
  jadwal_id uuid references public.jadwal(id) on delete cascade,
  judul text not null,
  deskripsi text,
  penanggung_jawab text not null,
  batas_waktu date not null,
  status text not null default 'BELUM_DIMULAI' check (status in ('BELUM_DIMULAI','DALAM_PROSES','SELESAI','TERVERIFIKASI','TERLAMBAT')),
  bukti text, catatan text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_rtl_upd on public.rtl;
create trigger trg_rtl_upd before update on public.rtl for each row execute function public.touch_updated_at();

create table if not exists public.verifikasi_rtl (
  id uuid primary key default gen_random_uuid(),
  rtl_id uuid not null references public.rtl(id) on delete cascade,
  verifier text,
  keputusan text not null check (keputusan in ('DISETUJUI','REVISI')),
  catatan text,
  created_at timestamptz not null default now()
);

create table if not exists public.evaluasi (
  id uuid primary key default gen_random_uuid(),
  tenaga_id uuid not null references public.tenaga_kesehatan(id) on delete cascade,
  kompetensi_id uuid references public.kompetensi(id) on delete set null,
  jadwal_id uuid references public.jadwal(id) on delete set null,
  tahap text not null default 'EVALUASI' check (tahap in ('AWAL','EVALUASI')),
  skor int not null check (skor between 1 and 5),
  tanggal date not null default current_date,
  catatan text,
  created_at timestamptz not null default now()
);

create table if not exists public.dokumentasi (
  id uuid primary key default gen_random_uuid(),
  jadwal_id uuid not null references public.jadwal(id) on delete cascade,
  jenis text not null check (jenis in ('Foto kegiatan','Dokumen','Instrumen','Berita acara','Materi pembimbingan','Bukti RTL')),
  nama text not null,
  deskripsi text,
  file_url text not null,
  uploaded_by text,
  created_at timestamptz not null default now()
);

create table if not exists public.berita_acara (
  id uuid primary key default gen_random_uuid(),
  jadwal_id uuid not null references public.jadwal(id) on delete cascade,
  nomor text not null,
  isi text not null,
  status text not null default 'DRAFT' check (status in ('DRAFT','FINAL')),
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.notifikasi (
  id uuid primary key default gen_random_uuid(),
  user_email text not null default 'all',
  judul text not null,
  pesan text,
  tipe text not null default 'INFO' check (tipe in ('INFO','PERINGATAN')),
  link text,
  dibaca boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  user_nama text,
  aksi text not null,
  entitas text not null,
  entitas_id text,
  data_lama jsonb, data_baru jsonb,
  created_at timestamptz not null default now()
);

-- ============ INDEKS ============
create index if not exists idx_jadwal_tgl on public.jadwal(tanggal);
create index if not exists idx_jadwal_pkm on public.jadwal(puskesmas_id);
create index if not exists idx_nil_jadwal on public.penilaian(jadwal_id);
create index if not exists idx_rtl_batas on public.rtl(batas_waktu);
create index if not exists idx_tem_jadwal on public.temuan(jadwal_id);
create index if not exists idx_audit_created on public.audit_log(created_at desc);

-- ============ ROW LEVEL SECURITY ============
alter table public.users            enable row level security;
alter table public.puskesmas        enable row level security;
alter table public.perseptor        enable row level security;
alter table public.kompetensi       enable row level security;
alter table public.tenaga_kesehatan enable row level security;
alter table public.pemetaan         enable row level security;
alter table public.program          enable row level security;
alter table public.jadwal           enable row level security;
alter table public.peserta          enable row level security;
alter table public.penilaian        enable row level security;
alter table public.kasus            enable row level security;
alter table public.temuan           enable row level security;
alter table public.rekomendasi      enable row level security;
alter table public.rtl              enable row level security;
alter table public.verifikasi_rtl   enable row level security;
alter table public.evaluasi         enable row level security;
alter table public.dokumentasi      enable row level security;
alter table public.berita_acara     enable row level security;
alter table public.notifikasi       enable row level security;
alter table public.audit_log        enable row level security;

-- USERS: seluruh pengguna terautentikasi dapat melihat profil (diperlukan UI), ubah sendiri; superadmin kelola
drop policy if exists users_read on public.users;
create policy users_read on public.users for select to authenticated using (true);
drop policy if exists users_self_update on public.users;
create policy users_self_update on public.users for update to authenticated using (id = auth.uid() or public.is_dinkes());
drop policy if exists users_admin_write on public.users;
create policy users_admin_write on public.users for insert to authenticated with check (public.is_dinkes() or role = 'SUPERADMIN_DINKES');

-- MASTER DATA: semua terautentikasi membaca; dinkes menulis
drop policy if exists pkm_read on public.puskesmas;
create policy pkm_read on public.puskesmas for select to authenticated using (true);
drop policy if exists pkm_write on public.puskesmas;
create policy pkm_write on public.puskesmas for all to authenticated using (public.is_dinkes()) with check (public.is_dinkes());

drop policy if exists prs_read on public.perseptor;
create policy prs_read on public.perseptor for select to authenticated using (true);
drop policy if exists prs_write on public.perseptor;
create policy prs_write on public.perseptor for all to authenticated using (public.is_dinkes()) with check (public.is_dinkes());

drop policy if exists kom_read on public.kompetensi;
create policy kom_read on public.kompetensi for select to authenticated using (true);
drop policy if exists kom_write on public.kompetensi;
create policy kom_write on public.kompetensi for all to authenticated using (public.is_dinkes()) with check (public.is_dinkes());

drop policy if exists tk_read on public.tenaga_kesehatan;
create policy tk_read on public.tenaga_kesehatan for select to authenticated using (true);
drop policy if exists tk_write on public.tenaga_kesehatan;
create policy tk_write on public.tenaga_kesehatan for all to authenticated
  using (public.is_dinkes() or (role_() = 'ADMIN_PUSKESMAS' and puskesmas_id = public.my_puskesmas_id()))
  with check (public.is_dinkes() or (role_() = 'ADMIN_PUSKESMAS' and puskesmas_id = public.my_puskesmas_id()));

-- PEMETAAN / PROGRAM: semua baca; dinkes tulis
drop policy if exists pm_read on public.pemetaan;
create policy pm_read on public.pemetaan for select to authenticated using (true);
drop policy if exists pm_write on public.pemetaan;
create policy pm_write on public.pemetaan for all to authenticated using (public.is_dinkes()) with check (public.is_dinkes());

drop policy if exists pro_read on public.program;
create policy pro_read on public.program for select to authenticated using (true);
drop policy if exists pro_write on public.program;
create policy pro_write on public.program for all to authenticated using (public.is_dinkes()) with check (public.is_dinkes());

-- JADWAL: baca semua; tulis dinkes + perseptor miliknya (status)
drop policy if exists jd_read on public.jadwal;
create policy jd_read on public.jadwal for select to authenticated using (true);
drop policy if exists jd_write on public.jadwal;
create policy jd_write on public.jadwal for all to authenticated
  using (public.is_dinkes() or perseptor_id = public.my_perseptor_id() or role_() = 'ADMIN_PUSKESMAS')
  with check (public.is_dinkes() or perseptor_id = public.my_perseptor_id() or role_() = 'ADMIN_PUSKESMAS');

-- TABEL TRANSAKSI: baca semua terautentikasi; tulis dinkes/perseptor/admin pkm
drop policy if exists trx_read on public.peserta;
create policy trx_read on public.peserta for select to authenticated using (true);
drop policy if exists trx_write on public.peserta;
create policy trx_write on public.peserta for all to authenticated
  using (public.is_dinkes() or role_() in ('PERSEPTOR','ADMIN_PUSKESMAS'))
  with check (public.is_dinkes() or role_() in ('PERSEPTOR','ADMIN_PUSKESMAS'));

drop policy if exists nil_read on public.penilaian;
create policy nil_read on public.penilaian for select to authenticated using (true);
drop policy if exists nil_write on public.penilaian;
create policy nil_write on public.penilaian for all to authenticated
  using (public.is_dinkes() or role_() = 'PERSEPTOR') with check (public.is_dinkes() or role_() = 'PERSEPTOR');

drop policy if exists kas_read on public.kasus;
create policy kas_read on public.kasus for select to authenticated using (true);
drop policy if exists kas_write on public.kasus;
create policy kas_write on public.kasus for all to authenticated
  using (public.is_dinkes() or role_() = 'PERSEPTOR') with check (public.is_dinkes() or role_() = 'PERSEPTOR');

drop policy if exists tem_read on public.temuan;
create policy tem_read on public.temuan for select to authenticated using (true);
drop policy if exists tem_write on public.temuan;
create policy tem_write on public.temuan for all to authenticated
  using (public.is_dinkes() or role_() = 'PERSEPTOR') with check (public.is_dinkes() or role_() = 'PERSEPTOR');

drop policy if exists rek_read on public.rekomendasi;
create policy rek_read on public.rekomendasi for select to authenticated using (true);
drop policy if exists rek_write on public.rekomendasi;
create policy rek_write on public.rekomendasi for all to authenticated
  using (public.is_dinkes() or role_() = 'PERSEPTOR') with check (public.is_dinkes() or role_() = 'PERSEPTOR');

drop policy if exists rtl_read on public.rtl;
create policy rtl_read on public.rtl for select to authenticated using (true);
drop policy if exists rtl_write on public.rtl;
create policy rtl_write on public.rtl for all to authenticated
  using (public.is_dinkes() or role_() in ('PERSEPTOR','ADMIN_PUSKESMAS','PESERTA'))
  with check (public.is_dinkes() or role_() in ('PERSEPTOR','ADMIN_PUSKESMAS','PESERTA'));

drop policy if exists ver_read on public.verifikasi_rtl;
create policy ver_read on public.verifikasi_rtl for select to authenticated using (true);
drop policy if exists ver_write on public.verifikasi_rtl;
create policy ver_write on public.verifikasi_rtl for all to authenticated
  using (public.is_dinkes() or role_() = 'PERSEPTOR') with check (public.is_dinkes() or role_() = 'PERSEPTOR');

drop policy if exists ev_read on public.evaluasi;
create policy ev_read on public.evaluasi for select to authenticated using (true);
drop policy if exists ev_write on public.evaluasi;
create policy ev_write on public.evaluasi for all to authenticated
  using (public.is_dinkes() or role_() = 'PERSEPTOR') with check (public.is_dinkes() or role_() = 'PERSEPTOR');

drop policy if exists dok_read on public.dokumentasi;
create policy dok_read on public.dokumentasi for select to authenticated using (true);
drop policy if exists dok_write on public.dokumentasi;
create policy dok_write on public.dokumentasi for all to authenticated
  using (public.is_dinkes() or role_() in ('PERSEPTOR','ADMIN_PUSKESMAS'))
  with check (public.is_dinkes() or role_() in ('PERSEPTOR','ADMIN_PUSKESMAS'));

drop policy if exists ba_read on public.berita_acara;
create policy ba_read on public.berita_acara for select to authenticated using (true);
drop policy if exists ba_write on public.berita_acara;
create policy ba_write on public.berita_acara for all to authenticated
  using (public.is_dinkes() or role_() = 'PERSEPTOR') with check (public.is_dinkes() or role_() = 'PERSEPTOR');

drop policy if exists nt_read on public.notifikasi;
create policy nt_read on public.notifikasi for select to authenticated using (true);
drop policy if exists nt_write on public.notifikasi;
create policy nt_write on public.notifikasi for all to authenticated using (true) with check (true);

drop policy if exists al_read on public.audit_log;
create policy al_read on public.audit_log for select to authenticated using (public.is_dinkes());
drop policy if exists al_write on public.audit_log;
create policy al_write on public.audit_log for insert to authenticated with check (true);

-- ============ STORAGE: bucket dokumentasi ============
insert into storage.buckets (id, name, public) values ('dokumentasi', 'dokumentasi', true)
on conflict (id) do update set public = true;

drop policy if exists dok_storage_read on storage.objects;
create policy dok_storage_read on storage.objects for select using (bucket_id = 'dokumentasi');
drop policy if exists dok_storage_write on storage.objects;
create policy dok_storage_write on storage.objects for insert to authenticated with check (bucket_id = 'dokumentasi');
drop policy if exists dok_storage_update on storage.objects;
create policy dok_storage_update on storage.objects for update to authenticated using (bucket_id = 'dokumentasi');
drop policy if exists dok_storage_delete on storage.objects;
create policy dok_storage_delete on storage.objects for delete to authenticated using (bucket_id = 'dokumentasi');

-- ============ SEED MASTER DATA ============
insert into public.kompetensi (nama, kategori, deskripsi) values
  ('Penanganan Gawat Darurat Dasar (PPGD)','Gawat Darurat','Kemampuan penanganan kegawatdaruratan awal di fasilitas primer'),
  ('Asuhan Kehamilan & Persalinan Normal (APN)','Maternal & Neonatal','Asuhan prenatal, intranatal, postnatal sesuai standar'),
  ('Manajemen Pelayanan Neonatal Esensial','Maternal & Neonatal','Perawatan bayi baru lahir termasuk resusitasi neonatus'),
  ('Tata Laksana Diabetes Melitus','Kompetensi Klinis','Screening, terapi, edukasi, dan rujukan DM tipe 2'),
  ('Manajemen Hipertensi','Kompetensi Klinis','Deteksi dini dan tata laksana hipertensi berjenjang'),
  ('Konseling Gizi Balita & Ibu','Gizi','Penilaian status gizi dan konseling 1000 HPK'),
  ('Keselamatan Pasien (Patient Safety)','Keselamatan Pasien','Identifikasi pasien, komunikasi SBAR, pelaporan insiden'),
  ('Pencegahan & Pengendalian Infeksi','Pencegahan & Pengendalian Infeksi','Hand hygiene, dekontaminasi, pengelolaan limfah'),
  ('Keterampilan Pemasangan IV & Infus','Keperawatan','Teknis aseptik pemasangan dan perawatan infus'),
  ('Manajemen Logistik Obat & HMIS','Farmasi','Perencanaan, pencatatan, dan pemantauan stok obat'),
  ('Konseling Obat Rasional','Farmasi','Penggunaan obat rasional dan edukasi kepatuhan'),
  ('Spesimen & Pemeriksaan Lab Dasar','Laboratorium','Pengambilan, penanganan, dan tata baca spesimen'),
  ('Deteksi Dini Stunting & PMT','Gizi','Skrining stunting dan pengelolaan pemberian makanan tambahan'),
  ('Supervisi Klinis & Pembimbingan','Manajerial','Teknik supervisi klinis, umpan balik konstruktif, dokumentasi')
on conflict do nothing;

-- Contoh Puskesmas (silakan sesuaikan/hapus)
insert into public.puskesmas (kode, nama, kecamatan, alamat, kepala, kontak, email) values
  ('PKM-01','Puskesmas Sukamaju','Sukamaju','Jl. Raya Sukamaju No. 12','dr. Siti Nurhaliza, M.Kes','0812-3456-7801','pkm.sukamaju@puskesmas.go.id'),
  ('PKM-02','Puskesmas Cempaka','Cempaka','Jl. Cempaka Raya No. 45','dr. Bambang Sutrisno','0812-3456-7802','pkm.cempaka@puskesmas.go.id'),
  ('PKM-03','Puskesmas Melati','Melati','Jl. Melati Indah No. 8','dr. Lestari Handayani','0812-3456-7803','pkm.melati@puskesmas.go.id'),
  ('PKM-04','Puskesmas Anggrek','Anggrek','Jl. Anggrek No. 90','dr. Prasetyo Adi','0812-3456-7804','pkm.anggrek@puskesmas.go.id'),
  ('PKM-05','Puskesmas Kenanga','Kenanga','Jl. Kenanga No. 3','dr. Maya Puspita','0812-3456-7805','pkm.kenanga@puskesmas.go.id'),
  ('PKM-06','Puskesmas Bougenville','Bougenville','Jl. Bougenville No. 27','dr. Hendra Gunawan','0812-3456-7806','pkm.bougenville@puskesmas.go.id'),
  ('PKM-07','Puskesmas Teratai','Teratai','Jl. Teratai No. 15','dr. Dewi Anggraini','0812-3456-7807','pkm.teratai@puskesmas.go.id'),
  ('PKM-08','Puskesmas Mawar','Mawar','Jl. Mawar No. 33','dr. Fajar Ramadhan','0812-3456-7808','pkm.mawar@puskesmas.go.id')
on conflict (kode) do nothing;

-- ============================================================================
-- LANGKAH SELANJUTNYA (dilakukan manual di Supabase Dashboard):
-- 1) Authentication → Users → Add user: buat akun (contoh:
--    superadmin@dinkes.go.id dengan sandi kuat), email sudah terverifikasi.
-- 2) Jalankan INSERT profil di bawah ini dengan UUID dari langkah 1
--    (atau ganti sub-select berdasarkan email).
-- 3) Tambahkan baris users untuk setiap akun yang dibuat.
-- ============================================================================

-- Contoh (jalankan SETELAH membuat user auth dengan email tersebut):
-- insert into public.users (id, email, nama, role)
-- select id, email, 'Dra. Kartika Dewi, M.Si', 'SUPERADMIN_DINKES' from auth.users where email = 'superadmin@dinkes.go.id'
-- on conflict (id) do nothing;
--
-- insert into public.users (id, email, nama, role)
-- select id, email, 'Rian Hidayat, S.KM', 'ADMIN_DINKES' from auth.users where email = 'admin@dinkes.go.id'
-- on conflict (id) do nothing;
--
-- Admin Puskesmas (ganti UUID puskesmas sesuai data Anda):
-- insert into public.users (id, email, nama, role, puskesmas_id)
-- select u.id, u.email, 'Agus Wibowo, S.AP', 'ADMIN_PUSKESMAS', p.id
-- from auth.users u, public.puskesmas p where u.email = 'admin.sukamaju@puskesmas.go.id' and p.kode = 'PKM-01'
-- on conflict (id) do nothing;
