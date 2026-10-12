export type SubagentRole = "architect" | "coder" | "qa" | "security" | "browser";

export type SubtaskStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "failed"
  | "blocked"
  | "cancelled"
  | "skipped";

export interface SubtaskPlan {
  id: string;
  title: string;
  description: string;
  subagentRole: SubagentRole;
  dependencies: string[]; // Daftar ID subtask prasyarat
  successCriteria: string[]; // Kriteria terukur untuk validasi
  status: SubtaskStatus;
  targetFiles?: string[]; // Berkas yang akan disentuh (untuk deteksi konflik)
  inputContext?: Record<string, any>;
  outputEvidence?: {
    summary: string;
    filesAffected?: string[];
    testsRun?: string[];
    verificationPassed?: boolean;
    artifacts?: string[];
    error?: string;
  };
  startedAt?: number;
  completedAt?: number;
}

export interface TaskPlanDAG {
  planId: string;
  goal: string;
  isSimpleTask: boolean;
  subtasks: SubtaskPlan[];
  totalSubtasks: number;
}

export class TaskPlanner {
  /**
   * Menentukan apakah instruksi tugas tergolong sederhana
   * (hanya pertanyaan info, pembacaan berkas tunggal, atau status read-only)
   */
  public static isSimpleTask(goal: string): boolean {
    const lower = goal.toLowerCase().trim();

    // Pertanyaan singkat atau read-only murni
    const simplePatterns = [
      /^baca file\s+/i,
      /^read file\s+/i,
      /^cek status\s+/i,
      /^git status/i,
      /^versi\s+/i,
      /^siapa kamu/i,
      /^apa itu\s+/i,
      /^jelaskan\s+/i,
      /^list\s+/i,
    ];

    if (goal.length < 50 && simplePatterns.some((p) => p.test(lower))) {
      return true;
    }

    // Jika membutuhkan perbaikan kode, pembuatan fitur, atau verifikasi browser
    const complexKeywords = [
      "buat", "create", "implement", "tambahkan", "add", "refactor",
      "perbaiki", "fix", "debug", "audit", "test", "uji", "browser",
      "otomasi", "verifikasi", "hardening", "upgrade", "deploy"
    ];

    const hasComplexKeyword = complexKeywords.some((k) => lower.includes(k));
    return !hasComplexKeyword && goal.length < 60;
  }

  /**
   * Validasi siklus dependensi (Cycle Detection menggunakan Algoritma Kahn)
   */
  public static validateNoCycles(subtasks: SubtaskPlan[]): { valid: boolean; cyclePath?: string[] } {
    const taskMap = new Map<string, SubtaskPlan>();
    const inDegree = new Map<string, number>();
    const adjList = new Map<string, string[]>();

    for (const t of subtasks) {
      taskMap.set(t.id, t);
      inDegree.set(t.id, 0);
      adjList.set(t.id, []);
    }

    for (const t of subtasks) {
      for (const depId of t.dependencies) {
        if (!taskMap.has(depId)) {
          return {
            valid: false,
            cyclePath: [`Dependensi '${depId}' tidak ditemukan pada subtask list.`],
          };
        }
        adjList.get(depId)!.push(t.id);
        inDegree.set(t.id, (inDegree.get(t.id) || 0) + 1);
      }
    }

    const queue: string[] = [];
    for (const [id, deg] of inDegree.entries()) {
      if (deg === 0) queue.push(id);
    }

    let visitedCount = 0;
    while (queue.length > 0) {
      const curr = queue.shift()!;
      visitedCount++;
      for (const neighbor of adjList.get(curr) || []) {
        inDegree.set(neighbor, inDegree.get(neighbor)! - 1);
        if (inDegree.get(neighbor) === 0) {
          queue.push(neighbor);
        }
      }
    }

    if (visitedCount !== subtasks.length) {
      return {
        valid: false,
        cyclePath: ["Terdeteksi dependensi sirkular (Circular Dependency) antar subtask."],
      };
    }

    return { valid: true };
  }

  /**
   * Menyusun rencana kerja multi-agent terstruktur (DAG) berdasarkan goal
   */
  public static createPlan(goal: string): TaskPlanDAG {
    const planId = "plan-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6);
    const isSimple = this.isSimpleTask(goal);

    if (isSimple) {
      const singleSubtask: SubtaskPlan = {
        id: "subtask-1",
        title: "Eksekusi Langsung",
        description: goal,
        subagentRole: "coder",
        dependencies: [],
        successCriteria: ["Tugas sederhana selesai dieksekusi."],
        status: "pending",
        targetFiles: [],
      };

      return {
        planId,
        goal,
        isSimpleTask: true,
        subtasks: [singleSubtask],
        totalSubtasks: 1,
      };
    }

    const lower = goal.toLowerCase();
    const subtasks: SubtaskPlan[] = [];

    // 1. Subtask Analisis & Rencana (Architect)
    subtasks.push({
      id: "subtask-1-analysis",
      title: "Analisis & Perencanaan Arsitektur",
      description: `Analisis struktur codebase dan rancang strategi untuk: "${goal}"`,
      subagentRole: "architect",
      dependencies: [],
      successCriteria: [
        "Struktur codebase dipetakan",
        "File target diidentifikasi",
        "Rencana langkah terdefinisi",
      ],
      status: "pending",
      targetFiles: [],
    });

    // 2. Subtask Keamanan & Izin (Security)
    subtasks.push({
      id: "subtask-2-security",
      title: "Audit Batas Keamanan & Akses",
      description: "Verifikasi bahwa aksi tidak menyentuh berkas rahasia (.env, .git) atau mengeksekusi perintah berbahaya.",
      subagentRole: "security",
      dependencies: ["subtask-1-analysis"],
      successCriteria: [
        "Tidak ada akses di luar batas workspace",
        "File sensitif terlindungi",
      ],
      status: "pending",
      targetFiles: [],
    });

    // 3. Subtask Implementasi Kode (Coder)
    subtasks.push({
      id: "subtask-3-implementation",
      title: "Implementasi & Modifikasi Kode",
      description: `Terapkan perubahan kode turn-key kelas produksi untuk target: "${goal}"`,
      subagentRole: "coder",
      dependencies: ["subtask-1-analysis", "subtask-2-security"],
      successCriteria: [
        "Perubahan kode diterapkan secara presisi",
        "Tidak ada sintaks yang rusak",
      ],
      status: "pending",
      targetFiles: [],
    });

    // 4. Subtask Verifikasi QA atau Browser (QA / Browser)
    const isBrowserTarget = lower.includes("browser") || lower.includes("ui") || lower.includes("halaman") || lower.includes("web") || lower.includes("form");
    if (isBrowserTarget) {
      subtasks.push({
        id: "subtask-4-verification",
        title: "Verifikasi Antarmuka Browser & Visual QA",
        description: "Buka halaman web di browser headless, periksa elemen DOM, dan rekam snapshot bukti visual.",
        subagentRole: "browser",
        dependencies: ["subtask-3-implementation"],
        successCriteria: [
          "Navigasi halaman berhasil",
          "Elemen interaktif tervalidasi",
          "Snapshot wireframe/visual terbentuk",
        ],
        status: "pending",
        targetFiles: [],
      });
    } else {
      subtasks.push({
        id: "subtask-4-verification",
        title: "Verifikasi Kompilasi & Pengujian QA",
        description: "Jalankan verify_project_build atau test suite untuk membuktikan kode bebas error.",
        subagentRole: "qa",
        dependencies: ["subtask-3-implementation"],
        successCriteria: [
          "Typecheck TypeScript lolos 0 error",
          "Verifikasi proyek lulus tanpa regresi",
        ],
        status: "pending",
        targetFiles: [],
      });
    }

    // 5. Subtask Laporan Akhir Berdasarkan Bukti (Architect)
    subtasks.push({
      id: "subtask-5-reporting",
      title: "Sintesis Laporan Akhir Berbasis Bukti",
      description: "Rangkum seluruh bukti eksekusi nyata, berkas yang diubah, hasil pengujian, dan status verifikasi.",
      subagentRole: "architect",
      dependencies: ["subtask-4-verification"],
      successCriteria: [
        "Laporan akhir mencantumkan bukti riil",
        "Semua kriteria sukses subtask sebelumnya tercapai",
      ],
      status: "pending",
      targetFiles: [],
    });

    const cycleCheck = this.validateNoCycles(subtasks);
    if (!cycleCheck.valid) {
      throw new Error(`Rencana tugas tidak valid: ${cycleCheck.cyclePath?.join(" -> ")}`);
    }

    return {
      planId,
      goal,
      isSimpleTask: false,
      subtasks,
      totalSubtasks: subtasks.length,
    };
  }
}
