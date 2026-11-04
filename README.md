# Budget Everything

Aplikasi web (PWA) pencatat keuangan pribadi, online-only, dipetakan dari `BUDGETING.xlsx`.
Stack: React + Vite + TypeScript, TanStack Query, Supabase (PostgreSQL + Auth). Biaya awal: gratis.

## Fitur
- Ringkasan bulanan: pendapatan, anggaran vs realisasi per kelompok (Kebutuhan/Keinginan/Tabungan) dan per kategori, batas aman per hari, saldo tiap akun
- Catat pengeluaran, pemasukan, mutasi antar akun (dengan biaya admin), dan penyesuaian saldo
- Daftar transaksi per bulan dengan pencarian dan hapus
- Atur anggaran per bulan: pilih kategori mana saja yang masuk, atur nominal, atau salin dari bulan lalu
- Halaman Profil: lihat akun, keluar, dan kelola kategori (tambah, ubah nama/kelompok/ikon, hapus atau arsipkan)
- Login email (magic link), data dilindungi Row Level Security
- Bisa dipasang ke layar utama iPhone/Android (Share → Add to Home Screen)

## Setup
1. Buat proyek di https://supabase.com (paket Free cukup).
2. Supabase → Authentication → URL Configuration: isi **Site URL** dengan alamat app (mis. `http://localhost:5173`, nanti ganti ke domain hosting) dan tambahkan juga di Redirect URLs.
3. Salin `.env.example` menjadi `.env`, isi `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` (Project Settings → API).
4. Jalankan `supabase/schema.sql` di SQL Editor (sudah termasuk `grant` untuk role `authenticated`; tanpa ini muncul error "permission denied for table ...").
   Gunakan **Publishable/anon key** di `.env`, jangan pakai secret/service_role key.
5. `npm install && npm run dev`, buka app, login dengan email Anda (supaya akun terbentuk). Email bawaan Supabase dibatasi ±2 per jam; kalau kena "email rate limit exceeded", atur kata sandi lewat SQL di bawah lalu masuk dengan kata sandi.
6. Jalankan `supabase/seed.sql` di SQL Editor. Seed memakai user pertama di `auth.users`, jadi harus setelah langkah 5.

Jika proyek Supabase sudah berjalan sebelum fitur kategori ditambahkan, jalankan sekali `supabase/migrations/001_category_icon.sql` di SQL Editor (menambah kolom ikon kategori).

Untuk membuat ulang seed dari file Excel yang baru: `python3 scripts/make_seed.py scripts/BUDGETING.xlsx supabase/seed.sql` (butuh `openpyxl`).

## Deploy
Sudah ada `vercel.json` (Vercel) dan `public/_redirects` (Netlify/Cloudflare Pages) supaya alamat seperti `/transaksi` tidak 404 saat dibuka langsung atau di-refresh.

`npm run build`, lalu unggah folder `dist` ke Cloudflare Pages / Vercel / Netlify. Isi dua variabel `VITE_...` di pengaturan hosting.

## Aturan yang dibawa dari Excel
- Saldo akun = pemasukan/penyesuaian − pengeluaran − mutasi keluar − biaya admin + mutasi masuk
- Saldo bisa dipakai = saldo akun yang dihitung − saldo yang ditahan (Mandiri 25.000, BRI 50.000). Brizzi dan E-money tidak ikut dihitung
- Batas aman per hari = saldo bisa dipakai ÷ sisa hari, dibulatkan ke bawah per 500
- Baris "PENYESUAIAN SALDO" disimpan sebagai tipe `adjustment` (bukan pemasukan), jadi tidak menggelembungkan total pendapatan

## Atur kata sandi (tanpa email)
Jalankan di SQL Editor, ganti email dan kata sandinya. Data Anda tidak terhapus karena akun yang sama dipakai.

```sql
update auth.users
set encrypted_password = extensions.crypt('KATA_SANDI_BARU', extensions.gen_salt('bf')),
    email_confirmed_at = coalesce(email_confirmed_at, now())
where email = 'email@anda.com';
```
