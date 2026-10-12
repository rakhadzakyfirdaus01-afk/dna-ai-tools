export interface TaskPlanStep {
  id: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "failed" | "skipped";
  subagent: "architect" | "coder" | "qa" | "security";
  toolName?: string;
  resultSummary?: string;
}

export interface TaskState {
  taskId: string;
  goal: string;
  status: "planning" | "executing" | "evaluating" | "completed" | "failed" | "paused_for_permission";
  steps: TaskPlanStep[];
  currentStepIndex: number;
  iterationCount: number;
  maxIterations: number;
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
  };
  finalReport?: string;
}

export class TaskStateManager {
  private static tasks: Map<string, TaskState> = new Map();

  public static createTask(goal: string, maxIterations = 8): TaskState {
    const taskId = "task-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6);
    const newTask: TaskState = {
      taskId,
      goal,
      status: "planning",
      steps: [],
      currentStepIndex: 0,
      iterationCount: 0,
      maxIterations,
      logs: [],
    };
    this.tasks.set(taskId, newTask);
    return newTask;
  }

  public static getTask(taskId: string): TaskState | undefined {
    return this.tasks.get(taskId);
  }

  public static updateTask(taskId: string, partial: Partial<TaskState>): TaskState | undefined {
    const existing = this.tasks.get(taskId);
    if (!existing) return undefined;
    const updated = { ...existing, ...partial };
    this.tasks.set(taskId, updated);
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
  }
}
