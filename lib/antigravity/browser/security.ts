import { URL } from "url";

export interface BrowserSecurityCheckResult {
  allowed: boolean;
  reason?: string;
  sanitizedUrl?: string;
}

export class BrowserSecurityGate {
  // Protokol yang diizinkan untuk navigasi web
  private static allowedProtocols = new Set(["http:", "https:"]);

  // Cloud metadata endpoint dan hostname berbahaya yang diblokir mutlak
  private static blockedHostnames = new Set([
    "169.254.169.254", // AWS, GCP, Azure, OpenStack Link-Local Metadata
    "metadata.google.internal",
    "metadata.goog",
    "instance-data",
    "100.100.100.200", // Alibaba Cloud metadata
    "169.254.170.2",   // AWS ECS task metadata
  ]);

  // Port sensitif internal yang diblokir mutlak
  private static dangerousPorts = new Set([
    21,   // FTP
    22,   // SSH
    23,   // Telnet
    25,   // SMTP
    53,   // DNS
    110,  // POP3
    135,  // RPC
    139,  // NetBIOS
    143,  // IMAP
    445,  // SMB
    1433, // MSSQL
    1521, // Oracle
    2375, // Docker
    2376, // Docker SSL
    3306, // MySQL
    5432, // PostgreSQL
    6379, // Redis
    9200, // Elasticsearch
    11211,// Memcached
    27017 // MongoDB
  ]);

  /**
   * Memvalidasi apakah IP address berada dalam private network range (SSRF)
   */
  private static isPrivateIp(ip: string): boolean {
    const parts = ip.split(".").map(Number);
    if (parts.length !== 4 || parts.some(isNaN)) {
      return false;
    }

    const [a, b, c, d] = parts;

    // 0.0.0.0/8 (Broadcast)
    if (a === 0) return true;

    // 10.0.0.0/8 (Private Network)
    if (a === 10) return true;

    // 100.64.0.0/10 (Carrier Grade NAT)
    if (a === 100 && b >= 64 && b <= 127) return true;

    // 169.254.0.0/16 (Link Local / Metadata)
    if (a === 169 && b === 254) return true;

    // 172.16.0.0/12 (Private Network)
    if (a === 172 && b >= 16 && b <= 31) return true;

    // 192.168.0.0/16 (Private Network)
    if (a === 192 && b === 168) return true;

    // 224.0.0.0/4 (Multicast)
    if (a >= 224 && a <= 239) return true;

    // 240.0.0.0/4 (Reserved)
    if (a >= 240) return true;

    return false;
  }

  /**
   * Mendeteksi format IP tersembunyi (hex, octal, single decimal integer evasion)
   */
  private static parseDecimalIpEvasion(host: string): string | null {
    // Angka tunggal murni, misal: 2130706433 (127.0.0.1) atau 2852039166 (169.254.169.254)
    if (/^\d+$/.test(host)) {
      const num = parseInt(host, 10);
      if (num >= 0 && num <= 4294967295) {
        const d = num % 256;
        const c = Math.floor(num / 256) % 256;
        const b = Math.floor(num / 65536) % 256;
        const a = Math.floor(num / 16777216) % 256;
        return `${a}.${b}.${c}.${d}`;
      }
    }
    return null;
  }

  /**
   * Memvalidasi apakah URL aman untuk diakses oleh Browser Agent
   * @param rawUrl URL yang dituju
   * @param allowLocalhost Apakah localhost/127.0.0.1 diizinkan (default: true untuk dev server lokal)
   */
  public static validateUrl(
    rawUrl: string,
    allowLocalhost = true
  ): BrowserSecurityCheckResult {
    if (!rawUrl || typeof rawUrl !== "string") {
      return { allowed: false, reason: "URL tidak boleh kosong." };
    }

    const trimmed = rawUrl.trim();

    let parsed: URL;
    try {
      parsed = new URL(trimmed);
    } catch {
      return { allowed: false, reason: `URL tidak valid: '${trimmed}'.` };
    }

    // 1. Validasi Protocol
    if (!this.allowedProtocols.has(parsed.protocol.toLowerCase())) {
      return {
        allowed: false,
        reason: `Protokol '${parsed.protocol}' diblokir demi keamanan. Hanya http: dan https: yang diizinkan.`,
      };
    }

    const hostname = parsed.hostname.toLowerCase();

    // 2. Cek Decimal Evasion IP
    const resolvedDecimal = this.parseDecimalIpEvasion(hostname);
    const effectiveHost = resolvedDecimal || hostname;

    // 3. Cek Cloud Metadata Hostname
    if (this.blockedHostnames.has(effectiveHost)) {
      return {
        allowed: false,
        reason: `Akses ditolak: Target '${effectiveHost}' merupakan endpoint metadata cloud terlarang (SSRF Shield).`,
      };
    }

    // 4. Validasi Port Sensitif
    const port = parsed.port
      ? parseInt(parsed.port, 10)
      : parsed.protocol === "https:"
      ? 443
      : 80;

    if (this.dangerousPorts.has(port)) {
      return {
        allowed: false,
        reason: `Akses ditolak: Port ${port} tergolong layanan internal berisiko tinggi (Database/SSH/Mail).`,
      };
    }

    // 5. Cek Localhost / Loopback
    const isLoopback =
      effectiveHost === "localhost" ||
      effectiveHost === "127.0.0.1" ||
      effectiveHost === "::1" ||
      effectiveHost === "[::1]";

    if (isLoopback) {
      if (!allowLocalhost) {
        return {
          allowed: false,
          reason: "Akses ke loopback/localhost dibatasi untuk lingkungan ini.",
        };
      }
      // Localhost diizinkan untuk verifikasi aplikasi dev web lokal
      return {
        allowed: true,
        sanitizedUrl: parsed.toString(),
      };
    }

    // 6. Cek Private IPv4 Ranges (10.x, 172.16-31.x, 192.168.x, 169.254.x)
    if (this.isPrivateIp(effectiveHost)) {
      return {
        allowed: false,
        reason: `Akses ditolak: Alamat IP '${effectiveHost}' berada di jaringan internal/private (SSRF Protection).`,
      };
    }

    return {
      allowed: true,
      sanitizedUrl: parsed.toString(),
    };
  }
}
