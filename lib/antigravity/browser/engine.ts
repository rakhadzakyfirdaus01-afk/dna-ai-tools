import fs from "fs/promises";
import path from "path";
import os from "os";
import { execFile } from "child_process";
import { promisify } from "util";
import { URL } from "url";
import { BrowserSecurityGate } from "./security";

const execFileAsync = promisify(execFile);

export interface DOMElement {
  tag: string;
  id?: string;
  name?: string;
  type?: string;
  role?: string;
  text?: string;
  href?: string;
  value?: string;
  className?: string;
  placeholder?: string;
  attributes: Record<string, string>;
}

export interface FormField {
  name: string;
  tag: string;
  type?: string;
  value?: string;
  required?: boolean;
  placeholder?: string;
}

export interface FormInfo {
  id?: string;
  action: string;
  method: "GET" | "POST";
  fields: FormField[];
}

export interface PageState {
  url: string;
  status: number;
  statusText: string;
  title: string;
  contentType: string;
  loadTimeMs: number;
  headings: string[];
  links: { text: string; href: string }[];
  buttons: { text: string; role?: string; type?: string; id?: string }[];
  forms: FormInfo[];
  alerts: string[];
  interactiveElements: DOMElement[];
  rawHtml: string;
  redirectHistory?: string[];
  realScreenshotPath?: string;
}

export interface ElementQuery {
  selector?: string;
  role?: string;
  text?: string;
  tag?: string;
  name?: string;
  id?: string;
}

export interface VisualSnapshotArtifact {
  snapshotId: string;
  url: string;
  title: string;
  status: number;
  timestamp: string;
  artifactPath: string;
  realScreenshotPath?: string;
  layoutWireframe: string;
  interactiveCount: number;
  detectedAlerts: string[];
  engineType: "Lightweight-DOM-Parser" | "Real-Headless-Chromium";
}

export class BrowserEngine {
  private static instance: BrowserEngine | null = null;
  
  // Sesi terisolasi per task atau ID sesi untuk mencegah kebocoran antar-user
  private sessions: Map<string, {
    page: PageState | null;
    history: string[];
    cookies: Map<string, string>;
  }> = new Map();

  private defaultSessionId = "default-session";
  private artifactsDir: string;
  private realBrowserPath: string | null = null;

  public constructor() {
    this.artifactsDir = path.resolve(process.cwd(), ".antigravity-artifacts", "snapshots");
    this.detectLocalBrowser();
  }

  public static getInstance(): BrowserEngine {
    if (!BrowserEngine.instance) {
      BrowserEngine.instance = new BrowserEngine();
    }
    return BrowserEngine.instance;
  }

  /**
   * Deteksi apakah Chrome atau Edge terpasang di sistem untuk Real Browser automation
   */
  private async detectLocalBrowser(): Promise<void> {
    const candidates = [
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
      "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    ];

    for (const bin of candidates) {
      try {
        await fs.access(bin);
        this.realBrowserPath = bin;
        break;
      } catch {}
    }
  }

  /**
   * Mendapatkan status path binary browser sungguhan
   */
  public getRealBrowserPath(): string | null {
    return this.realBrowserPath;
  }

  /**
   * Mengambil atau menginisialisasi sesi terisolasi
   */
  private getSession(sessionId = this.defaultSessionId) {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, {
        page: null,
        history: [],
        cookies: new Map(),
      });
    }
    return this.sessions.get(sessionId)!;
  }

  /**
   * Mengambil status halaman saat ini
   */
  public getCurrentPage(sessionId = this.defaultSessionId): PageState | null {
    return this.getSession(sessionId).page;
  }

  /**
   * Helper pembersih HTML tag menjadi teks
   */
  private static stripHtml(html: string): string {
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Parse atribut tag HTML
   */
  private static parseAttributes(tagContent: string): Record<string, string> {
    const attrs: Record<string, string> = {};
    const regex = /([a-zA-Z0-9_-]+)(?:=(?:"([^"]*)"|'([^']*)'|([^>\s]+)))?/g;
    let match;
    while ((match = regex.exec(tagContent)) !== null) {
      const key = match[1].toLowerCase();
      const val = match[2] ?? match[3] ?? match[4] ?? "";
      attrs[key] = val;
    }
    return attrs;
  }

  /**
   * Parser DOM mandiri untuk analisis dokumen HTML
   */
  private parseHtmlDocument(html: string, currentUrl: string): PageState {
    // 1. Ekstrak Judul
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : "Untitled Page";

    // 2. Ekstrak Heading (h1-h3)
    const headings: string[] = [];
    const headingRegex = /<h[1-3][^>]*>(.*?)<\/h[1-3]>/gi;
    let hMatch;
    while ((hMatch = headingRegex.exec(html)) !== null) {
      const text = BrowserEngine.stripHtml(hMatch[1]);
      if (text) headings.push(text);
    }

    // 3. Ekstrak Tautan
    const links: { text: string; href: string }[] = [];
    const linkRegex = /<a\s+([^>]*?)>(.*?)<\/a>/gi;
    let lMatch;
    while ((lMatch = linkRegex.exec(html)) !== null) {
      const attrs = BrowserEngine.parseAttributes(lMatch[1]);
      const text = BrowserEngine.stripHtml(lMatch[2]);
      if (attrs.href) {
        let resolvedHref = attrs.href;
        try {
          resolvedHref = new URL(attrs.href, currentUrl).toString();
        } catch {}
        links.push({ text: text || attrs.href, href: resolvedHref });
      }
    }

    // 4. Ekstrak Tombol
    const buttons: { text: string; role?: string; type?: string; id?: string }[] = [];
    const buttonRegex = /<button\s*([^>]*?)>(.*?)<\/button>/gi;
    let bMatch;
    while ((bMatch = buttonRegex.exec(html)) !== null) {
      const attrs = BrowserEngine.parseAttributes(bMatch[1]);
      const text = BrowserEngine.stripHtml(bMatch[2]);
      buttons.push({
        text: text || attrs.id || "Button",
        type: attrs.type || "button",
        role: attrs.role || "button",
        id: attrs.id,
      });
    }

    // Input submit / button
    const inputButtonRegex = /<input\s+([^>]*type=["']?(?:button|submit)["'][^>]*)>/gi;
    let ibMatch;
    while ((ibMatch = inputButtonRegex.exec(html)) !== null) {
      const attrs = BrowserEngine.parseAttributes(ibMatch[1]);
      buttons.push({
        text: attrs.value || attrs.name || "Submit",
        type: attrs.type,
        role: "button",
        id: attrs.id,
      });
    }

    // 5. Ekstrak Form
    const forms: FormInfo[] = [];
    const formRegex = /<form\s*([^>]*?)>([\s\S]*?)<\/form>/gi;
    let fMatch;
    while ((fMatch = formRegex.exec(html)) !== null) {
      const formAttrs = BrowserEngine.parseAttributes(fMatch[1]);
      const formBody = fMatch[2];
      const fields: FormField[] = [];

      const inputRegex = /<input\s+([^>]*?)>/gi;
      let inpMatch;
      while ((inpMatch = inputRegex.exec(formBody)) !== null) {
        const inpAttrs = BrowserEngine.parseAttributes(inpMatch[1]);
        if (inpAttrs.name) {
          fields.push({
            name: inpAttrs.name,
            tag: "input",
            type: inpAttrs.type || "text",
            value: inpAttrs.value,
            placeholder: inpAttrs.placeholder,
            required: "required" in inpAttrs,
          });
        }
      }

      const textareaRegex = /<textarea\s+([^>]*?)>([\s\S]*?)<\/textarea>/gi;
      let taMatch;
      while ((taMatch = textareaRegex.exec(formBody)) !== null) {
        const taAttrs = BrowserEngine.parseAttributes(taMatch[1]);
        if (taAttrs.name) {
          fields.push({
            name: taAttrs.name,
            tag: "textarea",
            value: taMatch[2].trim(),
            placeholder: taAttrs.placeholder,
          });
        }
      }

      let formAction = formAttrs.action || currentUrl;
      try {
        formAction = new URL(formAction, currentUrl).toString();
      } catch {}

      forms.push({
        id: formAttrs.id,
        action: formAction,
        method: formAttrs.method?.toUpperCase() === "POST" ? "POST" : "GET",
        fields,
      });
    }

    // 6. Ekstrak Alert & Pesan Error
    const alerts: string[] = [];
    const alertRegex =
      /<(?:div|p|span)\s+([^>]*?(?:role=["']alert["']|class=["'][^"']*(?:error|alert|warning|danger)[^"']*)[^>]*?)>(.*?)<\/(?:div|p|span)>/gi;
    let alMatch;
    while ((alMatch = alertRegex.exec(html)) !== null) {
      const alertText = BrowserEngine.stripHtml(alMatch[2]);
      if (alertText) alerts.push(alertText);
    }

    // 7. Interactive Elements List
    const interactiveElements: DOMElement[] = [];
    links.forEach((l) =>
      interactiveElements.push({
        tag: "a",
        text: l.text,
        href: l.href,
        role: "link",
        attributes: { href: l.href },
      })
    );
    buttons.forEach((b) =>
      interactiveElements.push({
        tag: "button",
        id: b.id,
        text: b.text,
        type: b.type,
        role: b.role,
        attributes: { type: b.type || "button" },
      })
    );

    return {
      url: currentUrl,
      status: 200,
      statusText: "OK",
      title,
      contentType: "text/html",
      loadTimeMs: 0,
      headings,
      links,
      buttons,
      forms,
      alerts,
      interactiveElements,
      rawHtml: html,
    };
  }

  /**
   * Navigasi URL dengan perlindungan redirect bertahap (mencegah SSRF Open Redirect bypass)
   */
  public async navigate(url: string, sessionId = this.defaultSessionId): Promise<PageState> {
    const session = this.getSession(sessionId);

    // 1. Validasi URL Awal
    const sec = BrowserSecurityGate.validateUrl(url, true);
    if (!sec.allowed || !sec.sanitizedUrl) {
      throw new Error(sec.reason || "URL ditolak oleh Security Gate.");
    }

    let currentTarget = sec.sanitizedUrl;
    const startTime = Date.now();
    const redirectHistory: string[] = [];
    const maxRedirectHops = 5;
    let hops = 0;
    let response: Response | null = null;

    // Loop penanganan redirect secara manual agar setiap target redirect tervalidasi
    while (hops <= maxRedirectHops) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const headers: Record<string, string> = {
        "User-Agent": "Antigravity-BrowserAgent/2.0 (Headless; Autonomous)",
        Accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
      };

      if (session.cookies.size > 0) {
        headers["Cookie"] = Array.from(session.cookies.entries())
          .map(([k, v]) => `${k}=${v}`)
          .join("; ");
      }

      try {
        response = await fetch(currentTarget, {
          method: "GET",
          headers,
          redirect: "manual", // Handle manual agar setiap redirect divalidasi
          signal: controller.signal,
        });
      } catch (err: any) {
        clearTimeout(timeoutId);
        if (err.name === "AbortError") {
          throw new Error(`Permintaan ke '${currentTarget}' melebihi batas waktu (Timeout 15s).`);
        }
        throw new Error(`Koneksi jaringan gagal ke '${currentTarget}': ${err.message}`);
      } finally {
        clearTimeout(timeoutId);
      }

      // Simpan Set-Cookie
      const setCookie = response.headers.get("set-cookie");
      if (setCookie) {
        const parts = setCookie.split(";")[0].split("=");
        if (parts.length >= 2) {
          session.cookies.set(parts[0].trim(), parts[1].trim());
        }
      }

      // Deteksi status HTTP Redirect (301, 302, 303, 307, 308)
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        if (!location) break;

        hops++;
        redirectHistory.push(currentTarget);

        let nextUrl: string;
        try {
          nextUrl = new URL(location, currentTarget).toString();
        } catch {
          throw new Error(`Header redirect location tidak valid: '${location}'`);
        }

        // VALIDASI SSRF PADA SETIAP HOP REDIRECT!
        const redirectSec = BrowserSecurityGate.validateUrl(nextUrl, true);
        if (!redirectSec.allowed || !redirectSec.sanitizedUrl) {
          throw new Error(
            `Akses diblokir pada redirect hop #${hops}: Target redirect '${nextUrl}' terindikasi berbahaya (${redirectSec.reason}).`
          );
        }

        currentTarget = redirectSec.sanitizedUrl;
        continue;
      }

      // Bukan redirect, respons final tercapai
      break;
    }

    if (!response) {
      throw new Error("Tidak ada respons yang diterima dari target.");
    }

    const loadTimeMs = Date.now() - startTime;
    const contentType = response.headers.get("content-type") || "text/html";
    const bodyText = await response.text();

    const pageState = this.parseHtmlDocument(bodyText, currentTarget);
    pageState.status = response.status;
    pageState.statusText = response.statusText;
    pageState.contentType = contentType;
    pageState.loadTimeMs = loadTimeMs;
    pageState.redirectHistory = redirectHistory;

    session.page = pageState;
    session.history.push(pageState.url);

    return pageState;
  }

  /**
   * Real Chromium Headless Engine: Mengambil screenshot asli menggunakan browser Chrome lokal
   */
  public async captureRealScreenshot(
    targetUrl: string,
    outputFilename?: string
  ): Promise<{ success: boolean; screenshotPath?: string; error?: string }> {
    if (!this.realBrowserPath) {
      return {
        success: false,
        error: "Real Chrome/Edge executable tidak ditemukan pada sistem.",
      };
    }

    const sec = BrowserSecurityGate.validateUrl(targetUrl, true);
    if (!sec.allowed || !sec.sanitizedUrl) {
      return { success: false, error: sec.reason };
    }

    await fs.mkdir(this.artifactsDir, { recursive: true });

    const filename = outputFilename || `real_shot_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.png`;
    const outputPath = path.join(this.artifactsDir, filename);

    // Buat profil direktori sementara yang terisolasi agar tidak mengganggu sesi pengguna
    const tempUserDataDir = path.join(os.tmpdir(), `antigravity-chrome-${Date.now()}`);

    try {
      await fs.mkdir(tempUserDataDir, { recursive: true });

      const args = [
        "--headless=new",
        `--user-data-dir=${tempUserDataDir}`,
        "--disable-gpu",
        "--hide-scrollbars",
        "--window-size=1280,800",
        `--screenshot=${outputPath}`,
        sec.sanitizedUrl,
      ];

      await execFileAsync(this.realBrowserPath, args, { timeout: 20000 });

      const fileExists = await fs
        .access(outputPath)
        .then(() => true)
        .catch(() => false);

      if (fileExists) {
        return { success: true, screenshotPath: outputPath };
      }
      return { success: false, error: "Chrome selesai namun file screenshot tidak terbentuk." };
    } catch (err: any) {
      return { success: false, error: `Eksekusi Real Headless Chrome gagal: ${err.message}` };
    } finally {
      // Bersihkan profil sementara
      try {
        await fs.rm(tempUserDataDir, { recursive: true, force: true });
      } catch {}
    }
  }

  /**
   * Mencari elemen DOM berdasarkan query
   */
  public findElements(query: ElementQuery, sessionId = this.defaultSessionId): DOMElement[] {
    const session = this.getSession(sessionId);
    if (!session.page) {
      throw new Error("Tidak ada halaman yang aktif. Jalankan navigate() terlebih dahulu.");
    }

    const { tag, role, text, name, id } = query;
    return session.page.interactiveElements.filter((el) => {
      if (tag && el.tag.toLowerCase() !== tag.toLowerCase()) return false;
      if (role && el.role?.toLowerCase() !== role.toLowerCase()) return false;
      if (id && el.id !== id) return false;
      if (name && el.name !== name) return false;
      if (text && (!el.text || !el.text.toLowerCase().includes(text.toLowerCase()))) {
        return false;
      }
      return true;
    });
  }

  /**
   * Mengklik elemen tombol atau link
   */
  public async clickElement(
    query: ElementQuery,
    sessionId = this.defaultSessionId
  ): Promise<{
    clicked: DOMElement;
    actionType: "navigated" | "triggered";
    newPage: PageState;
  }> {
    const session = this.getSession(sessionId);
    if (!session.page) {
      throw new Error("Tidak ada halaman yang aktif. Jalankan navigate() terlebih dahulu.");
    }

    const matches = this.findElements(query, sessionId);
    if (matches.length === 0) {
      throw new Error(`Elemen tidak ditemukan dengan kriteria: ${JSON.stringify(query)}`);
    }

    const target = matches[0];

    // Jika tautan (link)
    if (target.href) {
      const newPage = await this.navigate(target.href, sessionId);
      return { clicked: target, actionType: "navigated", newPage };
    }

    // Jika tombol form
    if (target.tag === "button" || target.type === "submit") {
      if (session.page.forms.length > 0) {
        const form = session.page.forms[0];
        const dummyData: Record<string, string> = {};
        form.fields.forEach((f) => {
          dummyData[f.name] = f.value || "";
        });
        const newPage = await this.fillForm("", dummyData, true, sessionId);
        return { clicked: target, actionType: "triggered", newPage };
      }
    }

    return {
      clicked: target,
      actionType: "triggered",
      newPage: session.page,
    };
  }

  /**
   * Mengisi data form dan melakukan submit
   */
  public async fillForm(
    formSelector: string,
    fields: Record<string, string>,
    submit = true,
    sessionId = this.defaultSessionId
  ): Promise<PageState> {
    const session = this.getSession(sessionId);
    if (!session.page) {
      throw new Error("Tidak ada halaman yang aktif. Jalankan navigate() terlebih dahulu.");
    }

    let targetForm: FormInfo | undefined;
    if (formSelector) {
      targetForm = session.page.forms.find(
        (f) => f.id === formSelector || f.action.includes(formSelector)
      );
    }

    if (!targetForm && session.page.forms.length > 0) {
      targetForm = session.page.forms[0];
    }

    if (!targetForm) {
      throw new Error("Formulir tidak ditemukan pada halaman saat ini.");
    }

    for (const f of targetForm.fields) {
      if (fields[f.name] !== undefined) {
        f.value = fields[f.name];
      }
    }

    if (!submit) {
      return session.page;
    }

    const sec = BrowserSecurityGate.validateUrl(targetForm.action, true);
    if (!sec.allowed || !sec.sanitizedUrl) {
      throw new Error(`Action URL formulir diblokir: ${sec.reason}`);
    }

    const startTime = Date.now();
    let response: Response;

    if (targetForm.method === "POST") {
      const formData = new URLSearchParams();
      for (const [k, v] of Object.entries(fields)) {
        formData.append(k, v);
      }

      response = await fetch(sec.sanitizedUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "Antigravity-BrowserAgent/2.0",
        },
        body: formData.toString(),
      });
    } else {
      const submitUrl = new URL(sec.sanitizedUrl);
      for (const [k, v] of Object.entries(fields)) {
        submitUrl.searchParams.set(k, v);
      }
      response = await fetch(submitUrl.toString(), {
        method: "GET",
        headers: { "User-Agent": "Antigravity-BrowserAgent/2.0" },
      });
    }

    const loadTimeMs = Date.now() - startTime;
    const bodyText = await response.text();
    const contentType = response.headers.get("content-type") || "text/html";

    const newPage = this.parseHtmlDocument(bodyText, response.url || sec.sanitizedUrl);
    newPage.status = response.status;
    newPage.statusText = response.statusText;
    newPage.contentType = contentType;
    newPage.loadTimeMs = loadTimeMs;

    session.page = newPage;
    session.history.push(newPage.url);

    return newPage;
  }

  /**
   * Menangkap visual snapshot layout dan screenshot (jika real browser aktif)
   */
  public async captureVisualSnapshot(
    label = "Inspection Snapshot",
    sessionId = this.defaultSessionId,
    captureRealBrowserShot = true
  ): Promise<VisualSnapshotArtifact> {
    const session = this.getSession(sessionId);
    if (!session.page) {
      throw new Error("Tidak ada halaman yang aktif untuk diinspeksi.");
    }

    await fs.mkdir(this.artifactsDir, { recursive: true });

    const snapshotId = `snap_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const artifactJsonPath = path.join(this.artifactsDir, `${snapshotId}.json`);
    const artifactHtmlPath = path.join(this.artifactsDir, `${snapshotId}.html`);

    let realShotPath: string | undefined;

    // Jika Real Browser tersedia dan diizinkan, ambil screenshot binary asli
    if (captureRealBrowserShot && this.realBrowserPath && session.page.url.startsWith("http")) {
      const shotResult = await this.captureRealScreenshot(
        session.page.url,
        `${snapshotId}_real.png`
      );
      if (shotResult.success && shotResult.screenshotPath) {
        realShotPath = shotResult.screenshotPath;
      }
    }

    const wireframeLines: string[] = [
      `+-------------------------------------------------------------+`,
      `| [BROWSER INSPECTION] ${session.page.title.slice(0, 40).padEnd(40, " ")} |`,
      `| URL: ${session.page.url.slice(0, 48).padEnd(48, " ")} |`,
      `| HTTP STATUS: ${session.page.status} ${session.page.statusText} (${session.page.loadTimeMs}ms) |`,
      `| REAL SCREENSHOT: ${(realShotPath ? "AVAILABLE (PNG)" : "N/A (HTML Wireframe)").padEnd(42, " ")} |`,
      `+-------------------------------------------------------------+`,
    ];

    if (session.page.alerts.length > 0) {
      wireframeLines.push(`| [!] DETECTED ALERTS / ERRORS:`);
      session.page.alerts.forEach((alt) => {
        wireframeLines.push(`|     * ${alt.slice(0, 50)}`);
      });
      wireframeLines.push(`+-------------------------------------------------------------+`);
    }

    if (session.page.headings.length > 0) {
      wireframeLines.push(`| HEADINGS:`);
      session.page.headings.slice(0, 5).forEach((h) => {
        wireframeLines.push(`|   # ${h.slice(0, 52)}`);
      });
      wireframeLines.push(`+-------------------------------------------------------------+`);
    }

    if (session.page.forms.length > 0) {
      wireframeLines.push(`| FORMS:`);
      session.page.forms.forEach((f, idx) => {
        wireframeLines.push(`|   Form #${idx + 1} [${f.method}] -> ${f.action}`);
        f.fields.forEach((fld) => {
          wireframeLines.push(`|     - [${fld.type || "text"}] name="${fld.name}" val="${fld.value || ""}"`);
        });
      });
      wireframeLines.push(`+-------------------------------------------------------------+`);
    }

    if (session.page.buttons.length > 0) {
      wireframeLines.push(`| BUTTONS:`);
      session.page.buttons.forEach((b) => {
        wireframeLines.push(`|   [BUTTON: "${b.text}"] (id: ${b.id || "none"})`);
      });
      wireframeLines.push(`+-------------------------------------------------------------+`);
    }

    if (session.page.links.length > 0) {
      wireframeLines.push(`| NAVIGATION LINKS:`);
      session.page.links.slice(0, 6).forEach((l) => {
        wireframeLines.push(`|   -> "${l.text}" (${l.href.slice(0, 40)})`);
      });
      wireframeLines.push(`+-------------------------------------------------------------+`);
    }

    const layoutWireframe = wireframeLines.join("\n");

    const snapshotData = {
      snapshotId,
      label,
      url: session.page.url,
      title: session.page.title,
      status: session.page.status,
      timestamp: new Date().toISOString(),
      loadTimeMs: session.page.loadTimeMs,
      realScreenshotPath: realShotPath,
      engineType: realShotPath ? "Real-Headless-Chromium" : "Lightweight-DOM-Parser",
      headings: session.page.headings,
      buttons: session.page.buttons,
      forms: session.page.forms,
      alerts: session.page.alerts,
      layoutWireframe,
      htmlLength: session.page.rawHtml.length,
    };

    await fs.writeFile(artifactJsonPath, JSON.stringify(snapshotData, null, 2), "utf-8");
    await fs.writeFile(artifactHtmlPath, session.page.rawHtml, "utf-8");

    return {
      snapshotId,
      url: session.page.url,
      title: session.page.title,
      status: session.page.status,
      timestamp: snapshotData.timestamp,
      artifactPath: artifactJsonPath,
      realScreenshotPath: realShotPath,
      layoutWireframe,
      interactiveCount: session.page.interactiveElements.length,
      detectedAlerts: session.page.alerts,
      engineType: snapshotData.engineType as any,
    };
  }

  /**
   * Menutup sesi dan membersihkan resource memori sesi tertentu
   */
  public closeSession(sessionId = this.defaultSessionId): void {
    this.sessions.delete(sessionId);
  }

  /**
   * Membersihkan semua sesi
   */
  public resetAllSessions(): void {
    this.sessions.clear();
  }
}
