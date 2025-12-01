/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optimasi untuk production
  compress: true,
  poweredByHeader: false,

  // Headers untuk PDF file
  async headers() {
    return [
      {
        source: "/Portfolioku.pdf",
        headers: [
          {
            key: "Content-Type",
            value: "application/pdf",
          },
          {
            key: "Content-Disposition",
            value: 'attachment; filename="Portofolio_Maulana_Bayu.pdf"',
          },
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
