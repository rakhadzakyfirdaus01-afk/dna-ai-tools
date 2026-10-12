import fs from "fs/promises";
import path from "path";
import { URL } from "url";
import { BrowserSecurityGate } from "./security";

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
  layoutWireframe: string;
  interactiveCount: number;
  detectedAlerts: string[];
}

export class BrowserEngine {
  private static instance: BrowserEngine | null = null;
  private currentSession: PageState | null = null;
  private history: string[] = [];
  private sessionCookies: Map<string, string> = new Map();
  private artifactsDir: string;

  public constructor() {
    this.artifactsDir = path.resolve(process.cwd(), ".antigravity-artifacts", "snapshots");
  }

  public static getInstance(): BrowserEngine {
    if (!BrowserEngine.instance) {
      BrowserEngine.instance = new BrowserEngine();
    }
    return BrowserEngine.instance;
  }

  /**
   * Mengambil status halaman saat ini
   */
  public getCurrentPage(): PageState | null {
    return this.currentSession;
  }

  /**
   * Helper untuk membersihkan HTML tag menjadi teks polos
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
   * Parse atribut dari tag HTML string
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
   * Parser DOM mandiri zero-dependency untuk menganalisis dokumen HTML
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
        method: (formAttrs.method?.toUpperCase() === "POST" ? "POST" : "GET"),
        fields,
      });
    }

    // 6. Ekstrak Alert & Pesan Error
    const alerts: string[] = [];
    const alertRegex = /<(?:div|p|span)\s+([^>]*?(?:role=["']alert["']|class=["'][^"']*(?:error|alert|warning|danger)[^"']*)[^>]*?)>(.*?)<\/(?:div|p|span)>/gi;
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
   * Membuka dan memuat URL dengan pengamanan SSRF ketat
   */
  public async navigate(url: string): Promise<PageState> {
    const sec = BrowserSecurityGate.validateUrl(url, true);
    if (!sec.allowed || !sec.sanitizedUrl) {
      throw new Error(sec.reason || "URL ditolak oleh Security Gate.");
    }

    const targetUrl = sec.sanitizedUrl;
    const startTime = Date.now();

    const headers: Record<string, string> = {
      "User-Agent": "Antigravity-BrowserAgent/2.0 (Headless; Autonomous)",
      Accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
    };

    // Sertakan session cookies jika ada
    if (this.sessionCookies.size > 0) {
      const cookieStr = Array.from(this.sessionCookies.entries())
        .map(([k, v]) => `${k}=${v}`)
        .join("; ");
      headers["Cookie"] = cookieStr;
    }

    const response = await fetch(targetUrl, {
      method: "GET",
      headers,
      redirect: "follow",
    });

    const loadTimeMs = Date.now() - startTime;
    const contentType = response.headers.get("content-type") || "text/html";
    const bodyText = await response.text();

    // Rekam Set-Cookie jika ada
    const setCookie = response.headers.get("set-cookie");
    if (setCookie) {
      const parts = setCookie.split(";")[0].split("=");
      if (parts.length >= 2) {
        this.sessionCookies.set(parts[0].trim(), parts[1].trim());
      }
    }

    const pageState = this.parseHtmlDocument(bodyText, response.url || targetUrl);
    pageState.status = response.status;
    pageState.statusText = response.statusText;
    pageState.contentType = contentType;
    pageState.loadTimeMs = loadTimeMs;

    this.currentSession = pageState;
    this.history.push(pageState.url);

    return pageState;
  }

  /**
   * Mencari elemen DOM berdasarkan kriteria seleksi
   */
  public findElements(query: ElementQuery): DOMElement[] {
    if (!this.currentSession) {
      throw new Error("Tidak ada halaman yang aktif. Jalankan navigate() terlebih dahulu.");
    }

    const { tag, role, text, name, id } = query;
    return this.currentSession.interactiveElements.filter((el) => {
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
   * Mengklik elemen tombol atau link pada halaman aktif
   */
  public async clickElement(query: ElementQuery): Promise<{
    clicked: DOMElement;
    actionType: "navigated" | "triggered";
    newPage: PageState;
  }> {
    if (!this.currentSession) {
      throw new Error("Tidak ada halaman yang aktif. Jalankan navigate() terlebih dahulu.");
    }

    const matches = this.findElements(query);
    if (matches.length === 0) {
      throw new Error(
        `Elemen tidak ditemukan dengan kriteria: ${JSON.stringify(query)}`
      );
    }

    const target = matches[0];

    // Jika elemen adalah tautan (link dengan href)
    if (target.href) {
      const newPage = await this.navigate(target.href);
      return {
        clicked: target,
        actionType: "navigated",
        newPage,
      };
    }

    // Jika tombol merupakan bagian dari form
    if (target.tag === "button" || target.type === "submit") {
      if (this.currentSession.forms.length > 0) {
        const form = this.currentSession.forms[0];
        const dummyData: Record<string, string> = {};
        form.fields.forEach((f) => {
          dummyData[f.name] = f.value || "";
        });
        const newPage = await this.fillForm("", dummyData, true);
        return {
          clicked: target,
          actionType: "triggered",
          newPage,
        };
      }
    }

    return {
      clicked: target,
      actionType: "triggered",
      newPage: this.currentSession,
    };
  }

  /**
   * Mengisi formulir dan mengirimkan request (POST/GET)
   */
  public async fillForm(
    formSelector: string,
    fields: Record<string, string>,
    submit = true
  ): Promise<PageState> {
    if (!this.currentSession) {
      throw new Error("Tidak ada halaman yang aktif. Jalankan navigate() terlebih dahulu.");
    }

    let targetForm: FormInfo | undefined;
    if (formSelector) {
      targetForm = this.currentSession.forms.find(
        (f) => f.id === formSelector || f.action.includes(formSelector)
      );
    }

    if (!targetForm && this.currentSession.forms.length > 0) {
      targetForm = this.currentSession.forms[0];
    }

    if (!targetForm) {
      throw new Error("Formulir tidak ditemukan pada halaman saat ini.");
    }

    // Update field values
    for (const f of targetForm.fields) {
      if (fields[f.name] !== undefined) {
        f.value = fields[f.name];
      }
    }

    if (!submit) {
      return this.currentSession;
    }

    // Eksekusi Submit
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

    this.currentSession = newPage;
    this.history.push(newPage.url);

    return newPage;
  }

  /**
   * Menangkap visual wireframe snapshot dan menyimpannya sebagai artefak verifikasi
   */
  public async captureVisualSnapshot(
    label = "Inspection Snapshot"
  ): Promise<VisualSnapshotArtifact> {
    if (!this.currentSession) {
      throw new Error("Tidak ada halaman yang aktif untuk diinspeksi.");
    }

    await fs.mkdir(this.artifactsDir, { recursive: true });

    const snapshotId = `snap_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const artifactJsonPath = path.join(this.artifactsDir, `${snapshotId}.json`);
    const artifactHtmlPath = path.join(this.artifactsDir, `${snapshotId}.html`);

    // Konstruksi ASCII Layout Wireframe
    const wireframeLines: string[] = [
      `+-------------------------------------------------------------+`,
      `| [BROWSER INSPECTION] ${this.currentSession.title.slice(0, 40).padEnd(40, " ")} |`,
      `| URL: ${this.currentSession.url.slice(0, 48).padEnd(48, " ")} |`,
      `| HTTP STATUS: ${this.currentSession.status} ${this.currentSession.statusText} (${this.currentSession.loadTimeMs}ms) |`,
      `+-------------------------------------------------------------+`,
    ];

    if (this.currentSession.alerts.length > 0) {
      wireframeLines.push(`| [!] DETECTED ALERTS / ERRORS:`);
      this.currentSession.alerts.forEach((alt) => {
        wireframeLines.push(`|     * ${alt.slice(0, 50)}`);
      });
      wireframeLines.push(`+-------------------------------------------------------------+`);
    }

    if (this.currentSession.headings.length > 0) {
      wireframeLines.push(`| HEADINGS:`);
      this.currentSession.headings.slice(0, 5).forEach((h) => {
        wireframeLines.push(`|   # ${h.slice(0, 52)}`);
      });
      wireframeLines.push(`+-------------------------------------------------------------+`);
    }

    if (this.currentSession.forms.length > 0) {
      wireframeLines.push(`| FORMS:`);
      this.currentSession.forms.forEach((f, idx) => {
        wireframeLines.push(`|   Form #${idx + 1} [${f.method}] -> ${f.action}`);
        f.fields.forEach((fld) => {
          wireframeLines.push(`|     - [${fld.type || "text"}] name="${fld.name}" val="${fld.value || ""}"`);
        });
      });
      wireframeLines.push(`+-------------------------------------------------------------+`);
    }

    if (this.currentSession.buttons.length > 0) {
      wireframeLines.push(`| BUTTONS:`);
      this.currentSession.buttons.forEach((b) => {
        wireframeLines.push(`|   [BUTTON: "${b.text}"] (id: ${b.id || "none"})`);
      });
      wireframeLines.push(`+-------------------------------------------------------------+`);
    }

    if (this.currentSession.links.length > 0) {
      wireframeLines.push(`| NAVIGATION LINKS:`);
      this.currentSession.links.slice(0, 6).forEach((l) => {
        wireframeLines.push(`|   -> "${l.text}" (${l.href.slice(0, 40)})`);
      });
      wireframeLines.push(`+-------------------------------------------------------------+`);
    }

    const layoutWireframe = wireframeLines.join("\n");

    const snapshotData = {
      snapshotId,
      label,
      url: this.currentSession.url,
      title: this.currentSession.title,
      status: this.currentSession.status,
      timestamp: new Date().toISOString(),
      loadTimeMs: this.currentSession.loadTimeMs,
      headings: this.currentSession.headings,
      buttons: this.currentSession.buttons,
      forms: this.currentSession.forms,
      alerts: this.currentSession.alerts,
      layoutWireframe,
      htmlLength: this.currentSession.rawHtml.length,
    };

    // Simpan JSON metadata & raw HTML
    await fs.writeFile(artifactJsonPath, JSON.stringify(snapshotData, null, 2), "utf-8");
    await fs.writeFile(artifactHtmlPath, this.currentSession.rawHtml, "utf-8");

    return {
      snapshotId,
      url: this.currentSession.url,
      title: this.currentSession.title,
      status: this.currentSession.status,
      timestamp: snapshotData.timestamp,
      artifactPath: artifactJsonPath,
      layoutWireframe,
      interactiveCount: this.currentSession.interactiveElements.length,
      detectedAlerts: this.currentSession.alerts,
    };
  }

  /**
   * Menutup sesi browser dan membersihkan resource memori
   */
  public closeSession(): void {
    this.currentSession = null;
    this.history = [];
    this.sessionCookies.clear();
  }
}
