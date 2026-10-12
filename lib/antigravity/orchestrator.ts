import { GoogleGenAI } from "@google/genai";
import { ToolRegistry, ToolResult } from "./tools/registry";
import { TaskStateManager, TaskState } from "./task-state";
import { ProjectMemory } from "./memory";
import { SUBAGENT_PERSONAS } from "./agents/personas";
import { resolveModelCandidates, type AIModelId } from "@/lib/ai-models";
import { TaskPlanner } from "./planner/task-planner";
import { AgentCoordinator } from "./coordinator/agent-coordinator";

function getApiKey(): string {
  return (
    process.env.GEMINI_DEBUGGER_API_KEY ||
    process.env.GEMINI_API_KEY ||
    ""
  );
}

export interface OrchestrationResult {
  success: boolean;
  taskId: string;
  finalAnswer: string;
  stepsTaken: number;
  toolsUsed: string[];
  pendingPermission?: {
    action: string;
    reason: string;
    commandToRun: string;
  };
}

export class AntigravityOrchestrator {
  private static ai = new GoogleGenAI({
    apiKey: getApiKey(),
  });

  public static async executeAutonomousGoal(
    goal: string,
    modelId: AIModelId = "auto",
    userId = "anonymous",
    grantedPermissions?: Record<string, boolean>
  ): Promise<OrchestrationResult> {
    const task = await TaskStateManager.createTask(goal, userId, 8);
    const workerId = "worker-" + process.pid + "-" + Date.now();
    const locked = await TaskStateManager.acquireLock(task.taskId, workerId);

    if (!locked) {
      return {
        success: false,
        taskId: task.taskId,
        finalAnswer: "Tugas sedang dikunci dan dikerjakan oleh worker lain.",
        stepsTaken: 0,
        toolsUsed: [],
      };
    }

    ToolRegistry.setActiveUserId(userId);

    const toolsUsed: Set<string> = new Set();
    const memory = await ProjectMemory.load();
    const memoryContext = ProjectMemory.getMemoryContextPrompt();

    // 1. PHASE 1: PAHAMI & RENCANAKAN (Architect Subagent)
    const plan = TaskPlanner.createPlan(goal);
    await TaskStateManager.setPlan(task.taskId, plan);

    TaskStateManager.addLog(
      task.taskId,
      SUBAGENT_PERSONAS.architect.displayName,
      `Rencana DAG dibentuk: ${plan.totalSubtasks} subtask (Simple: ${plan.isSimpleTask}) untuk target: "${goal}"`
    );

    const planSummary = plan.subtasks
      .map(
        (s, idx) =>
          `  ${idx + 1}. [${s.subagentRole.toUpperCase()}] ${s.title} (Status: ${s.status}, Dependensi: ${s.dependencies.join(", ") || "None"})`
      )
      .join("\n");

    const toolsDeclarations = ToolRegistry.getAllTools().map((t) => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    }));

    let currentConversationHistory: any[] = [
      {
        role: "user",
        parts: [
          {
            text: `
${memoryContext}

TUGAS UTAMA (GOAL):
${goal}

RENCANA SUBTASK MULTI-AGENT TERSTRUKTUR:
${planSummary}

INSTRUKSI PROTOKOL OTONOM GOOGLE ANTIGRAVITY (STAGE 10 CAPABILITY):
1. Pahami masalah dan telusuri simbol/kode terkait (analyze_codebase, find_symbols, read_file, search_codebase) sebelum mengubah file.
2. Terapkan perubahan terukur menggunakan patch_file untuk modifikasi presisi atau write_file untuk pembuatan berkas baru.
3. Setelah menerapkan perubahan kode, periksa get_git_diff untuk memverifikasi akurasi diff dan memastikan tidak ada kode yang terhapus secara tidak sengaja.
4. Verifikasi hasil modifikasi secara ketat menggunakan verify_project_build atau run_terminal_command.
5. Jika menemui error kompilasi/runtime, baca pesan error aktual, identifikasi akar masalahnya, dan lakukan perbaikan perbaikan terarah (Self-Healing Loop max 3 kali).
6. Untuk pengujian web frontend atau verifikasi interaksi UI, gunakan browser_navigate, browser_query, browser_click, browser_fill_form, dan browser_snapshot untuk inspeksi visual.
7. Jika ada perintah yang memerlukan izin pengguna, laporkan alasan spesifiknya.
8. Berikan laporan hasil akhir yang transparan, mencantumkan file yang dimodifikasi, status kompilasi, dan bukti verifikasi.
`.trim(),
          },
        ],
      },
    ];

    let finalAnswer = "";
    let iteration = 0;
    const maxIterations = 8;
    const modelCandidates = resolveModelCandidates(modelId);
    const activeModel = modelCandidates[0] || "gemini-2.5-flash";

    try {
      while (iteration < maxIterations) {
        // Cek apakah ada pembatalan tugas dari pengguna
        const currentTaskState = await TaskStateManager.getTask(task.taskId);
        if (currentTaskState?.cancelRequested) {
          await TaskStateManager.updateTask(task.taskId, { status: "cancelled" });
          return {
            success: false,
            taskId: task.taskId,
            finalAnswer: "Tugas telah dibatalkan atas permintaan pengguna.",
            stepsTaken: iteration,
            toolsUsed: Array.from(toolsUsed),
          };
        }

        iteration++;
        await TaskStateManager.updateTask(task.taskId, { iterationCount: iteration });

      try {
        // Panggil Gemini model dengan function declarations
        const response = await this.ai.models.generateContent({
          model: activeModel,
          contents: currentConversationHistory,
          config: {
            temperature: 0.2,
            tools: [{ functionDeclarations: toolsDeclarations as any }],
          },
        });

        const candidate = response.candidates?.[0];
        const content = candidate?.content;
        
        // Ekstrak functionCalls dari response SDK atau content parts
        const responseAny = response as any;
        const candidateAny = candidate as any;
        let functionCalls: any[] = responseAny.functionCalls || [];
        
        if (!functionCalls || functionCalls.length === 0) {
          if (content?.parts) {
            for (const part of content.parts as any[]) {
              if (part.functionCall) {
                functionCalls.push(part.functionCall);
              }
            }
          }
        }

        if (content) {
          currentConversationHistory.push(content);
        }

        // A. JIKA MODEL MEMINTA PANGGILAN ALAT (FUNCTION CALL)
        if (functionCalls && functionCalls.length > 0) {
          const functionResponses: any[] = [];

          for (const call of functionCalls) {
            const toolName = call.name;
            const toolArgs = call.args || {};
            toolsUsed.add(toolName);

            // Tentukan agent persona yang bertanggung jawab
            let agentBadge = SUBAGENT_PERSONAS.architect.displayName;
            if (toolName.startsWith("browser_")) {
              agentBadge = SUBAGENT_PERSONAS.browser.displayName;
            } else if (toolName === "verify_project_build" || toolName === "run_terminal_command") {
              agentBadge = SUBAGENT_PERSONAS.qa.displayName;
            } else if (toolName === "patch_file" || toolName === "write_file") {
              agentBadge = SUBAGENT_PERSONAS.coder.displayName;
            }

            TaskStateManager.addLog(
              task.taskId,
              agentBadge,
              `Memanggil tool [${toolName}]`,
              toolArgs
            );

            const tool = ToolRegistry.getTool(toolName);
            if (!tool) {
              functionResponses.push({
                name: toolName,
                response: { error: `Tool ${toolName} tidak terdaftar di registry.` },
              });
              continue;
            }

            // Eksekusi tool (hanya terima izin spesifik per perintah atau per nama aksi)
            const isGranted = Boolean(
              grantedPermissions &&
              ((toolArgs.command && grantedPermissions[toolArgs.command]) ||
               (toolArgs.filePath && grantedPermissions[toolArgs.filePath]) ||
               grantedPermissions[toolName])
            );

            const execResult: ToolResult = await tool.execute(toolArgs, isGranted, {
              userId,
              grantedPermissions: isGranted,
            });

            TaskStateManager.addLog(
              task.taskId,
              "Tool Output",
              `Hasil dari [${toolName}] (Success: ${execResult.success})`,
              undefined,
              execResult
            );

            // Jika butuh izin pengguna yang belum diberikan
            if (execResult.requiresPermission) {
              task.status = "paused_for_permission";
              task.pendingPermission = {
                action: toolName,
                reason: execResult.permissionReason || "Memerlukan konfirmasi izin.",
                commandToRun: execResult.commandToGrant || toolArgs.command || toolName,
                requestedAt: Date.now(),
              };

              return {
                success: false,
                taskId: task.taskId,
                finalAnswer: `Antigravity membutuhkan izin Anda untuk melanjutkan: ${execResult.permissionReason}`,
                stepsTaken: iteration,
                toolsUsed: Array.from(toolsUsed),
                pendingPermission: task.pendingPermission,
              };
            }

            functionResponses.push({
              name: toolName,
              response: execResult.success ? execResult.data : { error: execResult.error },
            });
          }

          // Kirimkan kembali hasil tools ke model
          currentConversationHistory.push({
            role: "user",
            parts: functionResponses.map((res) => ({
              functionResponse: res,
            })),
          });

          continue; // Lanjut ke iterasi berikutnya untuk penalaran model berikutnya
        }

        // B. JIKA TIDAK ADA FUNCTION CALLS LAGI, MODEL SELESAI MEMBERIKAN LAPORAN
        finalAnswer = response.text || "Pekerjaan selesai.";

        // FASE 5: Evidence-Based Verification Contract
        let verificationPassed = true;
        if (toolsUsed.has("write_file") || toolsUsed.has("patch_file")) {
          const verifyTool = ToolRegistry.getTool("verify_project_build");
          if (verifyTool) {
            const verifyRes = await verifyTool.execute({});
            verificationPassed = Boolean(verifyRes.data?.passed ?? verifyRes.success);
            task.verificationEvidence = {
              typecheckPassed: verificationPassed,
              filesModified: Array.from(toolsUsed),
            };
          }
        }

        task.status = verificationPassed ? "completed" : "failed";
        if (!verificationPassed) {
          finalAnswer += "\n\n[PERINGATAN VERIFIKASI]: Modifikasi kode tidak lolos kompilasi/typecheck TypeScript. Status tugas ditandai FAILED.";
        }
        task.finalReport = finalAnswer;

        // Tandai semua subtask sebagai completed jika verifikasi berhasil
        if (task.subtasks) {
          task.subtasks.forEach((s) => {
            if (s.status === "pending" || s.status === "in_progress") {
              s.status = verificationPassed ? "completed" : "failed";
            }
          });
        }

        // Catat ke Project Memory jika ada keputusan teknis yang berhasil
        if (verificationPassed && (toolsUsed.has("write_file") || toolsUsed.has("patch_file"))) {
          await ProjectMemory.saveDecision({
            topic: goal.slice(0, 40),
            decision: "Implementasi berhasil melalui Autonomous Agent",
            rationale: `Diselesaikan dalam ${iteration} langkah orkestrasi.`,
            filesAffected: [],
          });
        }

        await TaskStateManager.updateTask(task.taskId, {
          status: task.status,
          finalReport: task.finalReport,
          subtasks: task.subtasks,
          verificationEvidence: task.verificationEvidence,
        });

        break;
        } catch (loopError) {
          TaskStateManager.addLog(
            task.taskId,
            "Orchestrator Error",
            `Terjadi kesalahan pada iterasi ${iteration}: ${(loopError as Error).message}`
          );

          if (iteration >= maxIterations) {
            await TaskStateManager.updateTask(task.taskId, { status: "failed" });
            return {
              success: false,
              taskId: task.taskId,
              finalAnswer: `Orkestrasi mencapai batas iterasi atau mengalami kendala: ${(loopError as Error).message}`,
              stepsTaken: iteration,
              toolsUsed: Array.from(toolsUsed),
            };
          }
        }
      }
    } finally {
      ToolRegistry.setActiveUserId(null);
      await TaskStateManager.releaseLock(task.taskId, workerId);
    }

    const currentTask = await TaskStateManager.getTask(task.taskId);
    return {
      success: currentTask?.status === "completed",
      taskId: task.taskId,
      finalAnswer,
      stepsTaken: iteration,
      toolsUsed: Array.from(toolsUsed),
    };
  }
}
