import { GoogleGenAI } from "@google/genai";
import { ToolRegistry, ToolResult } from "./tools/registry";
import { TaskStateManager, TaskState } from "./task-state";
import { ProjectMemory } from "./memory";
import { SUBAGENT_PERSONAS } from "./agents/personas";
import { resolveModelCandidates, type AIModelId } from "@/lib/ai-models";

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
    grantedPermissions?: Record<string, boolean>
  ): Promise<OrchestrationResult> {
    const task = TaskStateManager.createTask(goal, 8);
    const toolsUsed: Set<string> = new Set();
    const memory = await ProjectMemory.load();
    const memoryContext = ProjectMemory.getMemoryContextPrompt();

    // 1. PHASE 1: PAHAMI & RENCANAKAN (Architect Subagent)
    TaskStateManager.addLog(
      task.taskId,
      SUBAGENT_PERSONAS.architect.displayName,
      `Memulai analisis arsitektur dan perencanaan untuk target: "${goal}"`
    );

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

INSTRUKSI PROTOKOL OTONOM GOOGLE ANTIGRAVITY:
1. Pahami masalah dan gunakan tools yang tersedia untuk memeriksa kondisi codebase nyata (read_file, search_codebase, dir).
2. Jika perlu modifikasi, gunakan patch_file atau write_file.
3. Setelah modifikasi, verifikasi hasilnya dengan verify_project_build atau run_terminal_command.
4. Jika menemui error, perbaiki dan coba kembali (self-healing loop).
5. Jika ada perintah yang memerlukan izin pengguna, laporkan alasan spesifiknya.
6. Berikan laporan hasil akhir yang transparan dan terbukti setelah semua langkah selesai.
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

    while (iteration < maxIterations) {
      iteration++;
      task.iterationCount = iteration;

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

            TaskStateManager.addLog(
              task.taskId,
              "Tool Execution",
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

            const execResult: ToolResult = await tool.execute(toolArgs, isGranted);

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
        task.status = "completed";
        task.finalReport = finalAnswer;

        // Catat ke Project Memory jika ada keputusan teknis yang berhasil
        if (toolsUsed.has("write_file") || toolsUsed.has("patch_file")) {
          await ProjectMemory.saveDecision({
            topic: goal.slice(0, 40),
            decision: "Implementasi berhasil melalui Autonomous Agent",
            rationale: `Diselesaikan dalam ${iteration} langkah orkestrasi.`,
            filesAffected: [],
          });
        }

        break;
      } catch (loopError) {
        TaskStateManager.addLog(
          task.taskId,
          "Orchestrator Error",
          `Terjadi kesalahan pada iterasi ${iteration}: ${(loopError as Error).message}`
        );

        if (iteration >= maxIterations) {
          task.status = "failed";
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

    return {
      success: task.status === "completed",
      taskId: task.taskId,
      finalAnswer,
      stepsTaken: iteration,
      toolsUsed: Array.from(toolsUsed),
    };
  }
}
