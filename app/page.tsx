"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [downloadStarted, setDownloadStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Auto-download saat page load
    const triggerDownload = () => {
      try {
        setDownloadStarted(true);

        // Method 1: Menggunakan anchor element dengan download attribute
        const link = document.createElement("a");
        link.href = "/Portfolioku.pdf";
        link.download = "Portofolio_Maulana_Bayu.pdf";
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Fallback: Jika browser tidak support, redirect ke file
        setTimeout(() => {
          // Check jika download berhasil dengan melihat apakah user masih di halaman
          // Jika masih di halaman setelah 2 detik, coba method alternatif
          if (!document.hidden) {
            window.location.href = "/Portfolioku.pdf";
          }
        }, 2000);
      } catch (err) {
        setError("Gagal memulai download. Silakan coba lagi.");
        console.error("Download error:", err);
      }
    };

    // Delay kecil untuk memastikan page fully loaded
    const timer = setTimeout(triggerDownload, 100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      {downloadStarted && !error && (
        <div
          style={{
            maxWidth: "500px",
            padding: "2rem",
            background: "white",
            borderRadius: "8px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          }}
        >
          <h1 style={{ marginBottom: "1rem", fontSize: "1.5rem" }}>Download Dimulai...</h1>
          <p style={{ color: "#666", marginBottom: "1.5rem" }}>File PDF portofolio sedang didownload. Jika download tidak dimulai secara otomatis, klik tombol di bawah ini.</p>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", justifyContent: "center" }}>
            <a
              href="/Portfolioku.pdf"
              download="Portofolio_Maulana_Bayu.pdf"
              style={{
                display: "inline-block",
                padding: "0.75rem 1.5rem",
                background: "#0070f3",
                color: "white",
                textDecoration: "none",
                borderRadius: "4px",
                fontWeight: "500",
                transition: "background 0.2s",
              }}
              onMouseOver={e => {
                e.currentTarget.style.background = "#0051cc";
              }}
              onMouseOut={e => {
                e.currentTarget.style.background = "#0070f3";
              }}
            >
              Download Portfolio PDF
            </a>
            <a
              href="/login"
              style={{
                display: "inline-block",
                padding: "0.75rem 1.5rem",
                background: "#28a745",
                color: "white",
                textDecoration: "none",
                borderRadius: "4px",
                fontWeight: "500",
                transition: "background 0.2s",
              }}
              onMouseOver={e => {
                e.currentTarget.style.background = "#218838";
              }}
              onMouseOut={e => {
                e.currentTarget.style.background = "#28a745";
              }}
            >
              📁 Dashboard Admin
            </a>
          </div>
        </div>
      )}

      {error && (
        <div
          style={{
            maxWidth: "500px",
            padding: "2rem",
            background: "#fee",
            borderRadius: "8px",
            border: "1px solid #fcc",
          }}
        >
          <h2 style={{ marginBottom: "1rem", color: "#c33" }}>Error</h2>
          <p style={{ marginBottom: "1.5rem", color: "#666" }}>{error}</p>
          <a
            href="/Portfolioku.pdf"
            download="Portofolio_Maulana_Bayu.pdf"
            style={{
              display: "inline-block",
              padding: "0.75rem 1.5rem",
              background: "#0070f3",
              color: "white",
              textDecoration: "none",
              borderRadius: "4px",
              fontWeight: "500",
            }}
          >
            Coba Download Manual
          </a>
        </div>
      )}

      {!downloadStarted && !error && (
        <div
          style={{
            maxWidth: "500px",
            padding: "2rem",
            background: "white",
            borderRadius: "8px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          }}
        >
          <p style={{ color: "#666", marginBottom: "1rem" }}>Memuat...</p>
          <a
            href="/login"
            style={{
              display: "inline-block",
              padding: "0.5rem 1rem",
              background: "#28a745",
              color: "white",
              textDecoration: "none",
              borderRadius: "4px",
              fontSize: "0.9rem",
            }}
          >
            📁 Akses Dashboard Admin
          </a>
        </div>
      )}
    </main>
  );
}
