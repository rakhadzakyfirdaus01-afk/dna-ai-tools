"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { toast } from "sonner";
import { ProfileAvatar } from "@/components/profile/profile-media";

export default function ProfilePage() {
  const { data: session, update } = useSession();

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [profileImage, setProfileImage] = useState(
    session?.user?.image ?? "/logo-dna.png"
  );
  const [uploading, setUploading] = useState(false);

  async function uploadImage() {
    if (!selectedImage) {
      toast.error("Please select an image or video");
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
        throw new Error(data.message ?? "Upload failed");
      }

      if (data.image) {
        setProfileImage(data.image);

        await update({
          image: data.image,
        });

        setSelectedImage(null);

        toast.success(
          selectedImage.type.startsWith("video/")
            ? "Live Video Profile updated!"
            : "Profile photo updated!"
        );
      }
    } catch (error) {
      console.error("PROFILE UPLOAD ERROR:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to upload profile media"
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-slate-800 bg-[#111827] p-8">
        <h1 className="text-3xl font-bold text-white">
          Profile User
        </h1>

        <p className="mt-2 text-slate-400">
          Manage your account information and live/static profile media.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-[#111827] p-8">
        <div className="flex items-center gap-6">
          <div className="relative h-[100px] w-[100px] rounded-full overflow-hidden border-2 border-cyan-500/50 shadow-md">
            <ProfileAvatar
              src={profileImage}
              alt="Profile"
              size={100}
              className="h-full w-full"
              showLiveBadge={true}
            />
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-white">
              {session?.user?.name ?? "User"}
            </h2>

            <p className="mt-2 text-slate-400">
              {session?.user?.email}
            </p>
          </div>
        </div>

        <div className="mt-6">
          <div className="mb-2">
            <span className="text-xs text-slate-400">
              Supports static photos (JPG/PNG) & TikTok-style LIVE video profiles (MP4/WebM/GIF)
            </span>
          </div>

          <input
            type="file"
            accept="image/*,video/mp4,video/webm,video/quicktime"
            onChange={(e) =>
              setSelectedImage(
                e.target.files?.[0] ?? null
              )
            }
            className="text-sm text-slate-400"
          />

          <button
            onClick={uploadImage}
            disabled={uploading || !selectedImage}
            className="mt-3 rounded-xl bg-cyan-500 px-5 py-2 text-white transition hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploading ? "Uploading..." : "Upload Photo / Video"}
          </button>
        </div>
      </div>
    </div>
  );
}