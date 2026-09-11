/**
 * SEED DATA PERSEPTOR
 * Data awal realistis untuk Kabupaten (fiksi) Sukamaju tahun 2026.
 */
import { PrismaClient } from '@prisma/client'
import { randomBytes, scryptSync } from 'crypto'

const db = new PrismaClient({ log: [] })

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

function date(y: number, m: number, d: number, h = 8): Date {
  return new Date(y, m - 1, d, h, 0, 0)
}

const TAHUN = 2026

async function main() {
  console.log('Mulai seeding...')
  await db.auditLog.deleteMany()
  await db.notification.deleteMany()
  await db.beritaAcara.deleteMany()
  await db.dokumentasi.deleteMany()
  await db.verifikasiRTL.deleteMany()
  await db.rTL.deleteMany()
  await db.rekomendasi.deleteMany()
  await db.temuan.deleteMany()
  await db.kasus.deleteMany()
  await db.penilaian.deleteMany()
  await db.evaluasiKompetensi.deleteMany()
  await db.peserta.deleteMany()
  await db.jadwal.deleteMany()
  await db.program.deleteMany()
  await db.pemetaan.deleteMany()
  await db.instrumenTemplate.deleteMany()
  await db.penugasanPerseptor.deleteMany()
  await db.session.deleteMany()
  await db.user.deleteMany()
  await db.tenagaKesehatan.deleteMany()
  await db.perseptor.deleteMany()
  await db.kompetensi.deleteMany()
  await db.puskesmas.deleteMany()
  await db.role.deleteMany()
  await db.pengaturan.deleteMany()

  // ===== ROLES =====
  const rolesData = [
    { kode: 'SUPERADMIN', nama: 'Superadmin Dinas Kesehatan', deskripsi: 'Akses penuh seluruh modul dan konfigurasi sistem' },
    { kode: 'ADMIN_DINAS', nama: 'Admin Dinas Kesehatan', deskripsi: 'Mengelola program, jadwal, monitoring, verifikasi, laporan' },
    { kode: 'PERSEPTOR', nama: 'Perseptor / Pembimbing', deskripsi: 'Melaksanakan pembimbingan, instrumen, temuan, rekomendasi, verifikasi' },
    { kode: 'ADMIN_PUSKESMAS', nama: 'Admin Puskesmas', deskripsi: 'Menyiapkan data, peserta, dokumen, dan tindak lanjut Puskesmas' },
    { kode: 'PESERTA', nama: 'Peserta / Tenaga Kesehatan', deskripsi: 'Melihat jadwal, hasil, umpan balik, dan tindak lanjut' },
  ]
  for (const r of rolesData) await db.role.create({ data: r })

  // ===== PENGATURAN =====
  await db.pengaturan.createMany({
    data: [
      { kunci: 'nama_dinas', nilai: 'Dinas Kesehatan Kabupaten Sukamaju' },
      { kunci: 'nama_aplikasi', nilai: 'PERSEPTOR' },
      { kunci: 'tagline', nilai: 'Mendampingi, Membina, Meningkatkan Mutu Pelayanan.' },
      { kunci: 'tahun_aktif', nilai: String(TAHUN) },
    ],
  })

  // ===== PUSKESMAS =====
  const pkmData = [
    { kode: 'PKM-001', nama: 'Puskesmas Sukamaju', kecamatan: 'Sukamaju', alamat: 'Jl. Raya Sukamaju No. 12', kepala: 'dr. Endang Kusumawati', telp: '0812-3456-7001', email: 'pkm.sukamaju@sukamajukab.go.id' },
    { kode: 'PKM-002', nama: 'Puskesmas Cempaka', kecamatan: 'Cempaka', alamat: 'Jl. Cempaka Raya No. 45', kepala: 'dr. Andi Wirawan', telp: '0812-3456-7002', email: 'pkm.cempaka@sukamajukab.go.id' },
    { kode: 'PKM-003', nama: 'Puskesmas Melati', kecamatan: 'Melati', alamat: 'Jl. Melati Indah No. 8', kepala: 'dr. Fitri Handayani', telp: '0812-3456-7003', email: 'pkm.melati@sukamajukab.go.id' },
    { kode: 'PKM-004', nama: 'Puskesmas Anggrek', kecamatan: 'Anggrek', alamat: 'Jl. Anggrek No. 21', kepala: 'dr. Bambang Sutrisno', telp: '0812-3456-7004', email: 'pkm.anggrek@sukamajukab.go.id' },
    { kode: 'PKM-005', nama: 'Puskesmas Kenanga', kecamatan: 'Kenanga', alamat: 'Jl. Kenanga No. 3', kepala: 'dr. Lina Marlina', telp: '0812-3456-7005', email: 'pkm.kenanga@sukamajukab.go.id' },
    { kode: 'PKM-006', nama: 'Puskesmas Bougenvil', kecamatan: 'Bougenvil', alamat: 'Jl. Bougenvil No. 17', kepala: 'dr. Rudi Hartono', telp: '0812-3456-7006', email: 'pkm.bougenvil@sukamajukab.go.id' },
    { kode: 'PKMP-007', nama: 'Puskesmas Sukamaju Rawat Inap', kecamatan: 'Sukamaju', alamat: 'Jl. Stasiun No. 2', kepala: 'dr. Maya Anggraini', telp: '0812-3456-7007', email: 'pkmp.sukamaju@sukamajukab.go.id' },
    { kode: 'PKM-008', nama: 'Puskesmas Teratai', kecamatan: 'Teratai', alamat: 'Jl. Teratai No. 9', kepala: 'dr. Hasan Basri', telp: '0812-3456-7008', email: 'pkm.teratai@sukamajukab.go.id' },
  ]
  const pkm: any[] = []
  for (const p of pkmData) {
    pkm.push(await db.puskesmas.create({ data: { kode: p.kode, nama: p.nama, kecamatan: p.kecamatan, alamat: p.alamat, kepalaPuskesmas: p.kepala, telepon: p.telp, email: p.email, status: 'AKTIF' } }))
  }

  // ===== KOMPETENSI =====
  const kompetensiData: Array<[string, string, string]> = [
    ['Klinis', 'Tatalaksana Hipertensi', 'Deteksi dan manajemen hipertensi sesuai alur Prolanis'],
    ['Klinis', 'Tatalaksana Diabetes Melitus', 'Asuhan DM tipe 2 terintegrasi Prolanis'],
    ['Manajerial', 'Manajemen Puskesmas', 'Perencanaan, pengorganisasian, dan evaluasi pelayanan'],
    ['Keselamatan Pasien', 'Pelaporan Insiden Keselamatan Pasien', 'Budaya melapor dan analisis insiden (IKP)'],
    ['Keselamatan Pasien', 'Identifikasi Pasien & Verifikasi', 'Two patient identifiers pada setiap tindakan'],
    ['Pencegahan dan Pengendalian Infeksi', 'Hand Hygiene', 'Lima momen cuci tangan sesuai WHO'],
    ['Pencegahan dan Pengendalian Infeksi', 'Pengelolaan Limbah B3', 'Pemilahan, penyimpanan, dan pengangkutan limbah infeksius'],
    ['Kegawatdaruratan', 'Bantuan Hidup Dasar (BHD)', 'Resusitasi dasar dewasa dan anak'],
    ['Kegawatdaruratan', 'Tatalaksana Syok Hipovolemik', 'Resusitasi cairan dan identifikasi penyebab'],
    ['Pelayanan Maternal dan Neonatal', 'Asuhan Persalinan Normal (APN)', 'Pelayanan persalinan normal berbasis PWS-KIA'],
    ['Pelayanan Maternal dan Neonatal', 'Resusitasi Bayi Baru Lahir', 'Manajemen perinatal asfiksia'],
    ['Pelayanan Anak', 'Tatalaksana Pneumonia Balita', 'Klasifikasi dan terapi pneumonia sesuai IMCI'],
    ['Gizi', 'Asuhan Gizi Balita Kurang', 'Penilaian status gizi dan konseling'],
    ['Kefarmasian', 'Pelayanan Farmasi Klinis', 'Konseling obat dan pengawasan penggunaan obat rasional'],
    ['Laboratorium', 'Pemeriksaan Hematologi Dasar', 'Praprasarana dan kontrol mutu pemeriksaan'],
    ['Keperawatan', 'Asuhan Keperawatan Gerontik', 'Penilaian fungsi lanjut usia dan pencegahan jatuh'],
    ['Keperawatan', 'Pemasangan Infus Aman', 'Prosedur aseptik pemasangan dan perawatan IV line'],
    ['Kebidanan', 'Deteksi Dini Komplikasi Kehamilan', 'Pemeriksaan ANC terpadu dan faktor risiko'],
    ['Kebidanan', 'Inisiasi Menyusu Dini & ASI Eksklusif', 'Dukungan laktasi di fasilitas kesehatan'],
    ['Tenaga Kesehatan Lainnya', 'Sanitasi Sarana Prasarana', 'Inspeksi sanitasi pelayanan kesehatan'],
  ]
  const komp: any[] = []
  for (const [kelompok, nama, deskripsi] of kompetensiData) {
    komp.push(await db.kompetensi.create({ data: { kelompok, nama, deskripsi } }))
  }

  // ===== PERSEPTOR =====
  const perData = [
    { nama: 'dr. Ratna Widyaningrum, Sp.EM', nip: '19790512 200312 2 001', profesi: 'Dokter', jabatan: 'Kepala Seksi Pelayanan Kesehatan', unit: 'Dinkes Kab. Sukamaju', keahlian: 'Kegawatdaruratan, Resusitasi', str: 'STR-DOK-7712901', sip: 'SIP-4421/2019', sertifikat: 'ATLS 2024, BHD Instruktur 2025', kompIdx: [7, 8, 10] },
    { nama: 'dr. Hadi Prasetyo, M.Kes', nip: '19810322 200604 1 002', profesi: 'Dokter', jabatan: 'Konselor Klinik', unit: 'Dinkes Kab. Sukamaju', keahlian: 'Klinis, PPI', str: 'STR-DOK-6622871', sip: 'SIP-4488/2020', sertifikat: 'Pelatihan IPC 2024', kompIdx: [0, 1, 5, 6] },
    { nama: 'Ns. Budi Santoso, S.Kep', nip: '19850708 201001 1 003', profesi: 'Perawat', jabatan: 'Supervisor Keperawatan', unit: 'RSUD Sukamaju', keahlian: 'Keperawatan, Keselamatan Pasien', str: 'STR-KEP-9912113', sip: '', sertifikat: 'PPNI Kompetensi Dasar 2023', kompIdx: [3, 4, 15, 16] },
    { nama: 'Bidan Sari Mulyani, A.Md.Keb', nip: '19880917 201202 2 004', profesi: 'Bidan', jabatan: 'Koordinator KIA-KB', unit: 'Puskesmas Sukamaju', keahlian: 'Kebidanan, Maternal Neonatal', str: 'STR-BID-8812399', sip: 'SIPB-3312/2021', sertifikat: 'APN & Ponen 2024, LDR 2023', kompIdx: [9, 17, 18] },
    { nama: 'Apt. Dewi Lestari, S.Farm', nip: '19910205 201403 2 005', profesi: 'Apoteker', jabatan: 'Penelaah Keaktifan Obat', unit: 'Dinkes Kab. Sukamaju', keahlian: 'Kefarmasian', str: '', sip: 'SIA-7712/2022', sertifikat: 'PTO 2024', kompIdx: [13] },
  ]
  const per: any[] = []
  for (const p of perData) {
    per.push(await db.perseptor.create({
      data: {
        nama: p.nama, nip: p.nip, profesi: p.profesi, jabatan: p.jabatan, unitKerja: p.unit,
        kompetensi: p.kompIdx.map((i) => komp[i].nama).join(', '),
        nomorSTR: p.str || null, nomorSIP: p.sip || null, sertifikat: p.sertifikat,
        areaKeahlian: p.keahlian, statusAktif: true,
      },
    }))
  }

  const penugasanData: Array<[number, number[]]> = [
    [0, [0, 1, 6]],
    [1, [0, 2, 3, 7]],
    [2, [1, 4, 5]],
    [3, [0, 2, 4]],
    [4, [0, 1, 2, 3, 4, 5, 6, 7]],
  ]
  for (const [pi, list] of penugasanData) {
    for (const px of list) {
      await db.penugasanPerseptor.create({ data: { perseptorId: per[pi].id, puskesmasId: pkm[px].id } })
    }
  }

  // ===== TENAGA KESEHATAN =====
  const tkData: Array<[string, string, string, string, number, number]> = [
    ['Ns. Budianto, S.Kep', 'Perawat', 'Koordinator Poli Umum', 'Poli Umum', 0, 8],
    ['Ns. Rina Wulandari, A.Md.Kep', 'Perawat', 'Perawat IGD', 'IGD', 0, 5],
    ['Bidan Nurhayati, A.Md.Keb', 'Bidan', 'Bidan Koordinator', 'Polindes', 0, 12],
    ['Bidan Ayu Pratiwi, A.Md.Keb', 'Bidan', 'Bidan Desa', 'Desa Kelapa', 0, 3],
    ['Ns. Joko Susilo, S.Kep', 'Perawat', 'Kepala Ruang Rawat Inap', 'Rawat Inap', 1, 10],
    ['Bidan Martina Sari', 'Bidan', 'Bidan Poli KIA', 'Poli KIA', 1, 6],
    ['dr. Slamet Riyadi', 'Dokter', 'Dokter Umum', 'Poli Umum', 1, 4],
    ['Nutr. Siti Aminah, A.MD.Gz', 'Nutrisionis', 'Nutrisionis', 'Poli Gizi', 1, 7],
    ['Ns. Agus Setiawan, A.Md.Kep', 'Perawat', 'Perawat Poli', 'Poli Umum', 2, 2],
    ['Bidan Yuliana, S.Tr.Keb', 'Bidan', 'Bidan Desa', 'Desa Mekar', 2, 9],
    ['Apt. Rian Hidayat, S.Farm', 'Apoteker', 'Apoteker', 'Farmasi', 2, 5],
    ['Ns. Dwi Astuti, S.Kep', 'Perawat', 'Perawat IGD', 'IGD', 3, 11],
    ['Bidan Ratih Kumala', 'Bidan', 'Bidan Poli KIA', 'Poli KIA', 3, 4],
    ['Ns. Eko Prasetyo, A.Md.Kep', 'Perawat', 'Perawat Ruang', 'Rawat Inap', 4, 6],
    ['Bidan Wulan Sari, A.Md.Keb', 'Bidan', 'Bidan Koordinator', 'Polindes', 4, 14],
    ['Analis Rizky Ramadhan, A.Md.AK', 'Analis', 'Analis Kesehatan', 'Laboratorium', 5, 3],
    ['Ns. Tuti Alawiyah, S.Kep', 'Perawat', 'Perawat Poli Gigi', 'Poli Gigi', 5, 8],
    ['Sanitarian Fahmi Ardiansyah, A.Md', 'Sanitarian', 'Sanitarian', 'Kesling', 6, 9],
  ]
  const tk: any[] = []
  for (const [nama, profesi, jabatan, unit, pIdx, masa] of tkData) {
    tk.push(await db.tenagaKesehatan.create({
      data: {
        nama, profesi, jabatan, unitKerja: unit, puskesmasId: pkm[pIdx].id,
        nipNik: 'NIK-' + (32010000000000 + tkData.indexOf([nama, profesi, jabatan, unit, pIdx, masa]) * 7777 + masa).toString(),
        kompetensi: 'Per profesi', masaKerja: masa, status: 'AKTIF',
      },
    }))
  }

  // ===== USERS =====
  const mkUser = (email: string, nama: string, role: string, pass: string, extra: any = {}) =>
    db.user.create({ data: { email, nama, role, passwordHash: hashPassword(pass), ...extra } })

  await mkUser('superadmin@dinkes.go.id', 'Superadmin Dinkes', 'SUPERADMIN', 'dinkes123')
  await mkUser('admin@dinkes.go.id', 'Dra. Kartika Dewi, M.Si', 'ADMIN_DINAS', 'dinkes123')
  for (const p of per) {
    const slug = p.nama.split(',')[0].toLowerCase().replace(/^(dr\.|ns\.|apt\.|bidan)\s*/, '').replace(/\s+/g, '.')
    await mkUser(`${slug}@dinkes.go.id`, p.nama, 'PERSEPTOR', 'perseptor123', { perseptorId: p.id })
  }
  await mkUser('admin.sukamaju@puskesmas.go.id', 'Rr. Sari Wahyuni, S.Adm', 'ADMIN_PUSKESMAS', 'puskes123', { puskesmasId: pkm[0].id })
  await mkUser('admin.cempaka@puskesmas.go.id', 'Ahmad Fauzi, S.Kom', 'ADMIN_PUSKESMAS', 'puskes123', { puskesmasId: pkm[1].id })
  await mkUser('admin.melati@puskesmas.go.id', 'Sri Wahyuni, S.Sos', 'ADMIN_PUSKESMAS', 'puskes123', { puskesmasId: pkm[2].id })
  await mkUser('budianto@puskesmas.go.id', tk[0].nama, 'PESERTA', 'peserta123', { puskesmasId: pkm[0].id, tenagaKesehatanId: tk[0].id })
  await mkUser('nurhayati@puskesmas.go.id', tk[2].nama, 'PESERTA', 'peserta123', { puskesmasId: pkm[0].id, tenagaKesehatanId: tk[2].id })

  // ===== PEMETAAN =====
  const pemetaanData: Array<[number, number, string, string, number, number]> = [
    [1, 8, 'Kasus syok hipovolemik tertangani terlambat di IGD', 'Pembimbingan resusitasi cairan & triase', 8, 3],
    [1, 5, 'Kepatuhan hand hygiene rendah (audit 42%)', 'Pembimbingan 5 momen cuci tangan', 7, 3],
    [3, 11, 'Angka pneumonia balita tinggi (12 kasus/3 bulan)', 'Pembimbingan IMCI pneumonia', 7, 3],
    [2, 13, 'Konseling obat belum dilakukan rutin', 'Pendampingan farmasi klinis', 5, 1],
    [0, 9, 'PWS-KIA: 2 kasus perineum rupture terlambat dikendalikan', 'Pembimbingan APN & deteksi komplikasi', 8, 3],
    [4, 6, 'Pemilahan limbah B3 belum sesuai standar', 'Pembinaan pengelolaan limbah', 6, 2],
    [5, 15, 'Dokumentasi asuhan keperawatan belum lengkap', 'Pembimbingan dokumentasi keperawatan', 5, 1],
    [2, 3, 'Insiden hampir jatuh belum dilaporkan di ikp-online', 'Pembimbingan budaya pelaporan IKP', 6, 2],
    [0, 12, 'Pelayanan gizi balita: standarisasi konseling belum jalan', 'Pendampingan asuhan gizi', 4, 1],
    [7, 14, 'Analis belum pernah uji kompetensi internal', 'Simulasi kontrol mutu laboratorium', 4, 0],
  ]
  for (const [px, ki, masalah, kebutuhan, skor, prIdx] of pemetaanData) {
    const prioritas = ['RENDAH', 'SEDANG', 'TINGGI', 'SANGAT_TINGGI'][prIdx]
    await db.pemetaan.create({
      data: {
        puskesmasId: pkm[px].id, tahun: TAHUN, kompetensiId: komp[ki].id, kompetensiTeks: komp[ki].nama,
        masalah, kasusSering: 'Lihat deskripsi masalah', risiko: prIdx >= 2 ? 'Risiko keselamatan pasien' : 'Risiko mutu pelayanan',
        kebutuhan, skor, prioritas, status: prIdx >= 2 ? 'MASUK_PERENCANAAN' : 'DIPROSES', createdBy: 'Admin Dinas',
      },
    })
  }

  // ===== PROGRAM =====
  const prog: any[] = []
  prog.push(await db.program.create({ data: { nama: 'Program Pembimbingan Klinik Tahunan ' + TAHUN, tahun: TAHUN, periode: 'TAHUNAN', jenis: 'REGULER', bidang: 'Multidisiplin', topik: 'Peningkatan kompetensi klinik & keselamatan pasien seluruh Puskesmas', tujuan: 'Meningkatkan kualitas pelayanan klinik Puskesmas di Kabupaten Sukamaju', sasaran: 'Seluruh tenaga kesehatan 8 Puskesmas', prioritas: 'TINGGI', target: '≥ 85% tenaga kesehatan terbimbing minimal 1x', status: 'AKTIF', perseptorId: per[0].id } }))
  prog.push(await db.program.create({ data: { nama: 'Pembimbingan Semester 1 ' + TAHUN + ' — Keselamatan Pasien', tahun: TAHUN, periode: 'SEMESTER', jenis: 'REGULER', bidang: 'Keselamatan Pasien & PPI', topik: 'IKP, identifikasi pasien, hand hygiene', tujuan: 'Meningkatkan kepatuhan KSP dan PPI', sasaran: 'Perawat & dokter 4 Puskesmas prioritas', prioritas: 'SANGAT_TINGGI', target: 'Audit hand hygiene > 70%', status: 'AKTIF', perseptorId: per[2].id } }))
  prog.push(await db.program.create({ data: { nama: 'Pembimbingan Khusus Kegawatdaruratan IGD', tahun: TAHUN, periode: 'KHUSUS', jenis: 'KHUSUS', bidang: 'Kegawatdaruratan', topik: 'BHD, triase, tatalaksana syok', tujuan: 'Meningkatkan kemampuan penanganan gawat darurat', sasaran: 'Tim IGD Puskesmas Cempaka & Melati', prioritas: 'SANGAT_TINGGI', target: '100% tim IGD lolos simulasi BHD', status: 'AKTIF', perseptorId: per[0].id, puskesmasId: pkm[1].id } }))
  prog.push(await db.program.create({ data: { nama: 'Pembimbingan Berbasis Kasus: Preeklampsia', tahun: TAHUN, periode: 'KASUS', jenis: 'KASUS', bidang: 'Maternal Neonatal', topik: 'Deteksi dini & rujukan preeklampsia', tujuan: 'Menurunkan keterlambatan penanganan preeklampsia', sasaran: 'Bidan Puskesmas Sukamaju, Melati, Kenanga', prioritas: 'TINGGI', target: 'Nol keterlambatan rujukan', status: 'AKTIF', perseptorId: per[3].id } }))
  prog.push(await db.program.create({ data: { nama: 'Pendampingan Kefarmasian Berbasis Kebutuhan', tahun: TAHUN, periode: 'BULANAN', jenis: 'KEBUTUHAN', bidang: 'Kefarmasian', topik: 'Pelayanan farmasi klinis & obat rasional', tujuan: 'Standarisasi konseling obat', sasaran: 'Apoteker/pendamping obat seluruh Puskesmas', prioritas: 'SEDANG', target: '80% resep terskrining', status: 'AKTIF', perseptorId: per[4].id } }))

  // ===== JADWAL =====
  const jadwalSeed: any[] = [
    { px: 1, pi: 1, bln: 2, tgl: 11, status: 'SELESAI', topik: 'Hand Hygiene & Pengendalian Infeksi', prog: 1, metode: 'Observasi langsung, Demonstrasi', peserta: [4, 5, 6] },
    { px: 0, pi: 0, bln: 2, tgl: 25, status: 'SELESAI', topik: 'Bantuan Hidup Dasar Tim IGD', prog: 2, metode: 'Simulasi, Redemonstrasi', peserta: [1, 0] },
    { px: 0, pi: 3, bln: 3, tgl: 12, status: 'SELESAI', topik: 'Asuhan Persalinan Normal & Deteksi Komplikasi', prog: 3, metode: 'Diskusi kasus, Review dokumentasi', peserta: [2, 3] },
    { px: 2, pi: 4, bln: 3, tgl: 26, status: 'SELESAI', topik: 'Pelayanan Farmasi Klinis', prog: 4, metode: 'Observasi langsung, Coaching', peserta: [10] },
    { px: 1, pi: 0, bln: 4, tgl: 9, status: 'SELESAI', topik: 'Tatalaksana Syok Hipovolemik di IGD', prog: 2, metode: 'Simulasi, Bedside teaching', peserta: [4, 6] },
    { px: 3, pi: 1, bln: 4, tgl: 23, status: 'SELESAI', topik: 'Identifikasi Pasien & Pelaporan IKP', prog: 1, metode: 'Observasi langsung, Telaah SOP', peserta: [11, 12] },
    { px: 2, pi: 3, bln: 5, tgl: 14, status: 'SELESAI', topik: 'Deteksi Dini Komplikasi Kehamilan', prog: 3, metode: 'Diskusi kasus, Audit klinis', peserta: [9] },
    { px: 4, pi: 2, bln: 5, tgl: 28, status: 'SELESAI', topik: 'Pengelolaan Limbah B3 & Hand Hygiene', prog: 1, metode: 'Observasi langsung, Telaah SOP', peserta: [13, 14] },
    { px: 0, pi: 1, bln: 6, tgl: 11, status: 'SELESAI', topik: 'Tatalaksana Hipertensi Terintegrasi', prog: 0, metode: 'Diskusi kasus, Audit klinis', peserta: [0, 1] },
    { px: 1, pi: 0, bln: 6, tgl: 25, status: 'SELESAI', topik: 'Resusitasi Bayi Baru Lahir', prog: 3, metode: 'Simulasi, Redemonstrasi', peserta: [5] },
    { px: 5, pi: 2, bln: 7, tgl: 9, status: 'SELESAI', topik: 'Dokumentasi Asuhan Keperawatan', prog: 0, metode: 'Review dokumentasi, Mentoring', peserta: [15, 16] },
    { px: 0, pi: 4, bln: 7, tgl: 23, status: 'SELESAI', topik: 'Konseling Obat Rasional', prog: 4, metode: 'Observasi langsung, Coaching', peserta: [0] },
    { px: 1, pi: 1, bln: 8, tgl: 13, status: 'SELESAI', topik: 'Audit Klinis Diabetes Melitus', prog: 0, metode: 'Audit klinis, Diskusi kasus', peserta: [6, 7] },
    { px: 3, pi: 0, bln: 8, tgl: 27, status: 'DIBATALKAN', topik: 'Simulasi Kegawatdaruratan Terintegrasi', prog: 2, metode: 'Simulasi', peserta: [11, 12], ket: 'Bentrok dengan kegiatan posyandu paripurna di Puskesmas' },
    { px: 0, pi: 3, bln: 9, tgl: 2, status: 'SELESAI', topik: 'Inisiasi Menyusu Dini & ASI Eksklusif', prog: 3, metode: 'Demonstrasi, Diskusi kasus', peserta: [2, 3] },
    { px: 2, pi: 1, bln: 9, tgl: 11, status: 'BERLANGSUNG', topik: 'Manajemen Prolanis DM/Hipertensi', prog: 0, metode: 'Diskusi kasus, Review dokumentasi', peserta: [8, 10] },
    { px: 4, pi: 3, bln: 9, tgl: 17, status: 'DIKONFIRMASI', topik: 'Konseling Pemberian MP-ASI', prog: 3, metode: 'Demonstrasi, Coaching', peserta: [14] },
    { px: 1, pi: 2, bln: 9, tgl: 24, status: 'DIJADWALKAN', topik: 'Keselamatan Pasien: Verifikasi Identifikasi', prog: 1, metode: 'Observasi langsung, Telaah SOP', peserta: [4, 5] },
    { px: 0, pi: 1, bln: 9, tgl: 30, status: 'DIJADWALKAN', topik: 'Telaah SOP Pelayanan Poli Umum', prog: 0, metode: 'Telaah SOP, Diskusi kasus', peserta: [0, 1, 2] },
    { px: 5, pi: 4, bln: 10, tgl: 8, status: 'DIRENCANAKAN', topik: 'Inspeksi Sanitasi & Limbah', prog: 4, metode: 'Observasi langsung', peserta: [16] },
    { px: 7, pi: 2, bln: 10, tgl: 15, status: 'DIRENCANAKAN', topik: 'Kontrol Mutu Laboratorium Dasar', prog: 0, metode: 'Observasi langsung, Simulasi', peserta: [17] },
    { px: 3, pi: 0, bln: 7, tgl: 24, status: 'DITUNDA', topik: 'Simulasi Kegawatdaruratan Terintegrasi', prog: 2, metode: 'Simulasi', peserta: [11, 12], ket: 'Perseptor dinas luar; digantikan jadwal 27 Agustus' },
  ]

  const aspekObservasi = ['Kesesuaian SOP', 'Keselamatan Pasien', 'Komunikasi', 'Keterampilan teknis', 'Dokumentasi', 'Etika', 'Penggunaan APD', 'PPI', 'Ketepatan tindakan']

  let jadwalCount = 0
  for (const js of jadwalSeed) {
    const tanggal = date(TAHUN, js.bln, js.tgl)
    jadwalCount++
    const j = await db.jadwal.create({
      data: {
        programId: prog[js.prog].id, puskesmasId: pkm[js.px].id, perseptorId: per[js.pi].id,
        tanggal, waktuMulai: '08:30', waktuSelesai: '11:30', topik: js.topik,
        tujuan: 'Meningkatkan kompetensi ' + js.topik.toLowerCase() + ' sesuai standar',
        status: js.status, metode: js.metode, catatan: js.ket || null,
        qrToken: 'QR-PERS-' + String(1000 + jadwalCount),
      },
    })
    for (const tIdx of js.peserta as number[]) {
      await db.peserta.create({ data: { jadwalId: j.id, tenagaKesehatanId: tk[tIdx].id, hadir: ['SELESAI', 'BERLANGSUNG'].includes(js.status) } })
    }
    if (js.status === 'DITUNDA' || js.status === 'DIBATALKAN') continue

    const selesai = js.status === 'SELESAI'
    for (const tIdx of js.peserta as number[]) {
      const nAspek = selesai ? aspekObservasi.length : 3
      for (let a = 0; a < nAspek; a++) {
        await db.penilaian.create({
          data: {
            jadwalId: j.id, tenagaKesehatanId: tk[tIdx].id, kategori: 'OBSERVASI', aspek: aspekObservasi[a],
            skor: selesai ? [3, 4, 4, 5, 3, 4, 5, 4, 3][(a + tIdx) % 9] : null,
            catatan: selesai ? ['Perlu pendampingan lanjutan', 'Sudah sesuai standar', 'Cukup baik, perlu konsistensi'][(a + tIdx) % 3] : null,
            metode: js.metode,
          },
        })
      }
      if (selesai) {
        await db.penilaian.create({ data: { jadwalId: j.id, tenagaKesehatanId: tk[tIdx].id, kategori: 'PERSIAPAN', aspek: 'Kesiapan peserta & tujuan pembimbingan', catatan: 'Peserta memahami tujuan pembimbingan', metode: js.metode } })
      }
    }
    if (!selesai) continue

    // Evaluasi kompetensi progres
    const evalPlan: Array<[number, number, number]> = [] // [tkIdx, kompetensiIdx, skor]
    const mapTopik: Array<[string, number]> = [
      ['Hand Hygiene', 5], ['Bantuan Hidup', 7], ['Persalinan', 9], ['Farmasi', 13], ['Syok', 8],
      ['Identifikasi Pasien', 4], ['Komplikasi Kehamilan', 17], ['Limbah', 6], ['Hipertensi', 0],
      ['Resusitasi Bayi', 10], ['Keperawatan', 15], ['Diabetes', 1], ['Menyusu', 18],
    ]
    let kiTarget = (js.prog * 3 + 1) % komp.length
    for (const [kata, ki] of mapTopik) { if (js.topik.includes(kata)) { kiTarget = ki; break } }
    for (const tIdx of js.peserta as number[]) {
      const skor = [4, 5, 4][(tIdx + jadwalCount) % 3]
      evalPlan.push([tIdx, kiTarget, skor])
      await db.evaluasiKompetensi.create({ data: { tenagaKesehatanId: tk[tIdx].id, kompetensiId: komp[kiTarget].id, skor, sumber: 'EVALUASI', jadwalId: j.id, periode: `${TAHUN}-${String(js.bln).padStart(2, '0')}` } })
    }
    // Skor AWAL jika belum ada
    for (const tIdx of js.peserta as number[]) {
      const sudah = await db.evaluasiKompetensi.findFirst({ where: { tenagaKesehatanId: tk[tIdx].id, sumber: 'AWAL', kompetensiId: komp[kiTarget].id } })
      if (!sudah) {
        await db.evaluasiKompetensi.create({ data: { tenagaKesehatanId: tk[tIdx].id, kompetensiId: komp[kiTarget].id, skor: 2, sumber: 'AWAL', periode: `${TAHUN}-01` } })
      }
    }

    // Kasus
    await db.kasus.create({
      data: {
        jadwalId: j.id, tanggal, jenisKasus: ['Kardiovaskular', 'Infeksi', 'Maternal', 'Farmasi', 'Anak'][js.prog % 5], kodeAnonim: 'P-' + String(100 + jadwalCount),
        masalah: 'Keterlambatan penatalaksanaan awal pada kondisi ' + ['gawat darurat kardiovaskular', 'infeksi lokal progresif', 'kehamilan dengan komplikasi', 'polifarmasi lansia', 'gizi kurang'][js.prog % 5],
        kondisi: 'Pasien datang stabil-berat ringan; anamnesis & pemeriksaan dasar telah dilakukan',
        tindakan: 'Penanganan awal sesuai SOP unit, observasi lanjutan, kaji ulang dalam 30-60 menit',
        analisis: 'Asesmen awal baik, namun dokumentasi alur tindakan belum sistematis; beberapa langkah kunci terlewat saat beban tinggi',
        pembahasan: 'Diskusi interaktif prioritas tatalaksana, checklist kunci, dan strategi komunikasi antar unit (SBAR)',
        pembelajaran: 'Pentingnya systematic approach & checklist saat kondisi sibuk; komunikasi SBAR antar petugas',
        rekomendasi: 'Menampilkan checklist kunci di ruang pelayanan dan simulasi rutin bulanan',
      },
    })

    // Temuan + Rekomendasi + RTL
    const temuanTpl: Array<[string, string, string]> = [
      ['PPI', 'Hand hygiene sebelum tindakan belum konsisten pada 2 dari 5 observasi', 'SEDANG'],
      ['Dokumentasi', 'Pencatatan tindakan belum lengkap (kolom tanda tangan & jam tindakan kosong)', 'SEDANG'],
      ['SOP', 'SOP tatalaksana belum diperbarui dengan standar terbaru', 'RENDAH'],
      ['Kompetensi', 'Keterampilan kunci pada skenario prioritas masih memerlukan supervisi', 'TINGGI'],
      ['Keselamatan Pasien', 'Verifikasi identitas pasien tidak dilakukan sebelum tindakan pada 1 observasi', 'KRITIS'],
    ]
    const nTemuan = [2, 3, 1, 2, 3][jadwalCount % 5]
    for (let i = 0; i < nTemuan; i++) {
      const [kat, uraian, risiko] = temuanTpl[(jadwalCount + i) % temuanTpl.length]
      const t = await db.temuan.create({
        data: {
          jadwalId: j.id, kategori: kat, uraian, tingkatRisiko: risiko,
          bukti: 'Catatan observasi langsung oleh perseptor, ' + tanggal.toISOString().slice(0, 10),
          rekomendasiTeks: 'Pembinaan & redemonstrasi sesuai standar; monitoring via checklist mingguan',
          penanggungJawab: tk[(js.peserta as number[])[0]].nama, batasWaktu: new Date(tanggal.getTime() + 30 * 86400000),
          status: 'TERBUKA',
        },
      })
      const rek = await db.rekomendasi.create({
        data: {
          jadwalId: j.id, temuanId: t.id, masalah: uraian,
          akarMasalah: risiko === 'KRITIS' ? 'Beban kerja tinggi & checklist tidak tersedia di titik pelayanan' : 'Belum ada reminder visual dan supervisi berkala',
          rekomendasi: 'Penyediaan checklist di titik pelayanan + pembinaan bulanan oleh koordinator',
          penanggungJawab: 'Kepala ' + pkm[js.px].nama, targetWaktu: new Date(tanggal.getTime() + 45 * 86400000),
          indikatorKeberhasilan: 'Kepatuhan > 90% pada audit berikutnya', status: 'AKTIF',
        },
      })

      const hariTarget = new Date(tanggal.getTime() + 30 * 86400000)
      const hariIni = new Date(TAHUN, 8, 11)
      let rtlStatus = 'BELUM_DIMULAI'
      let verifikasiStatus = 'MENUNGGU'
      let verifikasiOleh: string | null = null
      let verifikasiPada: Date | null = null
      let tanggalSelesai: Date | null = null
      let bukti: string | null = null
      if (i === 0) {
        rtlStatus = 'TERVERIFIKASI'; verifikasiStatus = 'DISETUJUI'; verifikasiOleh = per[js.pi].nama
        verifikasiPada = hariTarget < hariIni ? hariTarget : hariIni
        tanggalSelesai = verifikasiPada; bukti = 'Foto checklist terpasang + rekap audit mingguan'
      } else if (i === 1) {
        rtlStatus = hariTarget < hariIni ? 'TERLAMBAT' : 'DALAM_PROSES'
        bukti = hariTarget < hariIni ? null : 'Draft checklist sedang disusun koordinator'
      } else {
        rtlStatus = 'DALAM_PROSES'; bukti = 'Notulen pembinaan internal Puskesmas'
      }
      const rtl = await db.rTL.create({
        data: {
          temuanId: t.id, rekomendasiId: rek.id, puskesmasId: pkm[js.px].id,
          kegiatan: (i === 0 ? 'Menyusun & menempel checklist ' : i === 1 ? 'Pembinaan internal dan redemonstrasi ' : 'Monitoring mingguan kepatuhan ') + kat.toLowerCase(),
          penanggungJawab: 'Kepala ' + pkm[js.px].nama, targetSelesai: hariTarget,
          status: rtlStatus, bukti, tanggalSelesai,
          verifikasiStatus, verifikasiCatatan: verifikasiStatus === 'DISETUJUI' ? 'Bukti lengkap dan hasil audit membaik. Disetujui.' : null,
          verifikasiOleh, verifikasiPada,
        },
      })
      if (verifikasiStatus === 'DISETUJUI') {
        await db.verifikasiRTL.create({ data: { rtlId: rtl.id, aksi: 'DISETUJUI', catatan: 'Bukti tindak lanjut lengkap; hasil audit membaik.', oleh: verifikasiOleh, pada: verifikasiPada! } })
      }
      if (i === 0) {
        await db.dokumentasi.create({ data: { jadwalId: j.id, rtlId: rtl.id, puskesmasId: pkm[js.px].id, jenis: 'BUKTI_RTL', nama: 'Checklist ' + kat + ' — ' + pkm[js.px].nama, deskripsi: 'Bukti checklist terpasang di ruang pelayanan', fileName: 'checklist-' + kat.toLowerCase() + '.pdf', uploadedBy: 'Admin Puskesmas' } })
      }
    }

    await db.dokumentasi.create({ data: { jadwalId: j.id, puskesmasId: pkm[js.px].id, jenis: 'FOTO', nama: 'Dokumentasi Kegiatan — ' + js.topik, deskripsi: 'Foto kegiatan pembimbingan bersama peserta', fileName: 'foto-kegiatan-' + jadwalCount + '.jpg', uploadedBy: per[js.pi].nama } })
    await db.dokumentasi.create({ data: { jadwalId: j.id, puskesmasId: pkm[js.px].id, jenis: 'MATERI', nama: 'Materi — ' + js.topik, deskripsi: 'Materi paparan perseptor', fileName: 'materi-' + jadwalCount + '.pdf', uploadedBy: per[js.pi].nama } })

    const pesertaRows = (js.peserta as number[]).map((t) => tk[t].nama).join(', ')
    await db.beritaAcara.create({
      data: {
        jadwalId: j.id, nomor: `BA/PERSEPTOR/${TAHUN}/${String(jadwalCount).padStart(3, '0')}`,
        dibuatOleh: per[js.pi].nama,
        konten: JSON.stringify({
          identitas: { puskesmas: pkm[js.px].nama, perseptor: per[js.pi].nama, tanggal: tanggal.toISOString().slice(0, 10), topik: js.topik },
          peserta: pesertaRows, hasil: 'Pembimbingan berjalan sesuai rencana; capaian penilaian dominan level "Mampu dengan supervisi" hingga "Mandiri"',
        }),
      },
    })
  }

  // Skor AWAL untuk semua tenaga kesehatan yang belum punya
  const allTk = await db.tenagaKesehatan.findMany()
  for (const t of allTk) {
    const ada = await db.evaluasiKompetensi.findFirst({ where: { tenagaKesehatanId: t.id, sumber: 'AWAL' } })
    if (!ada) {
      await db.evaluasiKompetensi.create({ data: { tenagaKesehatanId: t.id, kompetensiId: komp[Math.floor(Math.random() * komp.length)].id, skor: 2, sumber: 'AWAL', periode: `${TAHUN}-01` } })
    }
  }

  // ===== NOTIFIKASI =====
  const users = await db.user.findMany()
  const adminDinas = users.filter((u) => ['SUPERADMIN', 'ADMIN_DINAS'].includes(u.role))
  const adminPkm = users.filter((u) => u.role === 'ADMIN_PUSKESMAS')
  const perUsers = users.filter((u) => u.role === 'PERSEPTOR')
  const pesertaUsers = users.filter((u) => u.role === 'PESERTA')
  const notif = (u: any, judul: string, pesan: string, tipe: string, lamaHari = 1) =>
    db.notification.create({ data: { userId: u.id, judul, pesan, tipe, dibaca: false, createdAt: new Date(Date.now() - lamaHari * 86400000) } })

  for (const u of adminDinas) {
    await notif(u, 'Pembimbingan berlangsung hari ini', 'Puskesmas Melati — Manajemen Prolanis DM/Hipertensi (dr. Hadi Prasetyo, M.Kes). Pantau progres di dashboard.', 'JADWAL', 0)
    await notif(u, 'Temuan risiko KRITIS baru', 'Puskesmas Sukamaju: verifikasi identitas pasien tidak dilakukan sebelum tindakan. Segera pantau RTL.', 'PERINGATAN', 2)
    await notif(u, 'RTL terlambat', 'Beberapa tindak lanjut melewati batas waktu di Puskesmas Cempaka & Anggrek.', 'RTL', 1)
  }
  for (const u of perUsers) {
    await notif(u, 'Jadwal pembimbingan minggu ini', 'Anda memiliki agenda pembimbingan terkonfirmasi. Cek kalender untuk detail.', 'JADWAL', 1)
    await notif(u, 'RTL menunggu verifikasi', 'Terdapat RTL yang telah selesai dan menunggu verifikasi Anda.', 'VERIFIKASI', 3)
  }
  for (const u of adminPkm) {
    await notif(u, 'Jadwal pembimbingan baru', 'Dinas Kesehatan menetapkan jadwal pembimbingan untuk Puskesmas Anda. Mohon siapkan data & peserta.', 'JADWAL', 2)
    await notif(u, 'RTL terlambat', 'Terdapat tindak lanjut yang melewati batas waktu. Segera selesaikan.', 'RTL', 1)
  }
  for (const u of pesertaUsers) {
    await notif(u, 'Umpan balik pembimbingan tersedia', 'Hasil pembimbingan terbaru telah diinput perseptor. Lihat detail untuk umpan balik.', 'INFO', 2)
  }

  // ===== AUDIT LOG =====
  const logEntries: Array<[string, string, string, string]> = [
    ['LOGIN', 'auth', 'Admin Dinas masuk ke sistem', 'Dra. Kartika Dewi, M.Si'],
    ['CREATE', 'program', 'Membuat program: Pembimbingan Khusus Kegawatdaruratan IGD', 'Dra. Kartika Dewi, M.Si'],
    ['UPDATE', 'jadwal', 'Mengubah jadwal pembimbingan Puskesmas Anggrek (menunda simulasi)', 'Dra. Kartika Dewi, M.Si'],
    ['CREATE', 'penilaian', 'Mengisi instrumen observasi Puskesmas Cempaka', 'dr. Hadi Prasetyo, M.Kes'],
    ['VERIFIKASI', 'rtl', 'Menyetujui RTL checklist PPI Puskesmas Sukamaju', 'dr. Ratna Widyaningrum, Sp.EM'],
    ['CREATE', 'rtl', 'Membuat RTL pembinaan internal Puskesmas Cempaka', 'Rr. Sari Wahyuni, S.Adm'],
  ]
  for (let i = 0; i < logEntries.length; i++) {
    const [aksi, entitas, deskripsi, nama] = logEntries[i]
    const u = users.find((x) => x.nama === nama)
    await db.auditLog.create({ data: { userId: u?.id || null, userName: nama, aksi, entitas, deskripsi, createdAt: new Date(Date.now() - (logEntries.length - i) * 3600000) } })
  }

  // ===== INSTRUMEN TEMPLATE =====
  await db.instrumenTemplate.create({
    data: {
      nama: 'Instrumen Observasi Pembimbingan Klinik (Standar)',
      deskripsi: 'Instrumen baku observasi: 3 aspek persiapan + 9 aspek observasi',
      aspek: JSON.stringify([
        { kategori: 'PERSIAPAN', aspek: 'Ketepatan tujuan pembimbingan' }, { kategori: 'PERSIAPAN', aspek: 'Kompetensi yang dinilai jelas' }, { kategori: 'PERSIAPAN', aspek: 'Kesiapan peserta' },
        { kategori: 'OBSERVASI', aspek: 'Kesesuaian SOP' }, { kategori: 'OBSERVASI', aspek: 'Keselamatan Pasien' }, { kategori: 'OBSERVASI', aspek: 'Komunikasi' }, { kategori: 'OBSERVASI', aspek: 'Keterampilan teknis' }, { kategori: 'OBSERVASI', aspek: 'Dokumentasi' }, { kategori: 'OBSERVASI', aspek: 'Etika' }, { kategori: 'OBSERVASI', aspek: 'Penggunaan APD' }, { kategori: 'OBSERVASI', aspek: 'PPI' }, { kategori: 'OBSERVASI', aspek: 'Ketepatan tindakan' },
      ]), aktif: true,
    },
  })

  console.log('Seeding selesai! Users:', users.length, '| Jadwal:', jadwalCount)
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
