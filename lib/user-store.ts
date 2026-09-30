import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import fs from "fs";
import path from "path";

export interface StoredUser {
  id: string;
  name: string;
  username: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

const TMP_FILE = path.join(
  process.env.TEMP || process.env.TMP || "/tmp",
  "dna_users_cache.json"
);

function readTmpUsers(): Record<string, StoredUser> {
  try {
    if (fs.existsSync(TMP_FILE)) {
      const data = fs.readFileSync(TMP_FILE, "utf8");
      return JSON.parse(data);
    }
  } catch {}
  return {};
}

function writeTmpUser(user: StoredUser) {
  try {
    const current = readTmpUsers();
    current[user.username.toLowerCase()] = user;
    fs.writeFileSync(TMP_FILE, JSON.stringify(current, null, 2), "utf8");
  } catch {}
}

// Timeout helper agar pemanggilan Prisma tidak pernah membuat request gantung
function withTimeout<T>(promise: Promise<T>, ms: number = 2500): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Database timeout")), ms)
    ),
  ]);
}

export async function findUserByUsername(
  username: string
): Promise<StoredUser | null> {
  const norm = username.trim().toLowerCase();

  // 1. Coba cari di Prisma DB
  try {
    const dbUser = await withTimeout(
      prisma.user.findFirst({
        where: {
          OR: [
            { name: { equals: norm } },
            { email: { equals: `${norm}@dna-ai.local` } },
          ],
        },
      })
    );

    if (dbUser) {
      return {
        id: dbUser.id,
        name: dbUser.name || norm,
        username: norm,
        email: dbUser.email,
        passwordHash: dbUser.password,
        createdAt: dbUser.createdAt.toISOString(),
      };
    }
  } catch {}

  // 2. Coba cari di file cache serverless
  const tmpUsers = readTmpUsers();
  if (tmpUsers[norm]) {
    return tmpUsers[norm];
  }

  return null;
}

export async function registerUser({
  username,
  pin,
}: {
  username: string;
  pin: string;
}): Promise<StoredUser> {
  const norm = username.trim().toLowerCase();
  const email = `${norm}@dna-ai.local`;
  const passwordHash = await bcrypt.hash(pin, 10);
  const id = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const newUser: StoredUser = {
    id,
    name: username.trim(),
    username: norm,
    email,
    passwordHash,
    createdAt: new Date().toISOString(),
  };

  // 1. Simpan ke cache serverless
  writeTmpUser(newUser);

  // 2. Coba simpan ke database jika tersedia
  try {
    const created = await withTimeout(
      prisma.user.create({
        data: {
          name: username.trim(),
          email,
          password: passwordHash,
        },
      })
    );
    newUser.id = created.id;
  } catch {}

  return newUser;
}

export async function verifyUserCredentials({
  username,
  pin,
  vaultData,
}: {
  username: string;
  pin: string;
  vaultData?: string | null;
}): Promise<{ id: string; name: string; email: string } | null> {
  const norm = username.trim().toLowerCase();

  let user = await findUserByUsername(norm);

  // Jika tidak ada di DB/cache, periksa dari data vault cookie browser
  if (!user && vaultData) {
    try {
      const parsed = JSON.parse(decodeURIComponent(vaultData));
      if (parsed[norm]) {
        user = parsed[norm];
      }
    } catch {}
  }

  if (user) {
    const isValid = await bcrypt.compare(pin, user.passwordHash);
    if (isValid) {
      return {
        id: user.id,
        name: user.name,
        email: user.email,
      };
    }
    return null;
  }

  return null;
}
