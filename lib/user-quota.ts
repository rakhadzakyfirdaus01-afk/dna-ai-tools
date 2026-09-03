import prisma from "@/lib/prisma";

export const USER_AI_DAILY_LIMIT = 50;

function getStartOfToday(): Date {
  const now = new Date();

  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0
  );
}

function getStartOfNextDay(): Date {
  const now = new Date();

  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0,
    0,
    0,
    0
  );
}

export async function getUserQuota(userId: string) {
  const startOfToday = getStartOfToday();
  const resetAt = getStartOfNextDay();

  const used = await prisma.history.count({
    where: {
      userId,
      createdAt: {
        gte: startOfToday,
        lt: resetAt,
      },
    },
  });

  return {
    limit: USER_AI_DAILY_LIMIT,
    used,
    remaining: Math.max(
      USER_AI_DAILY_LIMIT - used,
      0
    ),
    resetAt,
  };
}

export async function checkUserQuota(userId: string) {
  const quota = await getUserQuota(userId);

  return {
    ...quota,
    allowed: quota.used < quota.limit,
  };
}
