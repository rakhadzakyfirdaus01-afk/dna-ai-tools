import { NextResponse } from "next/server";
import { updateUserPin, StoredUser } from "@/lib/user-store";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const username = (body.username || body.name || body.email || "").trim();
    const newPin = String(body.newPin || body.newPassword || body.pin || "").trim();

    if (!username) {
      return NextResponse.json(
        { message: "Nama Pengguna wajib diisi." },
        { status: 400 }
      );
    }

    if (!newPin) {
      return NextResponse.json(
        { message: "PIN baru wajib diisi." },
        { status: 400 }
      );
    }

    if (!/^\d{4,6}$/.test(newPin)) {
      return NextResponse.json(
        { message: "PIN harus berupa 4 sampai 6 digit angka." },
        { status: 400 }
      );
    }

    // Ambil data vault dari cookie jika ada
    const cookieHeader = request.headers.get("cookie") || "";
    let vaultData: string | null = null;
    let vault: Record<string, StoredUser> = {};
    const match = cookieHeader.match(/dna_vault=([^;]+)/);
    if (match) {
      vaultData = match[1];
      try {
        vault = JSON.parse(decodeURIComponent(match[1]));
      } catch {}
    }

    const updatedUser = await updateUserPin({
      username,
      newPin,
      vaultData,
    });

    if (!updatedUser) {
      return NextResponse.json(
        {
          message:
            "Nama Pengguna tidak ditemukan. Silakan periksa kembali atau buat akun baru.",
        },
        { status: 404 }
      );
    }

    // Update vault cookie
    vault[updatedUser.username.toLowerCase()] = updatedUser;

    const response = NextResponse.json(
      {
        success: true,
        message: "PIN berhasil diganti! Kamu sekarang bisa masuk dengan PIN baru.",
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          username: updatedUser.username,
        },
      },
      { status: 200 }
    );

    response.cookies.set("dna_vault", encodeURIComponent(JSON.stringify(vault)), {
      path: "/",
      maxAge: 365 * 24 * 60 * 60,
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return response;
  } catch (error) {
    console.error("Forgot PIN Error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan server saat memperbarui PIN." },
      { status: 500 }
    );
  }
}