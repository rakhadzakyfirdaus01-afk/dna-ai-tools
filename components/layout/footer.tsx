import Image from "next/image";
import Link from "next/link";
import {
  MessageCircle,
  Globe,
  Video,
  Send,
} from "lucide-react";

export default function Footer() {
  return (
    <footer className="mt-8 border-t border-border bg-background px-6 py-10 text-foreground transition-colors duration-200 md:px-10">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">

        {/* Company */}
        <div>
          <div className="flex items-center gap-3">
            <Image
              src="/logo-dna.png"
              alt="DNA Advertising"
              width={45}
              height={45}
              className="rounded-xl object-cover"
            />

            <h3 className="text-lg font-bold text-foreground">
              DNA Advertising
            </h3>
          </div>

          <p className="mt-2 text-sm text-foreground/80">
            AI-powered tools for modern advertising.
          </p>
        </div>

        {/* Links */}
        <div>
          <h4 className="mb-3 font-semibold text-foreground">
            Links
          </h4>

          <ul className="space-y-2 text-sm text-foreground/80">
            <li>
              <Link
                href="/ai-assistant"
                className="transition hover:text-cyan-500 dark:hover:text-cyan-400"
              >
                Dashboard
              </Link>
            </li>

            <li>
              <Link
                href="/ai-debugger"
                className="transition hover:text-cyan-500 dark:hover:text-cyan-400"
              >
                AI Tools
              </Link>
            </li>

            <li>
              <Link
                href="/history"
                className="transition hover:text-cyan-500 dark:hover:text-cyan-400"
              >
                History
              </Link>
            </li>

            <li>
              <Link
                href="/settings"
                className="transition hover:text-cyan-500 dark:hover:text-cyan-400"
              >
                Settings
              </Link>
            </li>
          </ul>
        </div>

        {/* Support */}
        <div>
          <h4 className="mb-3 font-semibold text-foreground">
            Support
          </h4>

          <ul className="space-y-2 text-sm text-foreground/80">
            <li>Documentation</li>
            <li>Help Center</li>
            <li>Contact Us</li>
            <li>Privacy Policy</li>
          </ul>
        </div>

        {/* Connect */}
        <div>
          <h4 className="mb-3 font-semibold text-foreground">
            Connect
          </h4>

          <div className="flex gap-3">
            <button
              type="button"
              className="rounded-xl bg-secondary p-3 text-foreground transition hover:bg-cyan-500 hover:text-white"
              aria-label="Message"
            >
              <MessageCircle size={18} />
            </button>

            <button
              type="button"
              className="rounded-xl bg-secondary p-3 text-foreground transition hover:bg-cyan-500 hover:text-white"
              aria-label="Website"
            >
              <Globe size={18} />
            </button>

            <button
              type="button"
              className="rounded-xl bg-secondary p-3 text-foreground transition hover:bg-cyan-500 hover:text-white"
              aria-label="Send"
            >
              <Send size={18} />
            </button>

            <button
              type="button"
              className="rounded-xl bg-secondary p-3 text-foreground transition hover:bg-cyan-500 hover:text-white"
              aria-label="Video"
            >
              <Video size={18} />
            </button>
          </div>
        </div>

      </div>

      <div className="mt-10 border-t border-border pt-6 text-center text-sm text-foreground/70">
        © {new Date().getFullYear()} DNA Advertising. All rights reserved.
      </div>
    </footer>
  );
}