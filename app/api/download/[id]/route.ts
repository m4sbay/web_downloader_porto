import { NextRequest, NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

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
  metadataBlobUrl?: string;
}

// Store metadata blob URL in memory
let metadataBlobUrl: string | null = null;

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
        return [];
      }

      try {
        const { list } = await import("@vercel/blob");
        const METADATA_BLOB_KEY = "files-metadata.json";
        
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

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id;

    if (!id) {
      return NextResponse.json({ error: "ID tidak ditemukan" }, { status: 400 });
    }

    // Prevent routing conflicts - validate ID format (should be 16 character hex string)
    if (id === "dashboard" || !/^[a-f0-9]{16}$/i.test(id)) {
      return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    }

    // Read metadata to find file
    const files = await readFilesMetadata();
    const fileMetadata = files.find(f => f.id === id);

    if (!fileMetadata) {
      return NextResponse.json({ error: "File tidak ditemukan" }, { status: 404 });
    }

    // Fetch file
    try {
      if (useLocalStorage) {
        // Read from local filesystem
        const fileName = fileMetadata.blobUrl.split("/").pop() || "";
        const filePath = join(FILES_DIR, fileName);

        if (!existsSync(filePath)) {
          return NextResponse.json({ error: "File tidak ditemukan di storage" }, { status: 404 });
        }

        const fileBuffer = await readFile(filePath);
        const fileStats = await stat(filePath);

        return new NextResponse(fileBuffer, {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": 'attachment; filename="Portofolio_Maulana_Bayu.pdf"',
            "Content-Length": fileStats.size.toString(),
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      } else {
        // Fetch from blob storage using the blob URL
        const response = await fetch(fileMetadata.blobUrl);
        if (!response.ok) {
          return NextResponse.json({ error: "File tidak ditemukan di storage" }, { status: 404 });
        }

        const blobBuffer = await response.arrayBuffer();
        const contentLength = response.headers.get("content-length") || blobBuffer.byteLength.toString();

        return new NextResponse(blobBuffer, {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": 'attachment; filename="Portofolio_Maulana_Bayu.pdf"',
            "Content-Length": contentLength,
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      }
    } catch (error) {
      console.error("Error fetching file:", error);
      return NextResponse.json({ error: "File tidak ditemukan di storage" }, { status: 404 });
    }
  } catch (error) {
    console.error("Error downloading file:", error);
    return NextResponse.json({ error: "Gagal mendownload file" }, { status: 500 });
  }
}
