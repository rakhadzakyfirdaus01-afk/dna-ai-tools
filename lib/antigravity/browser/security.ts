import { URL } from "url";
import dns from "dns/promises";
import net from "net";

export interface BrowserSecurityCheckResult {
  allowed: boolean;
  reason?: string;
  sanitizedUrl?: string;
  resolvedIp?: string;
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

  // Port localhost yang diizinkan untuk verifikasi dev server lokal
  private static allowedLocalhostPorts = new Set([
    80,
    443,
    3000,
    3001,
    8000,
    8080,
  ]);

  /**
   * Normalisasi dan parsing berbagai format representasi IP (Decimal, Hex, Octal, IPv4-mapped IPv6)
   */
  public static normalizeIpAddress(host: string): string | null {
    let clean = host.trim().toLowerCase();

    // Hapus kurung siku jika IPv6
    if (clean.startsWith("[") && clean.endsWith("]")) {
      clean = clean.slice(1, -1);
    }

    // 1. Tangani IPv4-mapped IPv6 (contoh: ::ffff:127.0.0.1 atau ::ffff:a9fe:a9fe atau ::ffff:7f00:1)
    if (clean.includes(":ffff:")) {
      const remainder = clean.split(":ffff:")[1];
      if (net.isIPv4(remainder)) {
        return remainder;
      }
      const hexParts = remainder.split(":");
      if (hexParts.length === 2) {
        const p1 = parseInt(hexParts[0], 16);
        const p2 = parseInt(hexParts[1], 16);
        if (!isNaN(p1) && !isNaN(p2) && p1 >= 0 && p1 <= 0xffff && p2 >= 0 && p2 <= 0xffff) {
          const a = (p1 >> 8) & 0xff;
          const b = p1 & 0xff;
          const c = (p2 >> 8) & 0xff;
          const d = p2 & 0xff;
          return `${a}.${b}.${c}.${d}`;
        }
      }
    }

    // 2. Tangani Decimal murni (misal: 2130706433 atau 2852039166)
    if (/^\d+$/.test(clean)) {
      const num = parseInt(clean, 10);
      if (num >= 0 && num <= 4294967295) {
        const d = num % 256;
        const c = Math.floor(num / 256) % 256;
        const b = Math.floor(num / 65536) % 256;
        const a = Math.floor(num / 16777216) % 256;
        return `${a}.${b}.${c}.${d}`;
      }
    }

    // 3. Tangani Hexadecimal murni (misal: 0x7f000001 atau 0xa9fea9fe)
    if (/^0x[0-9a-fA-F]+$/.test(clean)) {
      const num = parseInt(clean, 16);
      if (num >= 0 && num <= 4294967295) {
        const d = num % 256;
        const c = Math.floor(num / 256) % 256;
        const b = Math.floor(num / 65536) % 256;
        const a = Math.floor(num / 16777216) % 256;
        return `${a}.${b}.${c}.${d}`;
      }
    }

    // 4. Tangani format bertitik dengan Hex atau Octal per oktet (misal: 0x7f.0.0.1 atau 0177.0.0.1)
    const dotParts = clean.split(".");
    if (dotParts.length === 4) {
      const parsedParts: number[] = [];
      for (const part of dotParts) {
        let val: number;
        if (/^0x[0-9a-fA-F]+$/i.test(part)) {
          val = parseInt(part, 16);
        } else if (/^0\d+$/.test(part)) {
          val = parseInt(part, 8);
        } else if (/^\d+$/.test(part)) {
          val = parseInt(part, 10);
        } else {
          return null;
        }
        if (isNaN(val) || val < 0 || val > 255) return null;
        parsedParts.push(val);
      }
      return parsedParts.join(".");
    }

    return null;
  }

  /**
   * Memeriksa apakah suatu alamat IPv4 berada di private/link-local/broadcast/metadata network
   */
  public static isPrivateIPv4(ip: string): boolean {
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

    // 127.0.0.0/8 (Loopback)
    if (a === 127) return true;

    // 169.254.0.0/16 (Link Local / Cloud Metadata)
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
   * Memeriksa apakah suatu alamat IPv6 berada di private/loopback/link-local network
   */
  public static isPrivateIPv6(ip: string): boolean {
    const clean = ip.toLowerCase().trim();

    // ::1 (Loopback)
    if (clean === "::1" || clean === "0:0:0:0:0:0:0:1") return true;

    // :: (Unspecified)
    if (clean === "::" || clean === "0:0:0:0:0:0:0:0") return true;

    // fe80::/10 (Link-Local)
    if (clean.startsWith("fe8") || clean.startsWith("fe9") || clean.startsWith("fea") || clean.startsWith("feb")) {
      return true;
    }

    // fc00::/7 (Unique Local Address)
    if (clean.startsWith("fc") || clean.startsWith("fd")) {
      return true;
    }

    // ff00::/8 (Multicast)
    if (clean.startsWith("ff")) {
      return true;
    }

    return false;
  }

  /**
   * Memvalidasi apakah URL aman secara statis (protokol, format IP, port, host blacklist)
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

    const rawHostname = parsed.hostname.toLowerCase();
    const unbracketedHost =
      rawHostname.startsWith("[") && rawHostname.endsWith("]")
        ? rawHostname.slice(1, -1)
        : rawHostname;

    // 2. Normalisasi format IP (Hex, Octal, Decimal, dsb)
    const normalizedIp = this.normalizeIpAddress(unbracketedHost);
    const effectiveHost = normalizedIp || unbracketedHost;

    // 3. Cek Cloud Metadata Hostname & IP
    if (this.blockedHostnames.has(effectiveHost) || effectiveHost === "169.254.169.254") {
      return {
        allowed: false,
        reason: `Akses ditolak: Target '${effectiveHost}' merupakan endpoint metadata cloud terlarang (SSRF Shield).`,
      };
    }

    // 4. Validasi Port Sensitif Berbahaya
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

    // 5. Cek Loopback / Localhost
    const isLoopback =
      effectiveHost === "localhost" ||
      effectiveHost === "127.0.0.1" ||
      effectiveHost.startsWith("127.") ||
      effectiveHost === "::1" ||
      effectiveHost === "0:0:0:0:0:0:0:1" ||
      effectiveHost === "[::1]";

    if (isLoopback) {
      if (!allowLocalhost) {
        return {
          allowed: false,
          reason: "Akses ke loopback/localhost dibatasi untuk lingkungan ini.",
        };
      }

      // Pastikan port localhost berada dalam port dev yang diizinkan atau port ephemeral test (>40000)
      const isAllowedPort =
        this.allowedLocalhostPorts.has(port) || (port >= 40000 && port <= 65535);

      if (!isAllowedPort) {
        return {
          allowed: false,
          reason: `Akses ke localhost ditolak: Port ${port} tidak terdaftar dalam whitelist port web dev yang diizinkan.`,
        };
      }

      return {
        allowed: true,
        sanitizedUrl: parsed.toString(),
      };
    }

    // 6. Cek Private IPv4 Ranges
    if (net.isIPv4(effectiveHost) && this.isPrivateIPv4(effectiveHost)) {
      return {
        allowed: false,
        reason: `Akses ditolak: Alamat IP '${effectiveHost}' berada di jaringan internal/private (SSRF Protection).`,
      };
    }

    // 7. Cek Private IPv6 Ranges
    if (net.isIPv6(effectiveHost) && this.isPrivateIPv6(effectiveHost)) {
      return {
        allowed: false,
        reason: `Akses ditolak: Alamat IPv6 '${effectiveHost}' berada di jaringan private/link-local.`,
      };
    }

    return {
      allowed: true,
      sanitizedUrl: parsed.toString(),
    };
  }

  /**
   * Validasi mendalam dengan resolusi DNS asinkron untuk mencegah DNS Rebinding
   */
  public static async validateUrlWithDns(
    rawUrl: string,
    allowLocalhost = true
  ): Promise<BrowserSecurityCheckResult> {
    const staticCheck = this.validateUrl(rawUrl, allowLocalhost);
    if (!staticCheck.allowed || !staticCheck.sanitizedUrl) {
      return staticCheck;
    }

    const parsed = new URL(staticCheck.sanitizedUrl);
    const hostname = parsed.hostname.toLowerCase();

    // Jika hostname sudah berupa IP atau localhost yang sudah divalidasi statis
    if (hostname === "localhost" || net.isIP(hostname)) {
      return staticCheck;
    }

    try {
      // Resolusi DNS untuk memeriksa alamat IP aktual
      const records = await dns.lookup(hostname, { all: true });

      for (const rec of records) {
        // Cek IPv4
        if (rec.family === 4) {
          if (this.isPrivateIPv4(rec.address)) {
            return {
              allowed: false,
              reason: `Akses ditolak: Domain '${hostname}' ter-resolve ke IP privat internal '${rec.address}' (DNS Rebinding Shield).`,
            };
          }
          if (this.blockedHostnames.has(rec.address)) {
            return {
              allowed: false,
              reason: `Akses ditolak: Domain '${hostname}' ter-resolve ke endpoint metadata '${rec.address}'.`,
            };
          }
        }

        // Cek IPv6
        if (rec.family === 6) {
          if (this.isPrivateIPv6(rec.address)) {
            return {
              allowed: false,
              reason: `Akses ditolak: Domain '${hostname}' ter-resolve ke alamat IPv6 internal '${rec.address}'.`,
            };
          }
        }
      }

      return {
        allowed: true,
        sanitizedUrl: staticCheck.sanitizedUrl,
        resolvedIp: records[0]?.address,
      };
    } catch {
      // Jika domain tidak dapat di-resolve
      return {
        allowed: false,
        reason: `Gagal memverifikasi DNS: Hostname '${hostname}' tidak dapat di-resolve.`,
      };
    }
  }
}
