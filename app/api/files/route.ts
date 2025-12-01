import { NextRequest, NextResponse } from "next/server";
import { put, del, head, list } from "@vercel/blob";
import { randomBytes } from "crypto";

const METADATA_BLOB_KEY = "files-metadata.json";

interface FileMetadata {
  id: string;
  originalName: string;
  blobUrl: string;
  size: number;
  uploadDate: string;
  downloadLink: string;
}

// Generate unique ID
function generateId(): string {
  return randomBytes(8).toString("hex");
}

// Read files metadata from Blob
async function readFilesMetadata(): Promise<FileMetadata[]> {
  try {
    // Try to get metadata from blob
    const { get } = await import("@vercel/blob");
    const blob = await get(METADATA_BLOB_KEY);
    const text = await blob.text();
    return JSON.parse(text);
  } catch (error) {
    // If metadata doesn't exist, return empty array
    return [];
  }
}

// Write files metadata to Blob
async function writeFilesMetadata(metadata: FileMetadata[]) {
  const metadataJson = JSON.stringify(metadata, null, 2);
  await put(METADATA_BLOB_KEY, metadataJson, {
    access: "public",
    contentType: "application/json",
  });
}

// GET - Get all files with their download links
export async function GET() {
  try {
    const files = await readFilesMetadata();

    // Check if files exist in blob storage
    const filesWithStatus = await Promise.all(
      files.map(async file => {
        try {
          await head(file.blobUrl);
          return {
            ...file,
            exists: true,
          };
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

    // Upload to Vercel Blob
    const blob = await put(fileName, buffer, {
      access: "public",
      contentType: "application/pdf",
    });

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

    // Create metadata
    const metadata: FileMetadata = {
      id,
      originalName: file.name,
      blobUrl: blob.url,
      size: file.size,
      uploadDate: new Date().toISOString(),
      downloadLink,
    };

    // Save metadata
    const files = await readFilesMetadata();
    files.push(metadata);
    await writeFilesMetadata(files);

    return NextResponse.json({
      message: "File berhasil diupload",
      ...metadata,
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json({ error: "Gagal mengupload file" }, { status: 500 });
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

    // Delete file from blob
    try {
      await del(file.blobUrl);
    } catch (error) {
      console.error("Error deleting blob:", error);
      // Continue even if blob deletion fails
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
