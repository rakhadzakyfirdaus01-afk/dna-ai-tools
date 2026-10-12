import http from "http";
import fs from "fs/promises";
import path from "path";
import { BrowserSecurityGate } from "../../lib/antigravity/browser/security";
import { BrowserEngine } from "../../lib/antigravity/browser/engine";
import { TaskStateManager } from "../../lib/antigravity/task-state";
import { SecurityGate } from "../../lib/antigravity/security-gate";

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passedCount++;
  } else {
    console.error(`  ✗ FAIL: ${testName}${detail ? " - " + detail : ""}`);
    failedCount++;
  }
}

async function runSsrfAndSecurityAuditTests() {
  console.log("\n--- [1] SSRF, ENCODINGS, AND DNS AUDIT TESTS ---");

  // 1. Hexadecimal IP Evasion
  const hex127 = BrowserSecurityGate.validateUrl("http://0x7f000001:8081");
  assert(!hex127.allowed, "Blocks 0x7f000001 (127.0.0.1) on non-whitelisted port");

  const hexMeta = BrowserSecurityGate.validateUrl("http://0xa9fea9fe/meta");
  assert(!hexMeta.allowed && Boolean(hexMeta.reason?.includes("metadata")), "Blocks 0xa9fea9fe (169.254.169.254 metadata)");

  const dottedHex = BrowserSecurityGate.validateUrl("http://0x7f.0.0.1:9090");
  assert(!dottedHex.allowed, "Blocks dotted hex 0x7f.0.0.1 on non-whitelisted port");

  // 2. Octal IP Evasion
  const octal127 = BrowserSecurityGate.validateUrl("http://0177.0.0.1:8081");
  assert(!octal127.allowed, "Blocks 0177.0.0.1 on non-whitelisted port");

  const octalMeta = BrowserSecurityGate.validateUrl("http://0251.0376.0251.0376/meta");
  assert(!octalMeta.allowed, "Blocks dotted octal metadata IP 0251.0376.0251.0376");

  // 3. IPv4-mapped IPv6 Evasion
  const mappedMeta = BrowserSecurityGate.validateUrl("http://[::ffff:169.254.169.254]/meta");
  assert(!mappedMeta.allowed, "Blocks IPv4-mapped IPv6 metadata [::ffff:169.254.169.254]");

  const mapped127 = BrowserSecurityGate.validateUrl("http://[::ffff:127.0.0.1]:8081");
  assert(!mapped127.allowed, "Blocks IPv4-mapped IPv6 loopback on non-whitelisted port");

  // 4. IPv6 Link-Local & Unique Local
  const fe80 = BrowserSecurityGate.validateUrl("http://[fe80::1]/admin");
  assert(!fe80.allowed && Boolean(fe80.reason?.includes("IPv6")), "Blocks IPv6 link-local [fe80::1]");

  const fc00 = BrowserSecurityGate.validateUrl("http://[fc00::1]/admin");
  assert(!fc00.allowed && Boolean(fc00.reason?.includes("IPv6")), "Blocks IPv6 unique-local [fc00::1]");

  // 5. Localhost Whitelist Port Control
  const nonWhitelistedPort = BrowserSecurityGate.validateUrl("http://localhost:8081");
  assert(!nonWhitelistedPort.allowed && Boolean(nonWhitelistedPort.reason?.includes("whitelist")), "Blocks localhost on non-whitelisted port 8081");

  const whitelistedPort = BrowserSecurityGate.validateUrl("http://localhost:3000");
  assert(whitelistedPort.allowed, "Allows localhost on standard web dev port 3000");

  // 6. Asynchronous DNS Validation
  const dnsLocal = await BrowserSecurityGate.validateUrlWithDns("http://localhost:3000");
  assert(dnsLocal.allowed, "validateUrlWithDns allows safe localhost:3000");

  const invalidHost = await BrowserSecurityGate.validateUrlWithDns("http://this-domain-definitely-does-not-exist-12345.test");
  assert(!invalidHost.allowed && Boolean(invalidHost.reason?.includes("tidak dapat di-resolve")), "validateUrlWithDns rejects non-resolvable domain safely");
}

async function runRedirectAndIsolationServerTests() {
  console.log("\n--- [2] REDIRECT SSRF & SESSION ISOLATION TESTS ---");

  const TEST_PORT = 49154;
  const BASE_URL = `http://localhost:${TEST_PORT}`;

  const server = http.createServer((req, res) => {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);

    if (url.pathname === "/safe-redirect") {
      res.writeHead(302, { Location: `${BASE_URL}/landing` });
      res.end();
      return;
    }

    if (url.pathname === "/ssrf-redirect") {
      // Simulasikan open redirect menuju cloud metadata
      res.writeHead(302, { Location: "http://169.254.169.254/latest/meta-data" });
      res.end();
      return;
    }

    if (url.pathname === "/bad-port-redirect") {
      // Simulasikan redirect menuju internal port tidak terdaftar
      res.writeHead(302, { Location: "http://localhost:6379/keys" });
      res.end();
      return;
    }

    if (url.pathname === "/landing") {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(`
        <!DOCTYPE html>
        <html>
        <head><title>Safe Landing Page</title></head>
        <body>
          <h1>Landing Page Berhasil</h1>
          <p>Navigasi aman terverifikasi.</p>
        </body>
        </html>
      `);
      return;
    }

    if (url.pathname === "/set-session") {
      const user = url.searchParams.get("user") || "anonymous";
      res.writeHead(200, {
        "Content-Type": "text/html",
        "Set-Cookie": `auth_user=${user}; Path=/`,
      });
      res.end(`<html><body>Logged in as ${user}</body></html>`);
      return;
    }

    if (url.pathname === "/check-session") {
      const cookieHeader = req.headers.cookie || "";
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ cookie: cookieHeader }));
      return;
    }

    res.writeHead(404);
    res.end();
  });

  await new Promise<void>((resolve) => server.listen(TEST_PORT, "127.0.0.1", () => resolve()));

  try {
    const engine = BrowserEngine.getInstance();

    // 1. Test Safe Redirect Follow
    const safePage = await engine.navigate(`${BASE_URL}/safe-redirect`, "session-safe");
    assert(safePage.status === 200, "Safe redirect berhasil diikuti");
    assert(safePage.title === "Safe Landing Page", "Safe redirect mendarat di landing page yang valid");
    assert(Boolean(safePage.redirectHistory && safePage.redirectHistory.length > 0), "Redirect history tercatat secara transparan");

    // 2. Test SSRF Open Redirect Shield (MUST BLOCK)
    let ssrfBlocked = false;
    try {
      await engine.navigate(`${BASE_URL}/ssrf-redirect`, "session-ssrf");
    } catch (err: any) {
      if (err.message.includes("diblokir pada redirect hop") || err.message.includes("metadata")) {
        ssrfBlocked = true;
      }
    }
    assert(ssrfBlocked, "BrowserEngine memblokir redirect menuju 169.254.169.254 (SSRF Redirect Shield)");

    // 3. Test Bad Port Redirect Shield (MUST BLOCK)
    let badPortBlocked = false;
    try {
      await engine.navigate(`${BASE_URL}/bad-port-redirect`, "session-bad-port");
    } catch (err: any) {
      if (err.message.includes("diblokir pada redirect hop") || err.message.includes("Port 6379")) {
        badPortBlocked = true;
      }
    }
    assert(badPortBlocked, "BrowserEngine memblokir redirect menuju port sensitif 6379");

    // 4. Test Multi-Session Cookie Isolation
    await engine.navigate(`${BASE_URL}/set-session?user=Alice`, "session-alice");
    await engine.navigate(`${BASE_URL}/set-session?user=Bob`, "session-bob");

    const aliceCheck = await engine.navigate(`${BASE_URL}/check-session`, "session-alice");
    const bobCheck = await engine.navigate(`${BASE_URL}/check-session`, "session-bob");

    assert(aliceCheck.rawHtml.includes("auth_user=Alice"), "Sesi Alice menyimpan cookie Alice secara terisolasi");
    assert(bobCheck.rawHtml.includes("auth_user=Bob"), "Sesi Bob menyimpan cookie Bob secara terisolasi");
    assert(!bobCheck.rawHtml.includes("Alice"), "Sesi Bob tidak bocor cookie milik Alice");

    // 5. Test Real Chromium Headless Screenshot
    const realBrowserPath = engine.getRealBrowserPath();
    if (realBrowserPath) {
      console.log(`\n  [INFO] Real browser terdeteksi: ${realBrowserPath}`);
      const shotResult = await engine.captureRealScreenshot(`${BASE_URL}/landing`, "stage5_audit_shot.png");
      assert(shotResult.success, "Real Chromium Headless berhasil mengeksekusi screenshot binary");
      if (shotResult.screenshotPath) {
        const buf = await fs.readFile(shotResult.screenshotPath);
        // Validasi PNG magic bytes (0x89 0x50 0x4E 0x47)
        const isPng = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
        assert(isPng && buf.length > 500, "Screenshot fisik merupakan file gambar PNG biner yang valid");
      }
    } else {
      console.log("  [INFO] Real browser tidak terdeteksi pada path standar.");
    }

  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

async function runAuthorizationAndSecurityGateTests() {
  console.log("\n--- [3] AUTHORIZATION & ACCESS CONTROL AUDIT TESTS ---");

  // 1. Multi-User Task Cancellation Isolation
  const taskUserA = await TaskStateManager.createTask("Task rahasia User A", "user_alpha@test.com");

  // User B mencoba membatalkan task User A
  const cancelByB = await TaskStateManager.requestCancel(taskUserA.taskId, "user_beta@test.com");
  assert(!cancelByB, "User B ditolak membatalkan tugas milik User A (Cross-User Protection)");

  // Anonymous mencoba membatalkan task User A
  const cancelByAnon = await TaskStateManager.requestCancel(taskUserA.taskId, "anonymous");
  assert(!cancelByAnon, "Anonymous ditolak membatalkan tugas milik user terautentikasi");

  // User A membatalkan tugas miliknya sendiri
  const cancelByA = await TaskStateManager.requestCancel(taskUserA.taskId, "user_alpha@test.com");
  assert(cancelByA, "User A berhasil membatalkan tugas miliknya sendiri secara sah");

  // 2. User Tasks List Isolation
  const taskUserB = await TaskStateManager.createTask("Task rahasia User B", "user_beta@test.com");
  const listForB = await TaskStateManager.listUserTasks("user_beta@test.com");
  assert(listForB.every((t) => t.userId === "user_beta@test.com"), "listUserTasks hanya mengembalikan tugas milik user pemohon");
  assert(!listForB.some((t) => t.userId === "user_alpha@test.com"), "listUserTasks tidak membocorkan tugas user lain");

  // 3. SecurityGate Sensitive File Access Protection
  const gitConfigCheck = SecurityGate.checkFileAccess(".git/config", "read");
  assert(!gitConfigCheck.allowed && gitConfigCheck.level === "blocked", "SecurityGate memblokir pembacaan file di dalam folder .git");

  const envDevCheck = SecurityGate.checkFileAccess(".env.development", "read");
  assert(!envDevCheck.allowed && envDevCheck.level === "blocked", "SecurityGate memblokir pembacaan file .env.development");

  // 4. Concurrency Worker Lock
  const lock1 = await TaskStateManager.acquireLock(taskUserB.taskId, "worker-1");
  assert(lock1, "Worker-1 berhasil mengunci tugas");

  const lock2 = await TaskStateManager.acquireLock(taskUserB.taskId, "worker-2");
  assert(!lock2, "Worker-2 dicegah mengunci tugas yang sedang aktif dikerjakan Worker-1");

  await TaskStateManager.releaseLock(taskUserB.taskId, "worker-1");
  const lock2After = await TaskStateManager.acquireLock(taskUserB.taskId, "worker-2");
  assert(lock2After, "Worker-2 berhasil mengunci tugas setelah Worker-1 melepas kuncinya");
  await TaskStateManager.releaseLock(taskUserB.taskId, "worker-2");
}

async function run() {
  console.log("====================================================");
  console.log("🛡️  DNA AI STAGE 5: INDEPENDENT SECURITY & BROWSER AUDIT");
  console.log("====================================================");

  try {
    await runSsrfAndSecurityAuditTests();
    await runRedirectAndIsolationServerTests();
    await runAuthorizationAndSecurityGateTests();
  } catch (err) {
    console.error("Audit encountered an error:", err);
    failedCount++;
  }

  console.log("\n====================================================");
  console.log(`STAGE 5 AUDIT RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("====================================================");

  if (failedCount > 0) {
    process.exit(1);
  }
}

run();
