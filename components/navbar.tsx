"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Image from "next/image";

import LanguageSwitcher from "@/components/shared/language-switcher";
import { useLanguage } from "@/components/shared/language-provider";

import {
  Search,
  Bell,
  Settings,
  Sparkles,
  Menu,
  Check,
  Trash2,
  X,
} from "lucide-react";

import {
  getNotifications,
  subscribeToNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  clearAllNotifications,
  type AppNotification,
} from "@/components/notifications/notification-store";

interface HeaderProps {
  mobileMenu: boolean;
  setMobileMenu: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function Header({
  mobileMenu,
  setMobileMenu,
}: HeaderProps) {
  const router = useRouter();

  const { t, locale } = useLanguage();

  const { data: session } = useSession();

  // ================================
  // PROFILE
  // ================================

  const [profileImage, setProfileImage] = useState<string | null>(
    session?.user?.image ?? null
  );

  // ================================
  // SEARCH
  // ================================

  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  // ================================
  // NOTIFICATION
  // ================================

  const [notifications, setNotifications] = useState<
    AppNotification[]
  >([]);

  const [notificationOpen, setNotificationOpen] = useState(false);

  const [selectedNotification, setSelectedNotification] =
    useState<AppNotification | null>(null);

  // ================================
  // LOAD PROFILE IMAGE
  // ================================

  useEffect(() => {
    async function loadProfileImage() {
      try {
        const response = await fetch("/api/profile");

        if (!response.ok) {
          return;
        }

        const data = await response.json();

        if (data.image) {
          setProfileImage(data.image);
        }
      } catch (error) {
        console.error(
          "Failed to load profile image:",
          error
        );
      }
    }

    loadProfileImage();
  }, []);

  // ================================
  // LOAD NOTIFICATIONS
  // ================================

  useEffect(() => {
    function loadNotifications() {
      setNotifications(getNotifications());
    }

    loadNotifications();

    const unsubscribe = subscribeToNotifications(
      loadNotifications
    );

    return unsubscribe;
  }, []);

  // ================================
  // DATE
  // ================================

  const today = new Date().toLocaleDateString(
    locale === "id" ? "id-ID" : "en-US",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  );

  // ================================
  // SEARCH MENU
  // ================================

  const menus = [
    {
      name: locale === "id" ? "Dasbor" : "Dashboard",
      path: "/dashboard",
    },
    {
      name: locale === "id" ? "Asisten AI" : "AI Debugger",
      path: "/ai-debugger",
    },
    {
      name: locale === "id" ? "Prompt Gambar" : "Image Prompt",
      path: "/image-prompt",
    },
    {
      name: locale === "id" ? "Desain AI" : "AI Design",
      path: "/ai-design",
    },
    {
      name: locale === "id" ? "Animasi AI" : "AI Animation",
      path: "/ai-animation",
    },
    {
      name: locale === "id" ? "Riwayat" : "History",
      path: "/history",
    },
    {
      name: locale === "id" ? "Pengaturan" : "Settings",
      path: "/settings",
    },
  ];

  const searchResults = menus.filter((item) =>
    item.name
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  // ================================
  // UNREAD COUNT
  // ================================

  const unreadCount = notifications.filter(
    (notification) => !notification.read
  ).length;

  // ================================
  // NOTIFICATION HANDLERS
  // ================================

  function handleNotificationClick(
    notification: AppNotification
  ) {
    markNotificationAsRead(notification.id);

    setSelectedNotification(notification);
  }

  function handleMarkAllAsRead() {
    markAllNotificationsAsRead();
  }

  function handleDeleteNotification(id: string) {
    deleteNotification(id);

    if (selectedNotification?.id === id) {
      setSelectedNotification(null);
    }
  }

  function handleClearAllNotifications() {
    clearAllNotifications();
    setSelectedNotification(null);
  }

  // ================================
  // FORMAT TIME
  // ================================

  function formatNotificationTime(timestamp: number) {
    const date = new Date(timestamp);

    return date.toLocaleString(
      locale === "id" ? "id-ID" : "en-US",
      {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  }

  // ================================
  // RENDER
  // ================================

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-[#0F172A]/90 backdrop-blur">
      <div className="flex h-14 items-center justify-between gap-3 px-3 lg:h-20 lg:px-8">

        {/* =========================================
            LEFT SIDE
        ========================================== */}

        <div className="flex min-w-0 shrink-0 items-center gap-2">

          {/* MOBILE MENU */}

          <button
            type="button"
            onClick={() => setMobileMenu(!mobileMenu)}
            className="rounded-xl bg-slate-900 p-2 transition hover:bg-slate-800 lg:hidden"
            aria-label={
              locale === "id"
                ? "Buka menu"
                : "Open menu"
            }
          >
            <Menu size={22} />
          </button>

          <div className="min-w-0">

            <p className="hidden truncate text-xs text-slate-400 lg:block lg:text-sm">
              {today}
            </p>

            <h1 className="mt-1 truncate text-lg font-bold text-white lg:text-2xl">
              DNA AI Platform
            </h1>

          </div>

        </div>

        {/* =========================================
            RIGHT SIDE
        ========================================== */}

        <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5 lg:gap-4">

          {/* =====================================
              SEARCH
          ====================================== */}

          <div className="relative hidden min-w-0 lg:block">

            <div className="flex h-11 w-64 items-center gap-3 rounded-xl border border-slate-700 bg-slate-900 px-4 xl:w-80">

              <Search
                size={18}
                className="shrink-0 text-slate-500"
              />

              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                placeholder={t.search}
                className="w-full min-w-0 bg-transparent text-white outline-none"
              />

            </div>

            {open && search && (
              <div className="absolute left-0 top-14 z-50 w-80 overflow-hidden rounded-xl border border-slate-700 bg-[#0F172A] p-2 shadow-2xl">

                {searchResults.length > 0 ? (
                  searchResults.map((item) => (
                    <button
                      type="button"
                      key={item.path}
                      onClick={() => {
                        router.push(item.path);
                        setSearch("");
                        setOpen(false);
                      }}
                      className="w-full rounded-lg px-4 py-3 text-left text-white transition hover:bg-slate-800"
                    >
                      {item.name}
                    </button>
                  ))
                ) : (
                  <p className="px-4 py-3 text-sm text-slate-500">
                    {locale === "id"
                      ? "Menu tidak ditemukan."
                      : "Menu not found."}
                  </p>
                )}

              </div>
            )}

          </div>

          {/* =====================================
              LANGUAGE SWITCHER
          ====================================== */}

          <div className="flex shrink-0 items-center">
            <LanguageSwitcher />
          </div>

          {/* =====================================
              NOTIFICATION BUTTON
          ====================================== */}

          <div className="relative shrink-0">

            <button
              type="button"
              onClick={() => {
                setNotificationOpen(
                  (current) => !current
                );

                setOpen(false);
              }}
              className="relative rounded-lg bg-slate-900 p-2.5 transition hover:bg-slate-800 lg:rounded-xl lg:p-3"
              aria-label={
                locale === "id"
                  ? "Notifikasi"
                  : "Notifications"
              }
            >
              <Bell size={20} />

              {/* UNREAD BADGE */}

              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-lg">
                  {unreadCount > 99
                    ? "99+"
                    : unreadCount}
                </span>
              )}

            </button>

            {/* =================================
                NOTIFICATION PANEL
            ================================== */}

            {notificationOpen && (
              <div className="absolute right-0 top-14 z-50 w-[350px] overflow-hidden rounded-2xl border border-slate-700 bg-[#0F172A] shadow-2xl sm:w-[400px]">

                {/* PANEL HEADER */}

                <div className="flex items-center justify-between border-b border-slate-800 px-4 py-4">

                  <div>

                    <h2 className="font-semibold text-white">
                      {locale === "id"
                        ? "Notifikasi"
                        : "Notifications"}
                    </h2>

                    <p className="mt-1 text-xs text-slate-500">
                      {notifications.length}{" "}
                      {locale === "id"
                        ? "notifikasi"
                        : "notifications"}
                    </p>

                  </div>

                  <div className="flex items-center gap-1">

                    {/* MARK ALL READ */}

                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={
                          handleMarkAllAsRead
                        }
                        title={
                          locale === "id"
                            ? "Tandai semua sudah dibaca"
                            : "Mark all as read"
                        }
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-cyan-400"
                      >
                        <Check size={17} />
                      </button>
                    )}

                    {/* CLEAR ALL */}

                    {notifications.length > 0 && (
                      <button
                        type="button"
                        onClick={
                          handleClearAllNotifications
                        }
                        title={
                          locale === "id"
                            ? "Hapus semua"
                            : "Clear all"
                        }
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-red-400"
                      >
                        <Trash2 size={17} />
                      </button>
                    )}

                  </div>

                </div>

                {/* =================================
                    NOTIFICATION LIST
                ================================== */}

                <div className="max-h-[420px] overflow-y-auto">

                  {notifications.length === 0 ? (

                    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">

                      <Bell
                        size={42}
                        className="mb-4 text-slate-700"
                      />

                      <p className="font-medium text-slate-300">
                        {locale === "id"
                          ? "Belum ada notifikasi"
                          : "No notifications yet"}
                      </p>

                      <p className="mt-2 text-xs leading-5 text-slate-500">
                        {locale === "id"
                          ? "Notifikasi dari fitur AI akan muncul di sini."
                          : "Notifications from AI features will appear here."}
                      </p>

                    </div>

                  ) : (

                    notifications.map(
                      (notification) => (

                        <div
                          key={notification.id}
                          className={`group relative border-b border-slate-800 transition hover:bg-slate-800/60 ${
                            !notification.read
                              ? "bg-slate-800/30"
                              : ""
                          }`}
                        >

                          {/* NOTIFICATION CONTENT */}

                          <button
                            type="button"
                            onClick={() =>
                              handleNotificationClick(
                                notification
                              )
                            }
                            className="w-full px-4 py-4 pr-12 text-left"
                          >

                            <div className="flex gap-3">

                              {/* STATUS DOT */}

                              <div
                                className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                                  notification.type ===
                                  "success"
                                    ? "bg-emerald-400"
                                    : notification.type ===
                                      "error"
                                    ? "bg-red-400"
                                    : "bg-cyan-400"
                                }`}
                              />

                              <div className="min-w-0 flex-1">

                                <div className="flex items-start justify-between gap-2">

                                  <p className="text-sm font-semibold text-white">
                                    {notification.title}
                                  </p>

                                  {!notification.read && (
                                    <span className="shrink-0 text-[10px] font-medium text-cyan-400">
                                      NEW
                                    </span>
                                  )}

                                </div>

                                {/* FEATURE */}

                                <p className="mt-1 text-xs font-medium text-cyan-400">
                                  {notification.feature}
                                </p>

                                {/* MESSAGE */}

                                <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-400">
                                  {notification.message}
                                </p>

                                {/* TIME */}

                                <p className="mt-2 text-[10px] text-slate-600">
                                  {formatNotificationTime(
                                    notification.createdAt
                                  )}
                                </p>

                              </div>

                            </div>

                          </button>

                          {/* DELETE BUTTON */}

                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteNotification(
                                notification.id
                              )
                            }
                            className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-lg p-2 text-slate-600 transition hover:bg-slate-700 hover:text-red-400 group-hover:block"
                            title={
                              locale === "id"
                                ? "Hapus"
                                : "Delete"
                            }
                            aria-label={
                              locale === "id"
                                ? "Hapus notifikasi"
                                : "Delete notification"
                            }
                          >
                            <X size={15} />
                          </button>

                        </div>

                      )
                    )

                  )}

                </div>

              </div>
            )}

          </div>

          {/* =====================================
              SETTINGS
          ====================================== */}

          <button
            type="button"
            onClick={() => router.push("/settings")}
            className="hidden shrink-0 rounded-xl bg-slate-900 p-3 transition hover:bg-slate-800 lg:block"
            title={
              locale === "id"
                ? "Pengaturan"
                : "Settings"
            }
            aria-label={
              locale === "id"
                ? "Pengaturan"
                : "Settings"
            }
          >
            <Settings size={20} />
          </button>

          {/* =====================================
              GEMINI
          ====================================== */}

          <button
            type="button"
            className="hidden shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 font-semibold lg:flex"
          >
            <Sparkles size={18} />
            {t.geminiReady}
          </button>

          {/* =====================================
              PROFILE
          ====================================== */}

          <div className="flex shrink-0 items-center gap-3">

            <div className="hidden text-right lg:block">

              <p className="text-sm font-semibold text-white">
                {session?.user?.name ?? "User"}
              </p>

              <p className="text-xs text-cyan-400">
                {t.user}
              </p>

              <button
                type="button"
                onClick={() =>
                  signOut({
                    callbackUrl: "/login",
                  })
                }
                className="text-xs text-red-400 transition hover:text-red-300"
              >
                {t.logout}
              </button>

            </div>

            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-base font-bold lg:h-12 lg:w-12 lg:text-lg">

              {profileImage ? (

                <Image
                  src={profileImage}
                  alt="Profile"
                  width={48}
                  height={48}
                  className="h-full w-full object-cover"
                />

              ) : (

                session?.user?.name?.charAt(0) ?? "U"

              )}

            </div>

          </div>

        </div>

      </div>

      {/* =========================================
          NOTIFICATION RESULT MODAL
      ========================================== */}

      {selectedNotification && (

        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() =>
            setSelectedNotification(null)
          }
        >

          <div
            className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-700 bg-[#0F172A] shadow-2xl"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            {/* MODAL HEADER */}

            <div className="flex items-start justify-between border-b border-slate-800 px-5 py-4">

              <div>

                <p className="text-xs font-medium text-cyan-400">
                  {selectedNotification.feature}
                </p>

                <h2 className="mt-1 text-lg font-bold text-white">
                  {selectedNotification.title}
                </h2>

                <p className="mt-1 text-[10px] text-slate-600">
                  {formatNotificationTime(
                    selectedNotification.createdAt
                  )}
                </p>

              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedNotification(null)
                }
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
                aria-label={
                  locale === "id"
                    ? "Tutup"
                    : "Close"
                }
              >
                <X size={20} />
              </button>

            </div>

            {/* MODAL CONTENT */}

            <div className="max-h-[65vh] overflow-y-auto p-5">

              <p className="mb-4 text-sm text-slate-400">
                {selectedNotification.message}
              </p>

              {selectedNotification.result ? (

                <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">

                  <pre className="whitespace-pre-wrap break-words font-mono text-sm leading-7 text-slate-300">
                    {selectedNotification.result}
                  </pre>

                </div>

              ) : (

                <p className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-500">
                  {locale === "id"
                    ? "Notifikasi ini tidak memiliki hasil yang dapat ditampilkan."
                    : "This notification has no result to display."}
                </p>

              )}

            </div>

            {/* MODAL FOOTER */}

            <div className="flex justify-end border-t border-slate-800 px-5 py-3">

              <button
                type="button"
                onClick={() =>
                  setSelectedNotification(null)
                }
                className="rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-cyan-600"
              >
                {locale === "id"
                  ? "Tutup"
                  : "Close"}
              </button>

            </div>

          </div>

        </div>

      )}

    </header>
  );
}