import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const ADMIN_CREDENTIALS = {
  username: "bayu7876",
  password: "makanayam08",
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    // Validate credentials
    if (username !== ADMIN_CREDENTIALS.username || password !== ADMIN_CREDENTIALS.password) {
      return NextResponse.json({ error: "Username atau password salah!" }, { status: 401 });
    }

    // Create session token (simple approach)
    const sessionToken = Buffer.from(`${username}:${Date.now()}`).toString("base64");
    const expiresAt = new Date();
    expiresAt.setTime(expiresAt.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set("admin_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: expiresAt,
      path: "/",
    });

    return NextResponse.json({ message: "Login berhasil", username });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan saat login" }, { status: 500 });
  }
}

