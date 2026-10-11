export type SlashCommand = {
  command: string;
  label: string;
  description: string;
  category: "planning" | "autonomous" | "reasoning" | "interview" | "research" | "automation" | "memory";
  iconName: string;
  badge: string;
  placeholderPrompt: string;
};

export const ANTIGRAVITY_SLASH_COMMANDS: SlashCommand[] = [
  {
    command: "/plan",
    label: "Plan Mode",
    description: "Buat rencana arsitektur step-by-step, analisa risiko, dan checklist implementasi",
    category: "planning",
    iconName: "Compass",
    badge: "Arsitektur & Checklist",
    placeholderPrompt: "/plan Rancang sistem kasir online berbasis Next.js dan PostgreSQL",
  },
  {
    command: "/goal",
    label: "Autonomous Goal",
    description: "Mode mandiri ekstra teliti yang menyelesaikan target tugas secara komprehensif sampai tuntas",
    category: "autonomous",
    iconName: "Target",
    badge: "Otonom & Tuntas",
    placeholderPrompt: "/goal Buat fitur autentikasi multi-tenant lengkap dengan unit test dan audit log",
  },
  {
    command: "/boost",
    label: "Deep Thinking",
    description: "Penalaran multi-perspektif mendalam dengan validasi arsitektur, kode, dan keamanan",
    category: "reasoning",
    iconName: "BrainCircuit",
    badge: "Extended Thinking",
    placeholderPrompt: "/boost Analisis bottleneck performa query database dan rancang strategi caching",
  },
  {
    command: "/grill-me",
    label: "Interactive Interview",
    description: "AI mewawancarai Anda dengan pertanyaan terarah dan opsi pilihan untuk membedah kebutuhan",
    category: "interview",
    iconName: "HelpCircle",
    badge: "Wawancara Interaktif",
    placeholderPrompt: "/grill-me Tanyakan saya kebutuhan fitur untuk aplikasi e-commerce toko baju",
  },
  {
    command: "/browser",
    label: "Web Research",
    description: "Riset internet langsung secara real-time dengan verifikasi sumber dan referensi terkini",
    category: "research",
    iconName: "Globe",
    badge: "Live Grounding",
    placeholderPrompt: "/browser Apa update fitur terbaru React 19 dan Next.js 16 tahun ini?",
  },
  {
    command: "/schedule",
    label: "Automation & Cron",
    description: "Rancang jadwal otomatisasi tugas berulang (cron 5-field) dan skrip background execution",
    category: "automation",
    iconName: "Clock",
    badge: "Otomasi & Timer",
    placeholderPrompt: "/schedule Jadwalkan backup database setiap hari Minggu jam 02:00 pagi",
  },
  {
    command: "/learn",
    label: "Memory & Rules",
    description: "Simpan aturan coding, gaya penulisan, atau pedoman preferensi ke dalam memori agen",
    category: "memory",
    iconName: "BookOpen",
    badge: "Simpan ke Memori",
    placeholderPrompt: "/learn Selalu gunakan TypeScript strict mode dan Tailwind CSS versi 4",
  },
];
