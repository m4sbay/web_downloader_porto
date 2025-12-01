"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function DownloadPage() {
  const params = useParams();
  const id = params.id as string;
  const [downloadStarted, setDownloadStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    
    // Prevent routing conflicts - check if ID is valid (should be hex string, not "dashboard" or other routes)
    if (id === "dashboard" || id.length !== 16) {
      return;
    }

    // Auto-download saat page load
    const triggerDownload = () => {
      try {
        setDownloadStarted(true);

        // Method 1: Menggunakan anchor element dengan download attribute
        const link = document.createElement("a");
        link.href = `/api/download/${id}`;
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
            window.location.href = `/api/download/${id}`;
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
  }, [id]);

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
          <p style={{ color: "#666", marginBottom: "1.5rem" }}>
            File PDF portofolio sedang didownload. Jika download tidak dimulai secara otomatis, klik tombol di bawah ini.
          </p>
          <a
            href={`/api/download/${id}`}
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
            href={`/api/download/${id}`}
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
          }}
        >
          <p style={{ color: "#666" }}>Memuat...</p>
        </div>
      )}
    </main>
  );
}

