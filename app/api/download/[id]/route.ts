import { NextRequest, NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

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

async function readFilesMetadata(): Promise<FileMetadata[]> {
  try {
    const { readFile: readFileMetadata } = await import("fs/promises");
    const content = await readFileMetadata(FILES_METADATA_PATH, "utf-8");
    return JSON.parse(content);
  } catch (error) {
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
    const fileMetadata = files.find((f) => f.id === id);

    if (!fileMetadata) {
      return NextResponse.json({ error: "File tidak ditemukan" }, { status: 404 });
    }

    const filePath = join(FILES_DIR, fileMetadata.fileName);

    if (!existsSync(filePath)) {
      return NextResponse.json({ error: "File tidak ditemukan" }, { status: 404 });
    }

    // Read file
    const fileBuffer = await readFile(filePath);
    const fileStats = await stat(filePath);

    // Return file with proper headers
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="Portofolio_Maulana_Bayu.pdf"',
        "Content-Length": fileStats.size.toString(),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Error downloading file:", error);
    return NextResponse.json({ error: "Gagal mendownload file" }, { status: 500 });
  }
}

