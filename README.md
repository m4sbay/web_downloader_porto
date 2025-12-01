# Web Downloader - Auto PDF Download

Website sederhana yang otomatis mendownload file PDF portofolio ketika seseorang mengunjungi link tersebut. Dibangun dengan Next.js untuk performa optimal, ringan, dan cepat.

## Fitur

- ✅ Auto-download PDF saat halaman dimuat
- ✅ Fallback UI jika download gagal
- ✅ Dashboard Admin untuk mengelola file PDF (Upload & Delete)
- ✅ Ringan dan cepat (minimal dependencies)
- ✅ Siap untuk deployment
- ✅ Optimized untuk production

## Teknologi

- **Next.js 14+** (App Router)
- **TypeScript**
- **React 18**
- **Vercel Blob Storage** (untuk penyimpanan file di production)

## Setup Lokal

### 1. Install Dependencies

```bash
npm install
```

### 2. Jalankan Development Server

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) di browser Anda.

### 3. Upload File PDF (Opsional)

Anda bisa langsung upload file PDF melalui dashboard admin di [http://localhost:3000/dashboard](http://localhost:3000/dashboard), atau letakkan file PDF dengan nama `Portfolioku.pdf` di folder `public/`.

## Build untuk Production

```bash
npm run build
npm start
```

## Deployment

### Vercel (Recommended)

**PENTING: Setup Vercel Blob Storage terlebih dahulu!**

1. **Setup Vercel Blob Storage:**
   - Buka [Vercel Dashboard](https://vercel.com/dashboard)
   - Pilih project Anda (atau buat project baru)
   - Pergi ke tab **Storage**
   - Klik **Create Database** → Pilih **Blob**
   - Environment variable `BLOB_READ_WRITE_TOKEN` akan otomatis ter-set

2. **Deploy Project:**
   - Push project ke GitHub
   - Import project di [Vercel](https://vercel.com)
   - Vercel akan otomatis detect Next.js dan deploy
   - Pastikan environment variable `BLOB_READ_WRITE_TOKEN` sudah ter-set

3. **Setelah Deploy:**
   - Link yang dihasilkan akan otomatis menggunakan URL Vercel Anda
   - File disimpan di Vercel Blob Storage (persistent dan bisa diakses dari internet)
   - Upload file melalui dashboard di production

**Catatan Penting:**

- **WAJIB**: Setup Vercel Blob Storage sebelum deploy, atau upload akan gagal
- Link download yang dihasilkan akan otomatis menggunakan URL production (misal: `https://your-app.vercel.app/download/[id]`)
- Link akan berfungsi dan bisa diakses dari internet setelah deployment
- File yang diupload di localhost tidak akan ikut ke production (harus upload ulang di production)
- File disimpan di Vercel Blob Storage, bukan filesystem (karena Vercel tidak support write ke filesystem)

Atau menggunakan Vercel CLI:

```bash
npm i -g vercel
vercel
```

**Environment Variables (Opsional):**
Jika ingin menggunakan custom domain, set environment variable di Vercel:

- `NEXT_PUBLIC_BASE_URL` = `https://your-custom-domain.com`

### Platform Lain

Project ini bisa di-deploy di platform hosting apapun yang support Next.js:

- Netlify
- Railway
- Render
- AWS Amplify
- dll

## Struktur Project

```
web-downloader/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Main page dengan auto-download
│   ├── globals.css         # Global styles
│   ├── dashboard/
│   │   └── page.tsx        # Dashboard admin untuk CRUD file PDF
│   └── api/
│       └── files/
│           └── route.ts     # API routes untuk upload/delete file
├── public/
│   └── Portfolioku.pdf     # File PDF portofolio (auto-generated dari dashboard)
├── next.config.js          # Next.js configuration
├── package.json
├── tsconfig.json
└── README.md
```

## Cara Kerja

1. Ketika user mengunjungi link website
2. Halaman akan langsung trigger download PDF menggunakan JavaScript
3. File PDF akan otomatis terdownload dengan nama `Portofolio_Maulana_Bayu.pdf`
4. Jika auto-download gagal, user akan melihat tombol download manual

## Dashboard Admin

Dashboard admin tersedia di `/dashboard` untuk mengelola file PDF:

- **Upload File PDF Baru**: Upload file PDF baru yang akan menggantikan file lama
- **Hapus File**: Hapus file PDF yang sedang aktif
- **Preview File**: Lihat file PDF yang sedang aktif
- **Info File**: Lihat informasi file (nama, ukuran, status)

**Catatan**: Dashboard tidak memiliki sistem login. Siapapun yang mengakses `/dashboard` bisa mengelola file. Pastikan untuk tidak mempublish URL dashboard secara publik jika Anda ingin menjaga keamanan.

## Catatan

- File PDF akan otomatis dibuat saat pertama kali diupload melalui dashboard
- File PDF akan di-cache oleh browser untuk performa yang lebih baik
- Website ini menggunakan minimal JavaScript untuk kecepatan optimal
- Ukuran file maksimal: 50MB

## License

MIT
