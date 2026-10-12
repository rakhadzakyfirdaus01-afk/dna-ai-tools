import fs from "fs/promises";
import path from "path";
import os from "os";
import { WorkspaceManager } from "../../lib/antigravity/workspace-manager";
import { SecurityGate } from "../../lib/antigravity/security-gate";
import { ToolRegistry } from "../../lib/antigravity/tools/registry";

let passedCount = 0;
let failedCount = 0;

function assert(condition: any, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passedCount++;
  } else {
    console.error(`  ✗ FAIL: ${testName}${detail ? " - " + detail : ""}`);
    failedCount++;
  }
}

async function runWorkspaceTests() {
  console.log("====================================================");
  console.log("🔒 WORKSPACE & TERMINAL PRODUCTION SECURITY TEST SUITE");
  console.log("====================================================");

  const userAlice = "alice@example.com";
  const userBob = "bob@example.com";

  // ----------------------------------------------------
  // TEST 1: Hash identifier yang aman dan stabil
  // ----------------------------------------------------
  console.log("\n--- [1] Safe User Workspace Identifier Hashing ---");
  const hashAlice = WorkspaceManager.hashUserId(userAlice);
  const hashBob = WorkspaceManager.hashUserId(userBob);
  assert(hashAlice.startsWith("ws-"), "Hash Alice berformat ws-*");
  assert(hashBob.startsWith("ws-"), "Hash Bob berformat ws-*");
  assert(hashAlice !== hashBob, "Hash Alice dan Bob berbeda secara kriptografis");
  assert(!hashAlice.includes("alice@"), "Hash tidak membocorkan email atau userId mentah");

  // ----------------------------------------------------
  // TEST 2: Workspace writable initialization
  // ----------------------------------------------------
  console.log("\n--- [2] User Workspace Initialization & Writable Check ---");
  const wsAlice = await WorkspaceManager.getOrCreateWorkspace(userAlice);
  assert(Boolean(wsAlice.workspaceDir), "Workspace Alice berhasil diinisialisasi");
  
  // Test write file langsung ke workspace Alice
  const testFileAlice = path.join(wsAlice.workspaceDir, "test-write.txt");
  await fs.writeFile(testFileAlice, "Hello from Alice", "utf-8");
  const readBackAlice = await fs.readFile(testFileAlice, "utf-8");
  assert(readBackAlice === "Hello from Alice", "File berhasil dibuat dan dibaca kembali di workspace Alice");

  // ----------------------------------------------------
  // TEST 3: ToolRegistry write_file & read_file dengan context user
  // ----------------------------------------------------
  console.log("\n--- [3] ToolRegistry Per-User Scoped File Operations ---");
  const writeTool = ToolRegistry.getTool("write_file");
  const readTool = ToolRegistry.getTool("read_file");
  const patchTool = ToolRegistry.getTool("patch_file");

  assert(writeTool !== undefined, "Tool write_file terdaftar");
  assert(readTool !== undefined, "Tool read_file terdaftar");
  assert(patchTool !== undefined, "Tool patch_file terdaftar");

  // Alice menulis file melalui ToolRegistry
  const writeRes = await writeTool!.execute(
    { filePath: "module.js", content: "function test() { return 1; }" },
    false,
    { userId: userAlice }
  );
  assert(writeRes.success === true, "Alice berhasil menulis 'module.js' via write_file tool");

  // Alice membaca file melalui ToolRegistry
  const readRes = await readTool!.execute(
    { filePath: "module.js" },
    false,
    { userId: userAlice }
  );
  assert(readRes.success === true, "Alice berhasil membaca 'module.js' via read_file tool");
  assert(readRes.data?.content.includes("return 1;"), "Konten 'module.js' Alice sesuai");

  // Alice melakukan patch file
  const patchRes = await patchTool!.execute(
    { filePath: "module.js", targetText: "return 1;", replacementText: "return 2;" },
    false,
    { userId: userAlice }
  );
  assert(patchRes.success === true, "Alice berhasil memodifikasi 'module.js' via patch_file tool");

  const verifyPatch = await readTool!.execute(
    { filePath: "module.js" },
    false,
    { userId: userAlice }
  );
  assert(verifyPatch.data?.content.includes("return 2;"), "Hasil patch 'module.js' terverifikasi bernilai 'return 2;'");

  // ----------------------------------------------------
  // TEST 4: Isolasi Antar-Pengguna (User Isolation)
  // ----------------------------------------------------
  console.log("\n--- [4] Cross-User Workspace Isolation ---");
  // Bob mencoba membaca file milik Alice
  const bobAttempt = await readTool!.execute(
    { filePath: "module.js" },
    false,
    { userId: userBob }
  );
  assert(bobAttempt.success === false, "Bob tidak dapat membaca 'module.js' milik Alice (File not found di workspace Bob)");

  // ----------------------------------------------------
  // TEST 5: Path Traversal Prevention
  // ----------------------------------------------------
  console.log("\n--- [5] Path Traversal & Out-of-Workspace Attack Prevention ---");
  const traversalAttempt = await writeTool!.execute(
    { filePath: "../../../etc/passwd", content: "evil" },
    false,
    { userId: userAlice }
  );
  assert(traversalAttempt.success === false, "Path traversal '../' diblokir oleh SecurityGate");
  assert(traversalAttempt.error?.includes("luar workspace"), "Pesan penolakan traversal informatif dan jelas");

  // Bob mencoba membaca workspace Alice via relative path
  const crossUserTraversal = await readTool!.execute(
    { filePath: `../${hashAlice}/test-write.txt` },
    false,
    { userId: userBob }
  );
  assert(crossUserTraversal.success === false, "Bob mencoba traversal ke workspace Alice diblokir mutlak");

  // ----------------------------------------------------
  // TEST 6: Proteksi Berkas Sensitif (.env, .git)
  // ----------------------------------------------------
  console.log("\n--- [6] Sensitive File Protection (.env, .git) ---");
  const dotEnvAttempt = await writeTool!.execute(
    { filePath: ".env", content: "SECRET=123" },
    false,
    { userId: userAlice }
  );
  assert(dotEnvAttempt.success === false, "Menulis .env diblokir oleh SecurityGate");

  const gitAttempt = await writeTool!.execute(
    { filePath: ".git/config", content: "corrupted" },
    false,
    { userId: userAlice }
  );
  assert(gitAttempt.success === false, "Menulis .git direktori diblokir oleh SecurityGate");

  // ----------------------------------------------------
  // TEST 7: Terminal Execution di Workspace Per-User
  // ----------------------------------------------------
  console.log("\n--- [7] Terminal Execution User-Scoped Workspace ---");
  const termTool = ToolRegistry.getTool("run_terminal_command");
  assert(termTool !== undefined, "Tool run_terminal_command terdaftar");

  // Jalankan echo/touch file di terminal
  const touchRes = await termTool!.execute(
    { command: "echo hello > terminal-test.txt" },
    true,
    { userId: userAlice }
  );
  assert(touchRes.success === true, "Perintah pembuatan file di terminal berhasil dijalankan");

  // Verifikasi file terbentuk di workspace Alice
  const aliceTermFile = path.join(wsAlice.workspaceDir, "terminal-test.txt");
  const fileExists = await fs.access(aliceTermFile).then(() => true).catch(() => false);
  assert(fileExists === true, "File hasil perintah terminal tersimpan tepat di direktori workspace Alice");

  // ----------------------------------------------------
  // TEST 8: Terminal Security Block (Dangerous Command)
  // ----------------------------------------------------
  console.log("\n--- [8] Terminal Dangerous Command Blocking ---");
  const dangerousRes = await termTool!.execute(
    { command: "rm -rf /" },
    true,
    { userId: userAlice }
  );
  assert(dangerousRes.success === false, "Perintah destruktif 'rm -rf /' diblokir oleh SecurityGate");
}

async function run() {
  try {
    await runWorkspaceTests();
  } catch (err) {
    console.error("Workspace tests encountered an unexpected error:", err);
    failedCount++;
  }

  console.log("\n====================================================");
  console.log(`WORKSPACE TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("====================================================");

  if (failedCount > 0) {
    process.exit(1);
  }
}

run();
