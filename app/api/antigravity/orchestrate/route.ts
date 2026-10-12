import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { AntigravityOrchestrator } from "@/lib/antigravity/orchestrator";
import { TaskStateManager } from "@/lib/antigravity/task-state";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const isDev = process.env.NODE_ENV !== "production";

    if (!session?.user && !isDev) {
      return NextResponse.json(
        { error: "Unauthorized. Silakan login terlebih dahulu." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const action = body.action || "run";
    const userId = session?.user?.email || (session?.user as any)?.id || "dev-user";

    // Dukungan pembatalan tugas (Task Cancellation)
    if (action === "cancel") {
      const taskIdToCancel = typeof body.taskId === "string" ? body.taskId.trim() : "";
      if (!taskIdToCancel) {
        return NextResponse.json({ error: "taskId diperlukan untuk pembatalan." }, { status: 400 });
      }
      const cancelled = await TaskStateManager.requestCancel(taskIdToCancel, userId);
      return NextResponse.json({ success: cancelled, taskId: taskIdToCancel, status: "cancelled" });
    }

    const goal = typeof body.goal === "string" ? body.goal.trim() : "";
    const modelId = body.modelId || "auto";
    const grantedPermissions = body.grantedPermissions || {};

    if (!goal) {
      return NextResponse.json(
        { error: "Goal atau instruksi tugas tidak boleh kosong." },
        { status: 400 }
      );
    }

    // Jalankan siklus orkestrasi otonom Antigravity
    const result = await AntigravityOrchestrator.executeAutonomousGoal(
      goal,
      modelId,
      userId,
      grantedPermissions
    );

    const taskDetails = await TaskStateManager.getTask(result.taskId);

    return NextResponse.json({
      success: result.success,
      taskId: result.taskId,
      finalAnswer: result.finalAnswer,
      stepsTaken: result.stepsTaken,
      toolsUsed: result.toolsUsed,
      pendingPermission: result.pendingPermission,
      logs: taskDetails?.logs || [],
    });
  } catch (err) {
    console.error("[Antigravity Orchestration API Error]:", err);
    return NextResponse.json(
      {
        error: "Terjadi kesalahan internal pada orchestrator: " + (err as Error).message,
      },
      { status: 500 }
    );
  }
}
