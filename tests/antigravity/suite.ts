import { SecurityGate } from "../../lib/antigravity/security-gate";
import { ToolRegistry } from "../../lib/antigravity/tools/registry";
import { TaskStateManager } from "../../lib/antigravity/task-state";
import { ProjectMemory } from "../../lib/antigravity/memory";
import fs from "fs/promises";
import path from "path";

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passedCount++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    failedCount++;
  }
}

async function runSecurityGateTests() {
  console.log("\n--- [1] SECURITY GATE TESTS ---");

  // 1. Path Traversal Test
  const traversalCheck = SecurityGate.checkFileAccess("../../../windows/system32/cmd.exe", "read");
  assert(!traversalCheck.allowed && traversalCheck.level === "blocked", "Blocks path traversal outside workspace");

  // 2. Sensitive File Read Block Test (.env)
  const envCheck = SecurityGate.checkFileAccess(".env", "read");
  assert(!envCheck.allowed && envCheck.level === "blocked", "Blocks reading sensitive .env file");

  // 3. Sensitive File Read Block Test (.env.local)
  const envLocalCheck = SecurityGate.checkFileAccess(".env.local", "read");
  assert(!envLocalCheck.allowed && envLocalCheck.level === "blocked", "Blocks reading .env.local file");

  // 4. Git folder write block test
  const gitCheck = SecurityGate.checkFileAccess(".git/config", "write");
  assert(!gitCheck.allowed && gitCheck.level === "blocked", "Blocks writing to .git directory");

  // 5. Config file permission requirement test (package.json)
  const pkgCheck = SecurityGate.checkFileAccess("package.json", "write");
  assert(pkgCheck.allowed && pkgCheck.level === "requires_permission", "Requires permission before writing package.json");

  // 6. Safe command check
  const safeCmd = SecurityGate.checkTerminalCommand("git status");
  assert(safeCmd.allowed && safeCmd.level === "safe", "Allows safe read-only terminal commands (git status)");

  // 7. Dangerous command block check
  const dangerousCmd = SecurityGate.checkTerminalCommand("rm -rf /");
  assert(!dangerousCmd.allowed && dangerousCmd.level === "blocked", "Blocks destructive terminal commands (rm -rf /)");

  // 8. Chained dangerous command block check
  const chainedCmd = SecurityGate.checkTerminalCommand("git status && del /f /s /q c:\\");
  assert(!chainedCmd.allowed && chainedCmd.level === "blocked", "Blocks chained malicious terminal commands (&&)");
}

async function runToolRegistryTests() {
  console.log("\n--- [2] TOOL REGISTRY TESTS ---");

  // 1. Read existing file
  const readFileTool = ToolRegistry.getTool("read_file");
  assert(!!readFileTool, "Tool 'read_file' is properly registered");

  if (readFileTool) {
    const validRead = await readFileTool.execute({ filePath: "package.json", startLine: 1, endLine: 5 });
    assert(validRead.success && typeof validRead.data.content === "string", "read_file succeeds on valid workspace file");

    const invalidRead = await readFileTool.execute({ filePath: "non_existent_file_12345.xyz" });
    assert(!invalidRead.success && !!invalidRead.error, "read_file handles non-existent file gracefully");

    const emptyArgsRead = await readFileTool.execute({ filePath: "" });
    assert(!emptyArgsRead.success && Boolean(emptyArgsRead.error?.includes("tidak kosong")), "read_file rejects empty filePath");
  }

  // 2. Safe write & patch in temporary test area
  const testDir = "tests/fixtures_temp";
  const testFile = `${testDir}/sample.txt`;
  await fs.mkdir(path.resolve(SecurityGate.getWorkspaceRoot(), testDir), { recursive: true });

  const writeTool = ToolRegistry.getTool("write_file");
  if (writeTool) {
    const writeRes = await writeTool.execute({ filePath: testFile, content: "Hello Antigravity 2.0" });
    assert(writeRes.success, "write_file succeeds in writing to workspace test folder");
  }

  const patchTool = ToolRegistry.getTool("patch_file");
  if (patchTool) {
    const patchRes = await patchTool.execute({
      filePath: testFile,
      targetText: "Hello Antigravity 2.0",
      replacementText: "Hello Autonomous DNA AI",
    });
    assert(patchRes.success, "patch_file replaces target text cleanly");

    // Patch non-matching text
    const failPatch = await patchTool.execute({
      filePath: testFile,
      targetText: "Non-existent string",
      replacementText: "New string",
    });
    assert(!failPatch.success && Boolean(failPatch.error?.includes("tidak ditemukan")), "patch_file fails cleanly when target text is absent");
  }

  // 3. Search codebase tool
  const searchTool = ToolRegistry.getTool("search_codebase");
  if (searchTool) {
    const searchRes = await searchTool.execute({ query: "dna-ai-tools", fileExtension: ".json" });
    assert(searchRes.success && searchRes.data.matchCount > 0, "search_codebase finds query occurrences");
  }

  // Cleanup test fixture
  try {
    await fs.rm(path.resolve(SecurityGate.getWorkspaceRoot(), testDir), { recursive: true, force: true });
  } catch {}
}

async function runTaskStateAndMemoryTests() {
  console.log("\n--- [3] TASK STATE & PROJECT MEMORY TESTS ---");

  // 1. Task State Manager
  const task = TaskStateManager.createTask("Test Goal 123", 5);
  assert(task.status === "planning" && task.maxIterations === 5, "createTask initializes with correct defaults");

  TaskStateManager.addLog(task.taskId, "Tester", "Step log message");
  const retrieved = TaskStateManager.getTask(task.taskId);
  assert(retrieved?.logs.length === 1 && retrieved.logs[0].message === "Step log message", "Task logs are tracked accurately");

  TaskStateManager.updateTask(task.taskId, { status: "completed" });
  assert(TaskStateManager.getTask(task.taskId)?.status === "completed", "updateTask mutates task state cleanly");

  // 2. Project Memory
  const loadedMemory = await ProjectMemory.load();
  assert(Array.isArray(loadedMemory.recentDecisions), "ProjectMemory loads array of decisions cleanly");

  await ProjectMemory.saveDecision({
    topic: "Unit Test Verification",
    decision: "All security checks automated",
    rationale: "Ensuring zero regression",
    filesAffected: ["lib/antigravity/security-gate.ts"],
  });

  const updatedMemory = await ProjectMemory.load();
  assert(
    updatedMemory.recentDecisions.some((d) => d.topic === "Unit Test Verification"),
    "saveDecision persists new technical decisions cleanly"
  );
}

async function main() {
  console.log("====================================================");
  console.log("🚀 STARTING ANTIGRAVITY ENGINE AUTOMATED AUDIT SUITE");
  console.log("====================================================");

  await runSecurityGateTests();
  await runToolRegistryTests();
  await runTaskStateAndMemoryTests();

  console.log("\n====================================================");
  console.log(`TEST SUITE RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("====================================================");

  if (failedCount > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Test suite fatal error:", err);
  process.exit(1);
});
