import { NextResponse } from "next/server";
import { registerUser, findUserByUsername, StoredUser } from "@/lib/user-store";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const username = (body.username || body.name || "").trim();
    const pin = String(body.pin || body.password || "").trim();

    if (!username) {
      return NextResponse.json(
        { message: "Nama Pengguna wajib diisi." },
        { status: 400 }
      );
    }

    if (username.length < 2) {
      return NextResponse.json(
        { message: "Nama Pengguna minimal 2 karakter." },
        { status: 400 }
      );
    }

    if (!pin) {
      return NextResponse.json(
        { message: "PIN 4-6 angka wajib diisi." },
        { status: 400 }
      );
    }

    if (!/^\d{4,6}$/.test(pin)) {
      return NextResponse.json(
        { message: "PIN harus berupa 4 sampai 6 digit angka." },
        { status: 400 }
      );
    }

    // Cek apakah username sudah dipakai
    const existing = await findUserByUsername(username);
    if (existing) {
      return NextResponse.json(
        {
          message:
            "Nama Pengguna ini sudah terdaftar. Silakan pilih nama lain atau langsung Masuk.",
        },
        { status: 400 }
      );
    }

    const newUser = await registerUser({ username, pin });

    // Baca vault lama dari cookie jika ada
    const cookieHeader = request.headers.get("cookie") || "";
    let vault: Record<string, StoredUser> = {};
    const match = cookieHeader.match(/dna_vault=([^;]+)/);
    if (match) {
      try {
        vault = JSON.parse(decodeURIComponent(match[1]));
      } catch {}
    }
    vault[newUser.username.toLowerCase()] = newUser;

    const response = NextResponse.json(
      {
        success: true,
        message: "Akun berhasil dibuat.",
        user: {
          id: newUser.id,
          name: newUser.name,
          username: newUser.username,
        },
      },
      { status: 201 }
    );

    // Pasang vault cookie yang aman di browser pengguna (masa aktif 1 tahun)
    response.cookies.set("dna_vault", encodeURIComponent(JSON.stringify(vault)), {
      path: "/",
      maxAge: 365 * 24 * 60 * 60,
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return response;
  } catch (error) {
    console.error("Register Error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan server saat mendaftar." },
      { status: 500 }
    );
  }
}