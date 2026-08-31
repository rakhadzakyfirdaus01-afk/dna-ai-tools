"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function SettingsPage() {
  const router = useRouter();
  const { data: session, update } = useSession();

  const [selectedImage, setSelectedImage] = useState<File | null>(null);

  const [profileImage, setProfileImage] = useState(
    session?.user?.image ?? "/logo-dna.png"
  );

  const [uploading, setUploading] = useState(false);

  const [name, setName] = useState(
    session?.user?.name ?? ""
  );

  const [savingName, setSavingName] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      try {
        const response = await fetch("/api/profile");

        if (!response.ok) return;

        const data = await response.json();

        if (data.image) {
          setProfileImage(data.image);

          await update({
            image: data.image,
          });
        }

        if (data.name) {
          setName(data.name);

          await update({
            name: data.name,
          });
        }
      } catch (error) {
        console.error("Failed to load profile:", error);
      }
    }

    loadProfile();
  }, []);

  async function uploadPhoto() {
    if (!selectedImage) {
      toast.error("Pilih foto terlebih dahulu");
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append("image", selectedImage);

      const response = await fetch("/api/profile", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Upload foto gagal");
      }

      if (data.image) {
        setProfileImage(data.image);

        await update({
          image: data.image,
        });

        setSelectedImage(null);

        toast.success("Foto profil berhasil diperbarui");
      }
    } catch (error) {
      console.error("PROFILE UPLOAD ERROR:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Gagal mengupload foto"
      );
    } finally {
      setUploading(false);
    }
  }

  async function saveName() {
    const trimmedName = name.trim();

    if (!trimmedName) {
      toast.error("Nama tidak boleh kosong");
      return;
    }

    if (trimmedName.length > 50) {
      toast.error("Nama maksimal 50 karakter");
      return;
    }

    try {
      setSavingName(true);

      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: trimmedName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ?? "Gagal memperbarui nama"
        );
      }

      setName(data.name);

      await update({
        name: data.name,
      });

      toast.success("Nama berhasil diperbarui");
    } catch (error) {
      console.error("UPDATE NAME ERROR:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Gagal memperbarui nama"
      );
    } finally {
      setSavingName(false);
    }
  }

  return (
    <div className="min-h-screen bg-background p-8 text-foreground">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          Settings
        </h1>

        <p className="mt-2 text-sm opacity-70">
          Customize your AI workspace.
        </p>
      </div>

      <div className="space-y-6">

        {/* Profile */}
        <section className="rounded-2xl border border-border bg-card p-6">

          <h2 className="mb-6 text-xl font-bold">
            👤 Profile User
          </h2>

          <div className="flex flex-col items-center gap-6 sm:flex-row">

            {/* Profile Image */}
            <Image
              src={profileImage}
              alt="Profile"
              width={100}
              height={100}
              className="h-[100px] w-[100px] rounded-full object-cover"
            />

            {/* User Info */}
            <div className="w-full min-w-0 sm:w-auto">

              <h3 className="text-xl font-semibold">
                {name || "User"}
              </h3>

              <p className="w-full break-all text-sm opacity-70">
                {session?.user?.email}
              </p>

            </div>

          </div>

          {/* Change Name */}
          <div className="mt-6">

            <label
              htmlFor="profile-name"
              className="mb-2 block text-sm font-medium"
            >
              Nama
            </label>

            <div className="flex flex-col gap-3 sm:flex-row">

              <input
                id="profile-name"
                type="text"
                value={name}
                onChange={(e) =>
                  setName(e.target.value)
                }
                maxLength={50}
                placeholder="Masukkan nama"
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-foreground outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
              />

              <button
                type="button"
                onClick={saveName}
                disabled={
                  savingName ||
                  !name.trim()
                }
                className="rounded-xl bg-cyan-500 px-5 py-2.5 font-medium text-white transition hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingName
                  ? "Menyimpan..."
                  : "Simpan Nama"}
              </button>

            </div>

          </div>

          {/* Upload */}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">

            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                setSelectedImage(
                  e.target.files?.[0] ?? null
                );
              }}
              className="text-sm"
            />

            <button
              type="button"
              onClick={uploadPhoto}
              disabled={uploading || !selectedImage}
              className="rounded-xl bg-cyan-500 px-5 py-2 font-medium text-white transition hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {uploading
                ? "Uploading..."
                : "Upload Photo"}
            </button>

          </div>

          {/* Selected file */}
          {selectedImage && (
            <p className="mt-3 text-sm opacity-70">
              File dipilih: {selectedImage.name}
            </p>
          )}

        </section>

        {/* Preferences */}
        <section className="rounded-2xl border border-border bg-card p-6">

          <h2 className="mb-6 text-xl font-bold">
            🔔 Preferences
          </h2>

          <div className="space-y-6">

            <div className="flex items-center justify-between">

              <div>
                <h3 className="font-semibold">
                  Notifications
                </h3>

                <p className="text-sm opacity-70">
                  Enable toast notifications.
                </p>
              </div>

              <input
                type="checkbox"
                defaultChecked
                className="accent-cyan-500"
              />

            </div>

            <div className="flex items-center justify-between">

              <div>
                <h3 className="font-semibold">
                  Animations
                </h3>

                <p className="text-sm opacity-70">
                  Enable interface animations.
                </p>
              </div>

              <input
                type="checkbox"
                defaultChecked
                className="accent-cyan-500"
              />

            </div>

            <div className="flex items-center justify-between">

              <div>
                <h3 className="font-semibold">
                  Auto Save
                </h3>

                <p className="text-sm opacity-70">
                  Automatically save AI history.
                </p>
              </div>

              <input
                type="checkbox"
                defaultChecked
                className="accent-cyan-500"
              />

            </div>

          </div>

        </section>

        {/* Privacy */}
        <section className="rounded-2xl border border-border bg-card p-6">

          <h2 className="mb-6 text-xl font-bold">
            🛡 Privacy
          </h2>

          <p className="text-sm opacity-70">
            Your prompts and generated results are stored securely
            and are only accessible from your account.
          </p>

        </section>

      </div>

      {/* Bottom Buttons */}
      <div className="mt-8 flex justify-end gap-4">

        <button
          onClick={() => router.push("/dashboard")}
          className="rounded-xl border border-cyan-500 px-6 py-3 text-cyan-400 transition hover:bg-cyan-500 hover:text-white"
        >
          Back to Dashboard
        </button>

      </div>

    </div>
  );
}