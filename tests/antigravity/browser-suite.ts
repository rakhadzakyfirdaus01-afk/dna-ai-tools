import http from "http";
import fs from "fs/promises";
import path from "path";
import { BrowserSecurityGate } from "../../lib/antigravity/browser/security";
import { BrowserEngine } from "../../lib/antigravity/browser/engine";
import { ToolRegistry } from "../../lib/antigravity/tools/registry";

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
  console.log("\n--- [1] BROWSER SECURITY GATE & SSRF TESTS ---");

  // 1. Block Link-Local AWS/Cloud Metadata IP
  const metaCheck = BrowserSecurityGate.validateUrl("http://169.254.169.254/latest/meta-data/");
  assert(!metaCheck.allowed && Boolean(metaCheck.reason?.includes("metadata")), "Blocks cloud metadata IP 169.254.169.254");

  // 2. Block Cloud Metadata Hostname
  const metaHostCheck = BrowserSecurityGate.validateUrl("http://metadata.google.internal/computeMetadata/v1/");
  assert(!metaHostCheck.allowed, "Blocks GCP metadata hostname");

  // 3. Block Non-HTTP Protocols (file:)
  const fileCheck = BrowserSecurityGate.validateUrl("file:///C:/Windows/system32/cmd.exe");
  assert(!fileCheck.allowed && Boolean(fileCheck.reason?.includes("Protokol")), "Blocks file:// protocol access");

  // 4. Block Javascript Protocol
  const jsCheck = BrowserSecurityGate.validateUrl("javascript:alert(1)");
  assert(!jsCheck.allowed, "Blocks javascript: protocol");

  // 5. Block Private RFC1918 IPs (192.168.x.x, 10.x.x.x)
  const private192 = BrowserSecurityGate.validateUrl("http://192.168.1.1/admin");
  assert(!private192.allowed && Boolean(private192.reason?.includes("internal/private")), "Blocks private network 192.168.1.1");

  const private10 = BrowserSecurityGate.validateUrl("http://10.0.0.1/dashboard");
  assert(!private10.allowed && Boolean(private10.reason?.includes("internal/private")), "Blocks private network 10.0.0.1");

  // 6. Block Sensitive Internal Ports (Redis 6379, MySQL 3306)
  const redisPort = BrowserSecurityGate.validateUrl("http://localhost:6379");
  assert(!redisPort.allowed && Boolean(redisPort.reason?.includes("Port 6379")), "Blocks internal Redis port 6379 on localhost");

  const mysqlPort = BrowserSecurityGate.validateUrl("http://localhost:3306");
  assert(!mysqlPort.allowed && Boolean(mysqlPort.reason?.includes("Port 3306")), "Blocks internal MySQL port 3306 on localhost");

  // 7. Block Decimal Evasion for Cloud Metadata (2852039166 = 169.254.169.254)
  const decimalEvasion = BrowserSecurityGate.validateUrl("http://2852039166/latest/meta-data");
  assert(!decimalEvasion.allowed, "Blocks decimal integer evasion for metadata IP");

  // 8. Allow Localhost Dev Server on Standard Port
  const localApp = BrowserSecurityGate.validateUrl("http://localhost:3000/studio");
  assert(localApp.allowed && Boolean(localApp.sanitizedUrl), "Allows local dev server on safe port 3000");
}

async function runBrowserEngineAndServerTests() {
  console.log("\n--- [2] BROWSER ENGINE & AUTOMATION WORKFLOW TESTS ---");

  const TEST_PORT = 49153;
  const BASE_URL = `http://localhost:${TEST_PORT}`;

  // Buat mock HTTP server lokal untuk menguji workflow browser
  const server = http.createServer((req, res) => {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);

    if (url.pathname === "/") {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(`
        <!DOCTYPE html>
        <html>
        <head><title>DNA AI Test Portal</title></head>
        <body>
          <h1>Portal Pengujian Otomasi DNA AI</h1>
          <h2>Manajemen Akun</h2>
          <div role="alert" class="alert alert-warning">Peringatan: Mode pengujian aktif</div>
          <form id="authForm" action="/login" method="POST">
            <input type="text" name="username" placeholder="Username" value="" required />
            <input type="password" name="password" placeholder="Password" value="" required />
            <button type="submit" id="submitBtn">Masuk Sekarang</button>
          </form>
          <nav>
            <a href="/settings" id="settingsLink">Buka Pengaturan</a>
          </nav>
        </body>
        </html>
      `);
      return;
    }

    if (url.pathname === "/login" && req.method === "POST") {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk;
      });
      req.on("end", () => {
        const params = new URLSearchParams(body);
        const user = params.get("username");
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(`
          <!DOCTYPE html>
          <html>
          <head><title>Dashboard Pengguna</title></head>
          <body>
            <h1>Selamat Datang, ${user}!</h1>
            <p>Login Anda berhasil diverifikasi oleh Browser Agent.</p>
            <div role="alert" class="alert alert-success">Status: Terautentikasi</div>
            <a href="/">Kembali ke Beranda</a>
          </body>
          </html>
        `);
      });
      return;
    }

    if (url.pathname === "/settings") {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(`
        <!DOCTYPE html>
        <html>
        <head><title>Halaman Pengaturan</title></head>
        <body>
          <h1>Konfigurasi Preferensi</h1>
          <button id="saveConfig">Simpan Preferensi</button>
          <a href="/">Kembali ke Beranda</a>
        </body>
        </html>
      `);
      return;
    }

    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
  });

  await new Promise<void>((resolve) => server.listen(TEST_PORT, "127.0.0.1", () => resolve()));

  try {
    const engine = BrowserEngine.getInstance();

    // 1. Navigasi ke Halaman Utama
    const page1 = await engine.navigate(BASE_URL + "/");
    assert(page1.status === 200, "Navigasi berhasil dengan HTTP status 200");
    assert(page1.title === "DNA AI Test Portal", "Judul dokumen terbaca dengan akurat");
    assert(page1.headings.length >= 2, "Heading h1 dan h2 terekstraksi");
    assert(page1.forms.length === 1, "Formulir login teridentifikasi di DOM");
    assert(page1.alerts.some((a) => a.includes("Mode pengujian aktif")), "Alert/peringatan DOM terdeteksi");

    // 2. Query Elemen DOM
    const buttons = engine.findElements({ tag: "button" });
    assert(buttons.length >= 1 && Boolean(buttons[0].text?.includes("Masuk")), "Mencari tombol via tag dan teks berhasil");

    const links = engine.findElements({ role: "link" });
    assert(links.length >= 1, "Mencari tautan via role ARIA berhasil");

    // 3. Form Fill & Submit
    const pageAfterLogin = await engine.fillForm(
      "authForm",
      { username: "rakha_tester", password: "securePassword123" },
      true
    );
    assert(pageAfterLogin.status === 200, "Form POST berhasil diproses");
    assert(pageAfterLogin.title === "Dashboard Pengguna", "Halaman berhasil dialihkan ke dashboard");
    assert(pageAfterLogin.headings.some((h) => h.includes("rakha_tester")), "Parameter form tersubmit dan tampil di respons");
    assert(pageAfterLogin.alerts.some((a) => a.includes("Terautentikasi")), "Status terautentikasi diverifikasi");

    // 4. Click Link Navigation
    const clickResult = await engine.clickElement({ text: "Kembali ke Beranda" });
    assert(clickResult.actionType === "navigated", "Link click memicu navigasi URL");
    assert(clickResult.newPage.title === "DNA AI Test Portal", "Kembali ke halaman beranda melalui klik link");

    // 5. Visual Wireframe Snapshot & Artifact Creation
    const snapshot = await engine.captureVisualSnapshot("Dashboard E2E Inspection");
    assert(Boolean(snapshot.snapshotId), "Snapshot ID unik terbentuk");
    assert(snapshot.status === 200, "Snapshot menyimpan status halaman valid");
    assert(snapshot.layoutWireframe.includes("[BROWSER INSPECTION]"), "Wireframe layout terkonstruksi");

    // 6. Verifikasi File Fisik Artefak di Disk
    const fileExists = await fs
      .access(snapshot.artifactPath)
      .then(() => true)
      .catch(() => false);
    assert(fileExists, `File artefak snapshot fisik tersimpan di disk (${snapshot.artifactPath})`);

    const jsonContent = JSON.parse(await fs.readFile(snapshot.artifactPath, "utf-8"));
    assert(jsonContent.snapshotId === snapshot.snapshotId, "Metadata JSON artefak valid dan sesuai");

    // 7. Sesi Cleanup
    engine.closeSession();
    assert(engine.getCurrentPage() === null, "closeSession() membersihkan sesi dan memori dengan tuntas");

  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

async function runBrowserToolRegistryTests() {
  console.log("\n--- [3] BROWSER TOOL REGISTRY INTEGRATION TESTS ---");

  const requiredTools = [
    "browser_navigate",
    "browser_query",
    "browser_click",
    "browser_fill_form",
    "browser_snapshot",
    "browser_close",
  ];

  for (const name of requiredTools) {
    const tool = ToolRegistry.getTool(name);
    assert(Boolean(tool), `Tool '${name}' terdaftar dan tersedia di ToolRegistry`);
  }

  // Uji penolakan input tidak valid pada browser_navigate
  const navTool = ToolRegistry.getTool("browser_navigate")!;
  const invalidResult = await navTool.execute({ url: "" });
  assert(!invalidResult.success, "browser_navigate menolak URL kosong secara tervalidasi");

  const ssrfResult = await navTool.execute({ url: "http://169.254.169.254/meta-data" });
  assert(!ssrfResult.success, "browser_navigate memblokir target SSRF");

  // Uji penutupan browser tool
  const closeTool = ToolRegistry.getTool("browser_close")!;
  const closeResult = await closeTool.execute({});
  assert(closeResult.success, "browser_close dieksekusi dengan sukses");
}

async function run() {
  console.log("====================================================");
  console.log("🌐 STARTING BROWSER AGENT & WEB AUTOMATION AUDIT SUITE");
  console.log("====================================================");

  try {
    await runSecurityGateTests();
    await runBrowserEngineAndServerTests();
    await runBrowserToolRegistryTests();
  } catch (err) {
    console.error("Test execution encountered an error:", err);
    failedCount++;
  }

  console.log("\n====================================================");
  console.log(`BROWSER SUITE RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("====================================================");

  if (failedCount > 0) {
    process.exit(1);
  }
}

run();
