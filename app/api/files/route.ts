import { NextRequest, NextResponse } from "next/server";
import { put, del, head, list } from "@vercel/blob";
import { randomBytes } from "crypto";
import { writeFile, readFile, unlink, mkdir, stat } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

const METADATA_BLOB_KEY = "files-metadata.json";
const FILES_DIR = join(process.cwd(), "public", "files");
const DATA_DIR = join(process.cwd(), "data");
const FILES_METADATA_PATH = join(DATA_DIR, "files-metadata.json");

// Check if running in development without Blob token
const isDevelopment = process.env.NODE_ENV === "development";
const hasBlobToken = !!process.env.BLOB_READ_WRITE_TOKEN;
const useLocalStorage = isDevelopment && !hasBlobToken;

interface FileMetadata {
  id: string;
  originalName: string;
  blobUrl: string;
  size: number;
  uploadDate: string;
  downloadLink: string;
  metadataBlobUrl?: string; // Store metadata blob URL for fetching
}

// Store metadata blob URL in memory (will be set after first upload)
let metadataBlobUrl: string | null = null;

// Generate unique ID
function generateId(): string {
  return randomBytes(8).toString("hex");
}

// Read files metadata
async function readFilesMetadata(): Promise<FileMetadata[]> {
  try {
    if (useLocalStorage) {
      // Use local filesystem for development
      if (!existsSync(FILES_METADATA_PATH)) {
        return [];
      }
      const content = await readFile(FILES_METADATA_PATH, "utf-8");
      return JSON.parse(content);
    } else {
      // Use Vercel Blob - find metadata blob using list()
      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        console.warn("BLOB_READ_WRITE_TOKEN tidak ditemukan, returning empty array");
        return [];
      }

      try {
        // Use list() to find the metadata blob
        const { blobs } = await list({
          prefix: METADATA_BLOB_KEY,
          limit: 1,
        });

        if (blobs.length > 0) {
          const metadataBlob = blobs[0];
          metadataBlobUrl = metadataBlob.url;

          // Fetch the metadata content
          const response = await fetch(metadataBlob.url);
          if (response.ok) {
            const text = await response.text();
            const metadata = JSON.parse(text);
            return metadata;
          }
        }
        return [];
      } catch (error: any) {
        console.error("Error reading metadata from blob:", error);
        return [];
      }
    }
  } catch (error: any) {
    console.error("Error reading metadata:", error);
    return [];
  }
}

// Write files metadata
async function writeFilesMetadata(metadata: FileMetadata[]) {
  const metadataJson = JSON.stringify(metadata, null, 2);

  if (useLocalStorage) {
    // Use local filesystem for development
    if (!existsSync(DATA_DIR)) {
      await mkdir(DATA_DIR, { recursive: true });
    }
    await writeFile(FILES_METADATA_PATH, metadataJson, "utf-8");
  } else {
    // Use Vercel Blob
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new Error("BLOB_READ_WRITE_TOKEN tidak ditemukan");
    }
    // Store metadata in blob and save the URL
    const blob = await put(METADATA_BLOB_KEY, metadataJson, {
      access: "public",
      contentType: "application/json",
    });
    metadataBlobUrl = blob.url;
    // Store metadata URL in each metadata item for future reads
    metadata.forEach(item => {
      item.metadataBlobUrl = blob.url;
    });
  }
}

// GET - Get all files with their download links
export async function GET() {
  try {
    const files = await readFilesMetadata();

    // Check if files exist
    const filesWithStatus = await Promise.all(
      files.map(async file => {
        try {
          if (useLocalStorage) {
            // Check local filesystem
            const filePath = join(FILES_DIR, file.blobUrl.split("/").pop() || "");
            const exists = existsSync(filePath);
            return {
              ...file,
              exists,
            };
          } else {
            // Check blob storage by trying to fetch the URL
            try {
              const response = await fetch(file.blobUrl, { method: "HEAD" });
              return {
                ...file,
                exists: response.ok,
              };
            } catch (error) {
              return {
                ...file,
                exists: false,
              };
            }
          }
        } catch (error) {
          return {
            ...file,
            exists: false,
          };
        }
      })
    );

    return NextResponse.json(filesWithStatus);
  } catch (error) {
    console.error("Error getting files:", error);
    return NextResponse.json({ error: "Gagal mendapatkan daftar file" }, { status: 500 });
  }
}

// POST - Upload new PDF file
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "Tidak ada file yang diupload" }, { status: 400 });
    }

    // Validate file type
    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Hanya file PDF yang diizinkan" }, { status: 400 });
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: "Ukuran file terlalu besar (maksimal 50MB)" }, { status: 400 });
    }

    // Generate unique ID
    const id = generateId();
    const fileName = `${id}.pdf`;

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let blobUrl: string;

    if (useLocalStorage) {
      // Use local filesystem for development
      if (!existsSync(FILES_DIR)) {
        await mkdir(FILES_DIR, { recursive: true });
      }
      const filePath = join(FILES_DIR, fileName);
      await writeFile(filePath, buffer);
      blobUrl = `/files/${fileName}`; // Relative path for local
    } else {
      // Upload to Vercel Blob
      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        return NextResponse.json(
          {
            error: "BLOB_READ_WRITE_TOKEN tidak ditemukan. Pastikan Vercel Blob Storage sudah di-setup.",
          },
          { status: 500 }
        );
      }

      let blob;
      try {
        blob = await put(fileName, buffer, {
          access: "public",
          contentType: "application/pdf",
        });
        blobUrl = blob.url;
      } catch (blobError: any) {
        console.error("Error uploading to blob:", blobError);
        return NextResponse.json(
          {
            error: `Gagal mengupload ke Blob Storage: ${blobError?.message || "Unknown error"}. Pastikan BLOB_READ_WRITE_TOKEN sudah ter-set dengan benar.`,
          },
          { status: 500 }
        );
      }
    }

    // Get base URL - support for Vercel and other platforms
    let baseUrl: string;

    // Check for Vercel environment variable first
    if (process.env.VERCEL_URL) {
      baseUrl = `https://${process.env.VERCEL_URL}`;
    } else if (process.env.NEXT_PUBLIC_BASE_URL) {
      // Use custom base URL if set
      baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    } else {
      // Fallback to request headers (works for most platforms including Vercel)
      const protocol = request.headers.get("x-forwarded-proto") || (request.headers.get("host")?.includes("localhost") ? "http" : "https");
      const host = request.headers.get("host") || request.headers.get("x-forwarded-host") || "localhost:3000";
      baseUrl = `${protocol}://${host}`;
    }

    const downloadLink = `${baseUrl}/download/${id}`;

    // Read existing metadata first
    const files = await readFilesMetadata();

    // Create metadata
    const metadata: FileMetadata = {
      id,
      originalName: file.name,
      blobUrl: blobUrl,
      size: file.size,
      uploadDate: new Date().toISOString(),
      downloadLink,
    };

    // Add to files array
    files.push(metadata);

    // Save metadata (this will also store the metadata blob URL)
    await writeFilesMetadata(files);

    return NextResponse.json({
      message: "File berhasil diupload",
      ...metadata,
    });
  } catch (error: any) {
    console.error("Error uploading file:", error);
    const errorMessage = error?.message || "Unknown error";
    return NextResponse.json(
      {
        error: `Gagal mengupload file: ${errorMessage}`,
        details: process.env.NODE_ENV === "development" ? error?.stack : undefined,
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete PDF file by ID
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID file tidak ditemukan" }, { status: 400 });
    }

    // Read metadata
    const files = await readFilesMetadata();
    const fileIndex = files.findIndex(f => f.id === id);

    if (fileIndex === -1) {
      return NextResponse.json({ error: "File tidak ditemukan" }, { status: 404 });
    }

    const file = files[fileIndex];

    // Delete file
    try {
      if (useLocalStorage) {
        // Delete from local filesystem
        const fileName = file.blobUrl.split("/").pop() || "";
        const filePath = join(FILES_DIR, fileName);
        if (existsSync(filePath)) {
          await unlink(filePath);
        }
      } else {
        // Delete from blob storage
        await del(file.blobUrl);
      }
    } catch (error) {
      console.error("Error deleting file:", error);
      // Continue even if deletion fails
    }

    // Remove from metadata
    files.splice(fileIndex, 1);
    await writeFilesMetadata(files);

    return NextResponse.json({ message: "File berhasil dihapus" });
  } catch (error) {
    console.error("Error deleting file:", error);
    return NextResponse.json({ error: "Gagal menghapus file" }, { status: 500 });
  }
}
