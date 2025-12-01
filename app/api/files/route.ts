import { NextRequest, NextResponse } from "next/server";
import { writeFile, unlink, stat, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { randomBytes } from "crypto";

const FILES_DIR = join(process.cwd(), "public", "files");
const DATA_DIR = join(process.cwd(), "data");
const FILES_METADATA_PATH = join(DATA_DIR, "files.json");

interface FileMetadata {
  id: string;
  originalName: string;
  fileName: string;
  size: number;
  uploadDate: string;
  downloadLink: string;
}

// Ensure directories exist
async function ensureDirectories() {
  if (!existsSync(FILES_DIR)) {
    await mkdir(FILES_DIR, { recursive: true });
  }
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true });
  }
  if (!existsSync(FILES_METADATA_PATH)) {
    await writeFile(FILES_METADATA_PATH, JSON.stringify([]), "utf-8");
  }
}

// Generate unique ID
function generateId(): string {
  return randomBytes(8).toString("hex");
}

// Read files metadata
async function readFilesMetadata(): Promise<FileMetadata[]> {
  try {
    const { readFile } = await import("fs/promises");
    const content = await readFile(FILES_METADATA_PATH, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    return [];
  }
}

// Write files metadata
async function writeFilesMetadata(metadata: FileMetadata[]) {
  await writeFile(FILES_METADATA_PATH, JSON.stringify(metadata, null, 2), "utf-8");
}

// GET - Get all files with their download links
export async function GET() {
  try {
    await ensureDirectories();
    const files = await readFilesMetadata();

    // Add file existence check
    const filesWithStatus = await Promise.all(
      files.map(async file => {
        const filePath = join(FILES_DIR, file.fileName);
        const exists = existsSync(filePath);
        return {
          ...file,
          exists,
        };
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
    await ensureDirectories();

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
    const filePath = join(FILES_DIR, fileName);

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Write file
    await writeFile(filePath, buffer);

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
      fileName,
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
    await ensureDirectories();

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
    const filePath = join(FILES_DIR, file.fileName);

    // Delete file
    if (existsSync(filePath)) {
      await unlink(filePath);
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
