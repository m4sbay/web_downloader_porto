import { NextRequest, NextResponse } from "next/server";
import { get } from "@vercel/blob";

const METADATA_BLOB_KEY = "files-metadata.json";

interface FileMetadata {
  id: string;
  originalName: string;
  blobUrl: string;
  size: number;
  uploadDate: string;
  downloadLink: string;
}

async function readFilesMetadata(): Promise<FileMetadata[]> {
  try {
    const blob = await get(METADATA_BLOB_KEY);
    const text = await blob.text();
    return JSON.parse(text);
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
    const fileMetadata = files.find(f => f.id === id);

    if (!fileMetadata) {
      return NextResponse.json({ error: "File tidak ditemukan" }, { status: 404 });
    }

    // Fetch file from blob storage
    try {
      const blob = await get(fileMetadata.blobUrl);
      const blobBuffer = await blob.arrayBuffer();

      // Return file with proper headers
      return new NextResponse(blobBuffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": 'attachment; filename="Portofolio_Maulana_Bayu.pdf"',
          "Content-Length": blob.size.toString(),
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    } catch (error) {
      console.error("Error fetching blob:", error);
      return NextResponse.json({ error: "File tidak ditemukan di storage" }, { status: 404 });
    }
  } catch (error) {
    console.error("Error downloading file:", error);
    return NextResponse.json({ error: "Gagal mendownload file" }, { status: 500 });
  }
}
