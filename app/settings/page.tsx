"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const router = useRouter();

  const { data: session, update } = useSession();

  const [selectedImage, setSelectedImage] = useState<File | null>(null);

  const [profileImage, setProfileImage] = useState(
    session?.user?.image ?? "/logo-dna.png"
  );

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
      } catch (error) {
        console.error("Failed to load profile:", error);
      }
    }

    loadProfile();
  }, [update]);

  async function saveSettings() {
    if (!selectedImage) {
      return;
    }

    const formData = new FormData();

    formData.append("image", selectedImage);

    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        console.error(data.message);
        return;
      }

      if (data.image) {
        setProfileImage(data.image);

        await update({
          image: data.image,
        });

        setSelectedImage(null);
      }
    } catch (error) {
      console.error("Failed to update profile:", error);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          Settings
        </h1>

        <p className="text-sm mt-2 opacity-70">
          Customize your AI workspace.
        </p>
      </div>

      <div className="space-y-6">

        {/* Profile */}
        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="text-xl font-bold mb-6">
            👤 Profile User
          </h2>

          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">


            <Image
              src={profileImage}
              alt="Profile"
              width={100}
              height={100}
              className="rounded-full object-cover"
            />

            <div className="w-full min-w-0 sm:w-auto">

              <h3 className="text-xl font-semibold">
                {session?.user?.name ?? "User"}
              </h3>

              <p className="w-full max-w-full break-all text-sm opacity-70">
  {session?.user?.email}
</p>

            </div>
          </div>

          <div className="mt-6">

            <input
              type="file"
              accept="image/*"
              onChange={(e) =>
                setSelectedImage(
                  e.target.files?.[0] ?? null
                )
              }
              className="text-sm"
            />

          </div>
        </section>

        {/* Preferences */}
        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="text-xl font-bold mb-6">
            🔔 Preferences
          </h2>

          <div className="space-y-6">

            <div className="flex justify-between items-center">
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

            <div className="flex justify-between items-center">
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

            <div className="flex justify-between items-center">
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
          <h2 className="text-xl font-bold mb-6">
            🛡 Privacy
          </h2>

          <p className="text-sm opacity-70">
            Your prompts and generated results are stored securely and are only accessible from your account.
          </p>
        </section>

      </div>

      {/* Bottom Buttons */}
      <div className="flex justify-end gap-4 mt-8">

        <button
          onClick={() => router.push("/dashboard")}
          className="rounded-xl border border-cyan-500 px-6 py-3 text-cyan-400 hover:bg-cyan-500 hover:text-white transition"
        >
          Back to Dashboard
        </button>

        <button
          onClick={saveSettings}
          className="rounded-xl bg-cyan-500 px-6 py-3 text-white hover:bg-cyan-600 transition"
        >
          Save Settings
        </button>

      </div>

    </div>
  );
}