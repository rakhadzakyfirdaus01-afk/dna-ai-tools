import fs from "fs/promises";
import path from "path";
import os from "os";
import prisma from "../prisma";
import { SecurityGate } from "./security-gate";
import { SubtaskPlan, TaskPlanDAG } from "./planner/task-planner";

export type TaskStatus =
  | "queued"
  | "running"
  | "waiting_for_permission"
  | "paused_for_permission"
  | "completed"
  | "failed"
  | "blocked"
  | "cancelled"
  | "needs_review";

export interface TaskPlanStep {
  id: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "failed" | "skipped";
  subagent: "architect" | "coder" | "qa" | "security" | "browser";
  toolName?: string;
  resultSummary?: string;
  error?: string;
}

export interface TaskState {
  taskId: string;
  userId: string;
  goal: string;
  status: TaskStatus;
  steps: TaskPlanStep[];
  subtasks: SubtaskPlan[];
  activeSubtaskId?: string;
  isSimpleTask?: boolean;
  currentStepIndex: number;
  iterationCount: number;
  maxIterations: number;
  createdAt: number;
  updatedAt: number;
  checkpointHash?: string;
  lockedByWorker?: string | null;
  lockedAt?: number | null;
  cancelRequested?: boolean;
  logs: Array<{
    timestamp: number;
    sender: string;
    message: string;
    toolCall?: any;
    toolOutput?: any;
  }>;
  pendingPermission?: {
    action: string;
    reason: string;
    commandToRun: string;
    requestedAt: number;
    granted?: boolean;
  };
  finalReport?: string;
  verificationEvidence?: {
    typecheckPassed?: boolean;
    testsPassed?: boolean;
    browserVerified?: boolean;
    filesModified?: string[];
  };
}

export class TaskStateManager {
  private static tasks: Map<string, TaskState> = new Map();
  private static initialized = false;

  public static getStorageDir(): string {
    // Di lingkungan serverless Vercel (AWS Lambda), process.cwd() adalah read-only kecuali /tmp
    if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
      return path.resolve(os.tmpdir(), "antigravity-tasks");
    }
    return path.resolve(SecurityGate.getWorkspaceRoot(), ".antigravity-tasks");
  }

  private static async ensureInitialized() {
    if (this.initialized) return;
    try {
      const storageDir = this.getStorageDir();
      await fs.mkdir(storageDir, { recursive: true });
      // Pulihkan task yang tersimpan dari disk (recover from restart)
      const files = await fs.readdir(storageDir);
      for (const file of files) {
        if (file.endsWith(".json")) {
          try {
            const raw = await fs.readFile(path.join(storageDir, file), "utf-8");
            const task: TaskState = JSON.parse(raw);
            if (task && task.taskId) {
              // Jika server sempat mati saat running, pulihkan status ke queued atau failed secara bersih
              if (task.status === "running") {
                task.status = "queued";
                task.lockedByWorker = null;
                task.lockedAt = null;
              }
              this.tasks.set(task.taskId, task);
            }
          } catch {}
        }
      }
    } catch {}
    this.initialized = true;
  }

  public static async createTask(goal: string, userId = "anonymous", maxIterations = 8): Promise<TaskState> {
    await this.ensureInitialized();
    const taskId = "task-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6);
    const newTask: TaskState = {
      taskId,
      userId,
      goal,
      status: "queued",
      steps: [],
      subtasks: [],
      currentStepIndex: 0,
      iterationCount: 0,
      maxIterations,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lockedByWorker: null,
      lockedAt: null,
      cancelRequested: false,
      logs: [],
    };
    this.tasks.set(taskId, newTask);
    await this.persistCheckpoint(newTask);
    return newTask;
  }

  public static async setPlan(taskId: string, plan: TaskPlanDAG): Promise<TaskState | undefined> {
    const task = await this.getTask(taskId);
    if (!task) return undefined;
    task.subtasks = plan.subtasks;
    task.isSimpleTask = plan.isSimpleTask;
    task.updatedAt = Date.now();
    await this.persistCheckpoint(task);
    return task;
  }

  public static async updateSubtask(
    taskId: string,
    subtaskId: string,
    partial: Partial<SubtaskPlan>
  ): Promise<SubtaskPlan | undefined> {
    const task = await this.getTask(taskId);
    if (!task || !task.subtasks) return undefined;
    const subtask = task.subtasks.find((s) => s.id === subtaskId);
    if (!subtask) return undefined;

    Object.assign(subtask, partial);
    task.updatedAt = Date.now();
    await this.persistCheckpoint(task);
    return subtask;
  }

  public static async getTask(taskId: string): Promise<TaskState | undefined> {
    await this.ensureInitialized();
    const cached = this.tasks.get(taskId);
    if (cached) return cached;

    // Fallback 1: baca langsung dari disk jika dibuat oleh instance serverless lain
    try {
      const storageDir = this.getStorageDir();
      const filePath = path.join(storageDir, `${taskId}.json`);
      const raw = await fs.readFile(filePath, "utf-8");
      const task: TaskState = JSON.parse(raw);
      if (task && task.taskId) {
        this.tasks.set(task.taskId, task);
        return task;
      }
    } catch {}

    // Fallback 2: baca dari database persisten Prisma/MySQL jika database aktif
    try {
      const dbTaskPromise = prisma.antigravityTask.findUnique({
        where: { taskId },
      });
      const timeoutPromise = new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error("DB timeout")), 1200)
      );
      const dbTask = await Promise.race([dbTaskPromise, timeoutPromise]);
      if (dbTask) {
        const task: TaskState = {
          taskId: dbTask.taskId,
          userId: dbTask.userId,
          goal: dbTask.goal,
          status: dbTask.status as TaskStatus,
          steps: JSON.parse(dbTask.stepsJson || "[]"),
          subtasks: JSON.parse(dbTask.subtasksJson || "[]"),
          currentStepIndex: 0,
          iterationCount: 0,
          maxIterations: 8,
          createdAt: Number(dbTask.createdAt),
          updatedAt: Number(dbTask.updatedAt),
          lockedByWorker: dbTask.lockedByWorker,
          lockedAt: dbTask.lockedAt ? Number(dbTask.lockedAt) : null,
          cancelRequested: dbTask.cancelRequested,
          logs: JSON.parse(dbTask.logsJson || "[]"),
          finalReport: dbTask.finalReport || undefined,
          verificationEvidence: dbTask.evidenceJson ? JSON.parse(dbTask.evidenceJson) : undefined,
        };
        this.tasks.set(task.taskId, task);
        return task;
      }
    } catch {}

    return undefined;
  }

  public static async listUserTasks(userId: string): Promise<TaskState[]> {
    await this.ensureInitialized();
    if (!userId || typeof userId !== "string") return [];
    
    // Sinkronisasi dengan database jika tersedia
    try {
      const dbTasksPromise = prisma.antigravityTask.findMany({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        take: 20,
      });
      const timeoutPromise = new Promise<any[]>((_, reject) =>
        setTimeout(() => reject(new Error("DB timeout")), 1200)
      );
      const dbTasks = await Promise.race([dbTasksPromise, timeoutPromise]);
      for (const dbTask of (dbTasks || [])) {
        if (!this.tasks.has(dbTask.taskId)) {
          this.tasks.set(dbTask.taskId, {
            taskId: dbTask.taskId,
            userId: dbTask.userId,
            goal: dbTask.goal,
            status: dbTask.status as TaskStatus,
            steps: JSON.parse(dbTask.stepsJson || "[]"),
            subtasks: JSON.parse(dbTask.subtasksJson || "[]"),
            currentStepIndex: 0,
            iterationCount: 0,
            maxIterations: 8,
            createdAt: Number(dbTask.createdAt),
            updatedAt: Number(dbTask.updatedAt),
            lockedByWorker: dbTask.lockedByWorker,
            lockedAt: dbTask.lockedAt ? Number(dbTask.lockedAt) : null,
            cancelRequested: dbTask.cancelRequested,
            logs: JSON.parse(dbTask.logsJson || "[]"),
            finalReport: dbTask.finalReport || undefined,
            verificationEvidence: dbTask.evidenceJson ? JSON.parse(dbTask.evidenceJson) : undefined,
          });
        }
      }
    } catch {}

    return Array.from(this.tasks.values())
      .filter((t) => t.userId === userId)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  public static async acquireLock(taskId: string, workerId: string): Promise<boolean> {
    const task = await this.getTask(taskId);
    if (!task) return false;

    // Cek apakah sedang dikunci worker lain (timeout lock 45 detik)
    const now = Date.now();
    if (task.lockedByWorker && task.lockedByWorker !== workerId) {
      if (task.lockedAt && now - task.lockedAt < 45000) {
        return false; // Sedang dikerjakan worker lain
      }
    }

    task.lockedByWorker = workerId;
    task.lockedAt = now;
    task.status = "running";
    task.updatedAt = now;
    await this.persistCheckpoint(task);
    return true;
  }

  public static async releaseLock(taskId: string, workerId: string): Promise<void> {
    const task = await this.getTask(taskId);
    if (!task) return;
    if (task.lockedByWorker === workerId) {
      task.lockedByWorker = null;
      task.lockedAt = null;
      task.updatedAt = Date.now();
      await this.persistCheckpoint(task);
    }
  }

  public static async requestCancel(taskId: string, userId: string): Promise<boolean> {
    const task = await this.getTask(taskId);
    if (!task) return false;
    // Otorisasi ketat: Hanya pemilik tugas yang berhak membatalkannya
    if (task.userId !== userId) return false;

    task.cancelRequested = true;
    task.status = "cancelled";
    task.updatedAt = Date.now();
    this.addLog(taskId, "System", "Pengguna membatalkan eksekusi tugas.");
    await this.persistCheckpoint(task);
    return true;
  }

  public static async updateTask(taskId: string, partial: Partial<TaskState>): Promise<TaskState | undefined> {
    const existing = await this.getTask(taskId);
    if (!existing) return undefined;
    const updated = {
      ...existing,
      ...partial,
      updatedAt: Date.now(),
    };
    this.tasks.set(taskId, updated);
    await this.persistCheckpoint(updated);
    return updated;
  }

  public static addLog(
    taskId: string,
    sender: string,
    message: string,
    toolCall?: any,
    toolOutput?: any
  ) {
    const task = this.tasks.get(taskId);
    if (!task) return;
    task.logs.push({
      timestamp: Date.now(),
      sender,
      message,
      toolCall,
      toolOutput,
    });
    // Batasi logs maksimum 60 entri agar tidak membebani memori
    if (task.logs.length > 60) {
      task.logs = task.logs.slice(-60);
    }
  }

  public static async persistCheckpoint(task: TaskState): Promise<void> {
    // 1. Simpan ke disk lokal / tmp
    try {
      const storageDir = this.getStorageDir();
      await fs.mkdir(storageDir, { recursive: true });
      const filePath = path.join(storageDir, `${task.taskId}.json`);
      const tempPath = filePath + ".tmp";
      await fs.writeFile(tempPath, JSON.stringify(task, null, 2), "utf-8");
      await fs.rename(tempPath, filePath);
    } catch (err) {
      console.warn(`[TaskStateManager] Failed to persist task file ${task.taskId}:`, err);
    }

    // 2. Simpan secara persisten ke Database Prisma/MySQL jika terkoneksi (dengan timeout aman agar tidak hang bila DB offline)
    try {
      const dbUpsert = prisma.antigravityTask.upsert({
        where: { taskId: task.taskId },
        create: {
          taskId: task.taskId,
          userId: task.userId,
          goal: task.goal,
          status: task.status,
          stepsJson: JSON.stringify(task.steps || []),
          subtasksJson: JSON.stringify(task.subtasks || []),
          logsJson: JSON.stringify(task.logs || []),
          evidenceJson: task.verificationEvidence ? JSON.stringify(task.verificationEvidence) : null,
          finalReport: task.finalReport || null,
          lockedByWorker: task.lockedByWorker || null,
          lockedAt: task.lockedAt ? BigInt(task.lockedAt) : null,
          cancelRequested: Boolean(task.cancelRequested),
          createdAt: BigInt(task.createdAt),
          updatedAt: BigInt(task.updatedAt),
        },
        update: {
          status: task.status,
          stepsJson: JSON.stringify(task.steps || []),
          subtasksJson: JSON.stringify(task.subtasks || []),
          logsJson: JSON.stringify(task.logs || []),
          evidenceJson: task.verificationEvidence ? JSON.stringify(task.verificationEvidence) : null,
          finalReport: task.finalReport || null,
          lockedByWorker: task.lockedByWorker || null,
          lockedAt: task.lockedAt ? BigInt(task.lockedAt) : null,
          cancelRequested: Boolean(task.cancelRequested),
          updatedAt: BigInt(task.updatedAt),
        },
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("DB timeout")), 1200)
      );

      await Promise.race([dbUpsert, timeoutPromise]);
    } catch (err) {
      // Non-blocking: Jika database cloud belum disiapkan atau offline, sistem tetap beroperasi normal via disk
    }
  }
}
