"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Search,
  Copy,
  Check,
  ArrowRight,
  Palette,
  Code2,
  Clapperboard,
  Gamepad2,
  Flame,
  Star,
  ExternalLink,
  Layers,
  Filter,
} from "lucide-react";
import { useLanguage } from "@/components/shared/language-provider";

type ShowcaseTarget = "ai-design" | "ai-code" | "ai-animation";

type ShowcaseItem = {
  id: string;
  titleId: string;
  titleEn: string;
  category: "design" | "code" | "animation";
  targetRoute: ShowcaseTarget;
  targetCategory?: string; // e.g. "game" or "web" for ai-code
  badge: string;
  tags: string[];
  gradient: string;
  icon: any;
  prompt: string;
  previewSnippet?: string;
  descId: string;
  descEn: string;
  featured?: boolean;
};

const SHOWCASE_ITEMS: ShowcaseItem[] = [
  // AI DESIGN
  {
    id: "design-billboard",
    titleId: "Billboard Komersial 3D Times Square",
    titleEn: "3D Commercial Billboard Times Square",
    category: "design",
    targetRoute: "ai-design",
    badge: "AI Design",
    tags: ["Billboard", "Commercial", "3D", "Urban"],
    gradient: "from-amber-500/20 via-orange-600/10 to-purple-600/20",
    icon: Palette,
    featured: true,
    descId: "Mockup billboard anamorfik megah di pusat metropolitan saat golden hour.",
    descEn: "Colossal anamorphic billboard mockup in a metropolitan hub at golden hour.",
    prompt:
      "A magnificent, ultra-photorealistic commercial billboard mockup dominates the frame, situated atop a skyscraper in Times Square at radiant golden hour. Brushed steel frame, crisp reflections on glass, architectural photorealism, volumetric lighting, 8K UHD.",
  },
  {
    id: "design-coffee",
    titleId: "Poster Iklan Kopi Kekinian Estetik",
    titleEn: "Modern Aesthetic Specialty Coffee Poster",
    category: "design",
    targetRoute: "ai-design",
    badge: "AI Design",
    tags: ["Poster", "Coffee", "Minimalist", "Culinary"],
    gradient: "from-amber-600/20 via-yellow-600/10 to-stone-800/40",
    icon: Palette,
    featured: true,
    descId: "Poster promosi kopi cold brew dengan pencahayaan hangat dan layout bersih.",
    descEn: "Specialty cold brew coffee poster with warm studio backlight and negative space.",
    prompt:
      "Modern minimalist specialty coffee advertising poster, glass cold brew bottle with condensation droplets, rustic wood counter, warm morning sunlight streaming through window, elegant negative space for typography, studio lighting, 8K resolution.",
  },
  {
    id: "design-game-keyart",
    titleId: "Keyframe Karakter Game RPG Sinematik",
    titleEn: "Cinematic RPG Character Key Art",
    category: "design",
    targetRoute: "ai-design",
    badge: "AI Design",
    tags: ["Gaming", "Fantasy", "Cinematic", "Unreal Engine"],
    gradient: "from-purple-600/20 via-indigo-600/10 to-pink-600/20",
    icon: Palette,
    descId: "Seni kunci prajurit mitologi di atas tebing berkabut berlatar langit kosmik.",
    descEn: "Epic mythological warrior standing on a misty cliff against a cosmic starry sky.",
    prompt:
      "Cinematic widescreen keyframe of a powerful armored warrior with glowing runes overlooking a misty mountain valley at twilight, deep purple and cyan cosmic stars in the sky, Unreal Engine 5 render, dramatic rim lighting, 8K resolution, award-winning concept art.",
  },
  {
    id: "design-burger",
    titleId: "Poster Makanan Burger Gourmet Menggugah Selera",
    titleEn: "Gourmet Smash Burger Commercial Poster",
    category: "design",
    targetRoute: "ai-design",
    badge: "AI Design",
    tags: ["Food", "Burger", "Commercial", "Macro"],
    gradient: "from-red-600/20 via-amber-600/10 to-orange-600/20",
    icon: Palette,
    descId: "Foto kuliner makro burger dengan keju meleleh, saus berkilau, dan asap tipis.",
    descEn: "Appetizing commercial food photography of a juicy double gourmet smash burger.",
    prompt:
      "Commercial culinary poster for a gourmet double cheeseburger, melted sharp cheddar dripping, crisp caramelized beef edges, glistening sesame bun, soft smoke wisps, dark chalkboard studio background, 85mm macro lens, mouthwatering lighting.",
  },

  // AI CODE
  {
    id: "code-analytics-dashboard",
    titleId: "Dashboard SaaS Analitik Bisnis Real-Time",
    titleEn: "Real-Time SaaS Business Analytics Dashboard",
    category: "code",
    targetRoute: "ai-code",
    targetCategory: "web",
    badge: "AI Code",
    tags: ["Web", "Dashboard", "SaaS", "Analytics", "Tailwind"],
    gradient: "from-cyan-600/20 via-blue-600/10 to-purple-600/20",
    icon: Code2,
    featured: true,
    descId: "Dashboard analitik modern lengkap dengan metrik KPI, grafik performa dinamis, dan filter data.",
    descEn: "Modern fullstack analytics dashboard with real-time KPI metrics, charts, and date filters.",
    prompt:
      "Buatkan aplikasi web Single-Page SaaS Business Analytics Dashboard modern bertema dark obsidian: ada kartu metrik KPI (Total Revenue, Active Users, Conversion Rate, Churn Rate), grafik visual dinamis dengan HTML5 Canvas, filter rentang tanggal dan status, tabel transaksi real-time dengan status badge dan pencarian live, serta penyimpanan data di localStorage.",
  },
  {
    id: "code-cyberpunk-portfolio",
    titleId: "Website Portofolio Dark Cyberpunk",
    titleEn: "Dark Cyberpunk Developer Portfolio Web",
    category: "code",
    targetRoute: "ai-code",
    targetCategory: "web",
    badge: "AI Code",
    tags: ["Web", "Portfolio", "Cyberpunk", "Responsive"],
    gradient: "from-purple-600/20 via-pink-600/10 to-cyan-600/20",
    icon: Code2,
    featured: true,
    descId: "Landing page portofolio developer modern bertema gelap futuristik dengan efek neon.",
    descEn: "Modern futuristic dark developer portfolio landing page with neon glow accents.",
    prompt:
      "Buatkan website landing page portofolio developer bertema dark cyberpunk modern: ada navbar fixed dengan efek blur, hero section dengan judul animasi glow neon dan tombol kontak, grid kartu showcase proyek dengan badge teknologi, serta form kontak yang rapi dan responsif.",
  },
  {
    id: "code-todo-app",
    titleId: "Aplikasi To-Do List Interaktif Modern",
    titleEn: "Modern Interactive Task Manager App",
    category: "code",
    targetRoute: "ai-code",
    targetCategory: "web",
    badge: "AI Code",
    tags: ["Web", "App", "Productivity", "LocalStorage"],
    gradient: "from-emerald-600/20 via-teal-600/10 to-slate-800/40",
    icon: Code2,
    descId: "Web app manajemen tugas lengkap dengan kategori, filter status, dan simpan lokal.",
    descEn: "Complete task management web app with categories, filters, and local persistence.",
    prompt:
      "Buatkan aplikasi To-Do List web modern: bisa tambah, edit, hapus, dan tandai tugas selesai, ada filter kategori (Semua, Kerja, Pribadi), badge prioritas (Tinggi, Sedang, Rendah), penyimpanan otomatis di localStorage, dan tampilan clean dark mode.",
  },
  {
    id: "code-compound-calc",
    titleId: "Kalkulator Investasi Bunga Majemuk",
    titleEn: "Compound Interest Investment Calculator",
    category: "code",
    targetRoute: "ai-code",
    targetCategory: "web",
    badge: "AI Code",
    tags: ["Web", "Calculator", "Finance", "Tool"],
    gradient: "from-blue-600/20 via-indigo-600/10 to-violet-600/20",
    icon: Code2,
    descId: "Kalkulator finansial untuk menghitung pertumbuhan investasi tabungan dengan tabel.",
    descEn: "Financial calculator calculating investment compound growth with forecast table.",
    prompt:
      "Buatkan kalkulator investasi bunga majemuk (compound interest calculator) interaktif: input modal awal, setoran bulanan, bunga per tahun, dan jangka waktu tahun. Tampilkan total modal, total bunga yang didapat, dan tabel pertumbuhan dari tahun ke tahun.",
  },

  // AI DESIGN - PRODUCT STAGING
  {
    id: "studio-perfume-marble",
    titleId: "Staging Parfum di Podium Marmer Mewah",
    titleEn: "Luxury Perfume on Marble Podium",
    category: "design",
    targetRoute: "ai-design",
    badge: "AI Design",
    tags: ["Studio", "Cosmetic", "Luxury", "Marble"],
    gradient: "from-pink-600/20 via-purple-600/10 to-slate-800/40",
    icon: Palette,
    featured: true,
    descId: "Menata produk botol parfum ke atas marmer putih dengan pencahayaan mewah.",
    descEn: "Stage perfume bottle on polished white Carrara marble with studio reflections.",
    prompt:
      "Commercial product staging: place the product bottle elegantly on a polished white Carrara marble podium with gold veins, soft studio key light and gentle bounce fill, high-end luxury cosmetic photoshoot, 85mm macro lens, 8K UHD.",
  },
  {
    id: "studio-sneaker-stone",
    titleId: "Sneakers di Bebatuan Sungai & Cipratan Air",
    titleEn: "Sneakers on River Stone & Water Splash",
    category: "design",
    targetRoute: "ai-design",
    badge: "AI Design",
    tags: ["Studio", "Footwear", "Nature", "Water"],
    gradient: "from-blue-600/20 via-cyan-600/10 to-emerald-600/20",
    icon: Palette,
    descId: "Menempatkan sepatu ke atas batu alam gelap dengan tetesan air segar alami.",
    descEn: "Display sneakers on dark wet river stones with fresh natural water droplets.",
    prompt:
      "Commercial footwear staging: place the sneaker on dark wet river basalt stones, fresh morning mist, crystal clear water splash droplets, subtle green moss accents, dynamic natural outdoor lighting, 8K sharp detail.",
  },

  // AI ANIMATION
  {
    id: "anim-nebula",
    titleId: "Pusaran Nebula Kosmik Luar Angkasa",
    titleEn: "Cosmic Celestial Galaxy Nebula Spin",
    category: "animation",
    targetRoute: "ai-animation",
    badge: "AI Animation",
    tags: ["Animation", "Space", "Cosmic", "Hypnotic"],
    gradient: "from-indigo-600/20 via-purple-600/10 to-pink-600/20",
    icon: Clapperboard,
    descId: "Ide motion kosmik pusaran debu bintang ungu bercahaya di galaksi jauh.",
    descEn: "Slow hypnotic spin of a glowing purple galaxy nebula with twinkling stars.",
    prompt:
      "A cinematic, slow-motion rotation of a vast celestial nebula galaxy in deep space, swirling purple and electric blue interstellar dust clouds, glittering stars softly twinkling, volumetric cosmic lighting, 4K resolution, cinematic motion.",
  },
  {
    id: "anim-cyberpunk-drift",
    titleId: "Mobil Balap Futuristik Menembus Hujan Malam",
    titleEn: "Futuristic Supercar in Rainy Neon City",
    category: "animation",
    targetRoute: "ai-animation",
    badge: "AI Animation",
    tags: ["Animation", "Cyberpunk", "Car", "Night"],
    gradient: "from-fuchsia-600/20 via-purple-600/10 to-cyan-600/20",
    icon: Clapperboard,
    descId: "Adegan mobil sport meluncur kencang di jalanan beraspal basah kota neon.",
    descEn: "Futuristic sports car speeding across wet asphalt in a rainy neon metropolis.",
    prompt:
      "Cinematic motion shot of a sleek futuristic sports car speeding along rain-slicked asphalt in a neon-drenched cyberpunk metropolis at night, neon reflections on the puddles, taillight light trails, volumetric rain mist, 8K resolution.",
  },
];

export default function ShowcasePage() {
  const { locale } = useLanguage();
  const isEn = locale === "en";
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"all" | "design" | "code" | "studio" | "animation">("all");
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Extract all unique tags
  const allTags = useMemo(() => {
    const set = new Set<string>();
    SHOWCASE_ITEMS.forEach((item) => item.tags.forEach((t) => set.add(t)));
    return Array.from(set);
  }, []);

  // Filtered items
  const filteredItems = useMemo(() => {
    return SHOWCASE_ITEMS.filter((item) => {
      const matchTab = activeTab === "all" || item.category === activeTab;
      const matchTag = selectedTag === "all" || item.tags.includes(selectedTag);
      const query = search.toLowerCase().trim();
      const matchSearch =
        !query ||
        item.titleId.toLowerCase().includes(query) ||
        item.titleEn.toLowerCase().includes(query) ||
        item.prompt.toLowerCase().includes(query) ||
        item.tags.some((t) => t.toLowerCase().includes(query));

      return matchTab && matchTag && matchSearch;
    });
  }, [activeTab, selectedTag, search]);

  function handleCopyPrompt(item: ShowcaseItem, e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard.writeText(item.prompt);
    setCopiedId(item.id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  }

  function handleUsePrompt(item: ShowcaseItem) {
    try {
      sessionStorage.setItem("showcase_prompt", item.prompt);
      if (item.targetCategory) {
        sessionStorage.setItem("showcase_category", item.targetCategory);
      }
    } catch {}

    router.push(`/${item.targetRoute}`);
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-1.5 text-xs font-semibold text-purple-300">
            <Sparkles className="h-3.5 w-3.5 text-purple-400" />
            <span>{isEn ? "Prompt Inspiration Hub" : "Galeri Inspirasi & Preset 1-Klik"}</span>
          </div>

          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
            {isEn ? "Discover & Remix Great Prompts" : "Jelajahi & Gunakan Prompt Terbaik"}
          </h1>

          <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-400 sm:text-base">
            {isEn
              ? "Never run out of ideas. Explore curated prompts for AI Design, AI Code, Studio Staging, and Animation with 1-click execution."
              : "Gak perlu bingung mau ketik apa. Temukan kumpulan prompt siap pakai untuk Desain, Coding Game, Studio Foto, dan Animasi dalam 1-klik!"}
          </p>
        </div>

        {/* Search & Filter Bar */}
        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isEn ? "Search prompts, games, billboards, posters..." : "Cari ide game, billboard, poster, website..."}
              className="w-full rounded-xl border border-slate-800 bg-slate-900/80 py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-500 backdrop-blur focus:border-purple-500 focus:outline-none"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap gap-1 rounded-xl border border-slate-800 bg-slate-900/80 p-1">
            {[
              { id: "all", label: isEn ? "All" : "Semua" },
              { id: "design", label: "AI Design" },
              { id: "code", label: "AI Code" },
              { id: "animation", label: "Animation" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setSelectedTag("all");
                }}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  activeTab === tab.id
                    ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Tags Filter */}
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-semibold text-slate-500 mr-1 flex items-center gap-1">
            <Filter className="h-3 w-3" /> Tags:
          </span>
          <button
            onClick={() => setSelectedTag("all")}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${
              selectedTag === "all"
                ? "bg-purple-600 text-white"
                : "border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white"
            }`}
          >
            {isEn ? "All Tags" : "Semua Tag"}
          </button>
          {allTags.slice(0, 8).map((t) => (
            <button
              key={t}
              onClick={() => setSelectedTag(selectedTag === t ? "all" : t)}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${
                selectedTag === t
                  ? "bg-purple-600 text-white shadow-sm"
                  : "border border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-white"
              }`}
            >
              #{t}
            </button>
          ))}
        </div>

        {/* Cards Grid */}
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => {
            const Icon = item.icon;
            const isCopied = copiedId === item.id;

            return (
              <div
                key={item.id}
                className="group flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl backdrop-blur transition hover:border-purple-500/50 hover:bg-slate-900/90"
              >
                <div>
                  {/* Top Bar Card */}
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-purple-500/30 bg-purple-500/10 px-2.5 py-1 text-[11px] font-semibold text-purple-300">
                      <Icon className="h-3 w-3" />
                      {item.badge}
                    </span>

                    {item.featured && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400">
                        <Flame className="h-3 w-3" /> Popular
                      </span>
                    )}
                  </div>

                  {/* Title & Description */}
                  <h3 className="mt-3 text-base font-bold text-white group-hover:text-purple-300 transition">
                    {isEn ? item.titleEn : item.titleId}
                  </h3>

                  <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                    {isEn ? item.descEn : item.descId}
                  </p>

                  {/* Tags */}
                  <div className="mt-3 flex flex-wrap gap-1">
                    {item.tags.map((t) => (
                      <span
                        key={t}
                        className="rounded-md bg-slate-800/80 px-2 py-0.5 text-[10px] text-slate-400"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>

                  {/* Prompt Preview Box */}
                  <div className="mt-4 rounded-xl border border-slate-800/80 bg-slate-950/70 p-3">
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span className="uppercase font-semibold tracking-wider">Prompt:</span>
                      <button
                        onClick={(e) => handleCopyPrompt(item, e)}
                        className="flex items-center gap-1 text-slate-400 hover:text-white transition"
                        title={isEn ? "Copy prompt" : "Salin prompt"}
                      >
                        {isCopied ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-400" />
                            <span className="text-emerald-400">{isEn ? "Copied" : "Tersalin"}</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>{isEn ? "Copy" : "Salin"}</span>
                          </>
                        )}
                      </button>
                    </div>

                    <p className="mt-1.5 text-xs text-slate-300 line-clamp-3 italic">
                      "{item.prompt}"
                    </p>
                  </div>
                </div>

                {/* Bottom Action Button: Gunakan Prompt Ini */}
                <div className="mt-5 pt-3 border-t border-slate-800/80">
                  <button
                    onClick={() => handleUsePrompt(item)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 py-2.5 text-xs font-bold text-white shadow-md shadow-purple-600/20 transition hover:scale-[1.02] active:scale-95"
                  >
                    <span>{isEn ? "Use This Prompt" : "Gunakan Prompt Ini"}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {filteredItems.length === 0 && (
          <div className="mt-12 text-center text-slate-500">
            <Sparkles className="mx-auto h-10 w-10 text-slate-700" />
            <p className="mt-3 text-sm font-medium">{isEn ? "No prompts found" : "Tidak ada prompt yang cocok"}</p>
            <p className="mt-1 text-xs">{isEn ? "Try adjusting your search query." : "Coba kata kunci pencarian yang lain."}</p>
          </div>
        )}
      </div>
    </div>
  );
}
