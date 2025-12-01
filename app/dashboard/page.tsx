"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface FileInfo {
  id: string;
  originalName: string;
  fileName: string;
  size: number;
  uploadDate: string;
  downloadLink: string;
  exists: boolean;
}

export default function Dashboard() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // Check authentication
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/auth/check");
      if (response.ok) {
        const data = await response.json();
        if (data.authenticated) {
          setAuthenticated(true);
          // Ensure we're on dashboard page, not download page
          if (typeof window !== "undefined") {
            const path = window.location.pathname;
            if (path.startsWith("/download/")) {
              // Redirect if accidentally on download page
              window.location.href = "/dashboard";
              return;
            }
          }
          fetchFiles();
        } else {
          setAuthenticated(false);
          router.push("/login");
        }
      } else {
        setAuthenticated(false);
        router.push("/login");
      }
    } catch (error) {
      console.error("Auth check error:", error);
      setAuthenticated(false);
      router.push("/login");
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/files");
      if (response.ok) {
        const data = await response.json();
        // Sort by upload date (newest first)
        const sortedData = data.sort((a: FileInfo, b: FileInfo) => 
          new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()
        );
        setFiles(sortedData);
      }
    } catch (error) {
      console.error("Error fetching files:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type !== "application/pdf") {
        setMessage({ type: "error", text: "Hanya file PDF yang diizinkan!" });
        return;
      }
      setFile(selectedFile);
      setMessage(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage({ type: "error", text: "Pilih file PDF terlebih dahulu!" });
      return;
    }

    setUploading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/files", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ 
          type: "success", 
          text: `File berhasil diupload! Link download: ${data.downloadLink}` 
        });
        setFile(null);
        // Reset file input
        const fileInput = document.getElementById("file-input") as HTMLInputElement;
        if (fileInput) fileInput.value = "";
        fetchFiles();
      } else {
        setMessage({ type: "error", text: data.error || "Gagal mengupload file!" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Terjadi kesalahan saat mengupload file!" });
      console.error("Upload error:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, originalName: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus file "${originalName}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/files?id=${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: "success", text: "File berhasil dihapus!" });
        fetchFiles();
      } else {
        setMessage({ type: "error", text: data.error || "Gagal menghapus file!" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Terjadi kesalahan saat menghapus file!" });
      console.error("Delete error:", error);
    }
  };

  const handleCopyLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopiedLink(link);
      setMessage({ type: "success", text: "Link berhasil dicopy!" });
      setTimeout(() => {
        setCopiedLink(null);
      }, 2000);
    } catch (error) {
      setMessage({ type: "error", text: "Gagal menyalin link!" });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Show loading while checking auth
  if (authenticated === null) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f5f5f5",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "#666" }}>Memeriksa autentikasi...</p>
        </div>
      </div>
    );
  }

  // Show nothing if not authenticated (will redirect)
  if (!authenticated) {
    return null;
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "2rem",
        background: "#f5f5f5",
      }}
    >
      <div
        style={{
          maxWidth: "900px",
          margin: "0 auto",
          background: "white",
          borderRadius: "8px",
          padding: "2rem",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <div>
            <h1
              style={{
                fontSize: "2rem",
                marginBottom: "0.5rem",
                color: "#333",
              }}
            >
              Dashboard Admin
            </h1>
            <p style={{ color: "#666", margin: 0 }}>
              Kelola file PDF portofolio Anda di sini. Setiap file yang diupload akan mendapat link unik.
            </p>
          </div>
          <button
            onClick={handleLogout}
            style={{
              padding: "0.5rem 1rem",
              background: "#dc3545",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "0.9rem",
              fontWeight: "500",
            }}
            onMouseOver={e => {
              e.currentTarget.style.background = "#c82333";
            }}
            onMouseOut={e => {
              e.currentTarget.style.background = "#dc3545";
            }}
          >
            Logout
          </button>
        </div>

        {message && (
          <div
            style={{
              padding: "1rem",
              marginBottom: "1.5rem",
              borderRadius: "4px",
              background: message.type === "success" ? "#d4edda" : "#f8d7da",
              color: message.type === "success" ? "#155724" : "#721c24",
              border: `1px solid ${message.type === "success" ? "#c3e6cb" : "#f5c6cb"}`,
              wordBreak: "break-all",
            }}
          >
            {message.text}
          </div>
        )}

        {/* Upload Section */}
        <div
          style={{
            marginBottom: "2rem",
            padding: "1.5rem",
            background: "#f8f9fa",
            borderRadius: "8px",
          }}
        >
          <h2 style={{ fontSize: "1.25rem", marginBottom: "1rem" }}>Upload File PDF Baru</h2>
          <div style={{ marginBottom: "1rem" }}>
            <input
              id="file-input"
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              style={{
                padding: "0.5rem",
                border: "1px solid #ddd",
                borderRadius: "4px",
                width: "100%",
              }}
            />
          </div>
          {file && (
            <div style={{ marginBottom: "1rem", color: "#666" }}>
              File dipilih: <strong>{file.name}</strong> ({formatFileSize(file.size)})
            </div>
          )}
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            style={{
              padding: "0.75rem 1.5rem",
              background: uploading ? "#ccc" : "#0070f3",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: uploading ? "not-allowed" : "pointer",
              fontWeight: "500",
              fontSize: "1rem",
            }}
          >
            {uploading ? "Mengupload..." : "Upload File"}
          </button>
        </div>

        {/* Files List */}
        <div
          style={{
            padding: "1.5rem",
            background: "#f8f9fa",
            borderRadius: "8px",
          }}
        >
          <h2 style={{ fontSize: "1.25rem", marginBottom: "1rem" }}>Daftar File</h2>
          {loading ? (
            <p style={{ color: "#666" }}>Memuat daftar file...</p>
          ) : files.length === 0 ? (
            <p style={{ color: "#666" }}>Belum ada file yang diupload.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {files.map((fileInfo) => (
                <div
                  key={fileInfo.id}
                  style={{
                    padding: "1rem",
                    background: "white",
                    borderRadius: "4px",
                    border: "1px solid #ddd",
                  }}
                >
                  <div style={{ marginBottom: "0.75rem" }}>
                    <p style={{ marginBottom: "0.25rem", fontWeight: "500" }}>
                      {fileInfo.originalName}
                    </p>
                    <p style={{ fontSize: "0.875rem", color: "#666", marginBottom: "0.25rem" }}>
                      Ukuran: {formatFileSize(fileInfo.size)} • Upload: {formatDate(fileInfo.uploadDate)}
                    </p>
                    <p style={{ fontSize: "0.875rem", color: fileInfo.exists ? "#28a745" : "#dc3545" }}>
                      Status: {fileInfo.exists ? "✓ Tersedia" : "✗ File tidak ditemukan"}
                    </p>
                  </div>
                  
                  {/* Download Link */}
                  <div
                    style={{
                      display: "flex",
                      gap: "0.5rem",
                      alignItems: "center",
                      marginBottom: "0.75rem",
                      padding: "0.5rem",
                      background: "#f8f9fa",
                      borderRadius: "4px",
                    }}
                  >
                    <input
                      type="text"
                      value={fileInfo.downloadLink}
                      readOnly
                      style={{
                        flex: 1,
                        padding: "0.5rem",
                        border: "1px solid #ddd",
                        borderRadius: "4px",
                        fontSize: "0.875rem",
                        fontFamily: "monospace",
                      }}
                    />
                    <button
                      onClick={() => handleCopyLink(fileInfo.downloadLink)}
                      style={{
                        padding: "0.5rem 1rem",
                        background: copiedLink === fileInfo.downloadLink ? "#28a745" : "#0070f3",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "0.875rem",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {copiedLink === fileInfo.downloadLink ? "✓ Copied" : "Copy Link"}
                    </button>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <a
                      href={fileInfo.downloadLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: "0.5rem 1rem",
                        background: "#28a745",
                        color: "white",
                        textDecoration: "none",
                        borderRadius: "4px",
                        fontSize: "0.875rem",
                      }}
                    >
                      Test Download
                    </a>
                    <button
                      onClick={() => handleDelete(fileInfo.id, fileInfo.originalName)}
                      style={{
                        padding: "0.5rem 1rem",
                        background: "#dc3545",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "0.875rem",
                      }}
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div style={{ marginTop: "2rem", paddingTop: "2rem", borderTop: "1px solid #ddd" }}>
          <a
            href="/"
            style={{
              color: "#0070f3",
              textDecoration: "none",
              fontSize: "0.9rem",
            }}
          >
            ← Kembali ke Halaman Utama
          </a>
        </div>
      </div>
    </div>
  );
}
