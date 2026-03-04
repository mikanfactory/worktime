import { getPrismaClient } from "./client";
import type {
  WorkSession,
  BreakSession,
  AttendanceSummary,
  DailySummary,
  MonthlySummary,
} from "../shared/attendance";

function toWorkSession(
  row: {
    id: number;
    date: string;
    clockInAt: string;
    clockOutAt: string | null;
    note: string | null;
    createdAt: Date;
    updatedAt: Date;
    breaks?: {
      id: number;
      workSessionId: number;
      startAt: string;
      endAt: string | null;
      note: string | null;
      createdAt: Date;
      updatedAt: Date;
    }[];
  },
): WorkSession {
  return {
    id: row.id,
    date: row.date,
    clockInAt: row.clockInAt,
    clockOutAt: row.clockOutAt ?? undefined,
    note: row.note ?? undefined,
    breaks: (row.breaks ?? []).map(toBreakSession),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toBreakSession(row: {
  id: number;
  workSessionId: number;
  startAt: string;
  endAt: string | null;
  note: string | null;
}): BreakSession {
  return {
    id: row.id,
    workSessionId: row.workSessionId,
    startAt: row.startAt,
    endAt: row.endAt ?? undefined,
    note: row.note ?? undefined,
  };
}

function deriveDateFromIso(isoString: string): string {
  const d = new Date(isoString);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function createWorkSession(
  clockInAt: string,
  note?: string,
): Promise<WorkSession> {
  const prisma = getPrismaClient();

  const openSession = await prisma.workSession.findFirst({
    where: { clockOutAt: null },
  });
  if (openSession) {
    throw new Error("An open work session already exists. Clock out first.");
  }

  const date = deriveDateFromIso(clockInAt);

  const row = await prisma.workSession.create({
    data: {
      date,
      clockInAt,
      note: note ?? null,
    },
    include: { breaks: true },
  });

  return toWorkSession(row);
}

export async function endWorkSession(
  clockOutAt: string,
): Promise<WorkSession> {
  const prisma = getPrismaClient();

  const openSession = await prisma.workSession.findFirst({
    where: { clockOutAt: null },
    include: { breaks: true },
  });
  if (!openSession) {
    throw new Error("No open work session found.");
  }

  if (clockOutAt <= openSession.clockInAt) {
    throw new Error("clockOutAt must be after clockInAt.");
  }

  // Auto-close any open break sessions
  const openBreaks = openSession.breaks.filter((b) => b.endAt === null);
  for (const brk of openBreaks) {
    await prisma.breakSession.update({
      where: { id: brk.id },
      data: { endAt: clockOutAt },
    });
  }

  const row = await prisma.workSession.update({
    where: { id: openSession.id },
    data: { clockOutAt },
    include: { breaks: true },
  });

  return toWorkSession(row);
}

export async function createBreakSession(
  startAt: string,
  note?: string,
): Promise<BreakSession> {
  const prisma = getPrismaClient();

  const openSession = await prisma.workSession.findFirst({
    where: { clockOutAt: null },
    include: { breaks: true },
  });
  if (!openSession) {
    throw new Error("No open work session found. Clock in first.");
  }

  const openBreak = openSession.breaks.find((b) => b.endAt === null);
  if (openBreak) {
    throw new Error("An open break already exists. End the current break first.");
  }

  if (startAt < openSession.clockInAt) {
    throw new Error("Break start must be after clock-in time.");
  }

  const row = await prisma.breakSession.create({
    data: {
      workSessionId: openSession.id,
      startAt,
      note: note ?? null,
    },
  });

  return toBreakSession(row);
}

export async function endBreakSession(
  endAt: string,
): Promise<BreakSession> {
  const prisma = getPrismaClient();

  const openSession = await prisma.workSession.findFirst({
    where: { clockOutAt: null },
    include: { breaks: true },
  });
  if (!openSession) {
    throw new Error("No open work session found.");
  }

  const openBreak = openSession.breaks.find((b) => b.endAt === null);
  if (!openBreak) {
    throw new Error("No open break found.");
  }

  if (endAt <= openBreak.startAt) {
    throw new Error("Break end must be after break start.");
  }

  const row = await prisma.breakSession.update({
    where: { id: openBreak.id },
    data: { endAt },
  });

  return toBreakSession(row);
}

export function calculateWorkedSeconds(
  session: { clockInAt: string; clockOutAt?: string | null },
  breaks: { startAt: string; endAt?: string | null }[],
  now: number = Date.now(),
): { workedSeconds: number; breakSeconds: number } {
  const clockIn = new Date(session.clockInAt).getTime();
  const clockOut = session.clockOutAt
    ? new Date(session.clockOutAt).getTime()
    : now;

  const totalSeconds = Math.max(0, Math.floor((clockOut - clockIn) / 1000));

  let breakSeconds = 0;
  for (const brk of breaks) {
    const bStart = new Date(brk.startAt).getTime();
    const bEnd = brk.endAt ? new Date(brk.endAt).getTime() : now;
    breakSeconds += Math.max(0, Math.floor((bEnd - bStart) / 1000));
  }

  const workedSeconds = Math.max(0, totalSeconds - breakSeconds);

  return { workedSeconds, breakSeconds };
}

export async function getTodaySummary(
  dateStr: string,
): Promise<AttendanceSummary> {
  const prisma = getPrismaClient();

  const sessions = await prisma.workSession.findMany({
    where: { date: dateStr },
    include: { breaks: true },
    orderBy: { clockInAt: "asc" },
  });

  if (sessions.length === 0) {
    return {
      workedSeconds: 0,
      breakSeconds: 0,
      isWorking: false,
      isOnBreak: false,
    };
  }

  const now = Date.now();
  let totalWorked = 0;
  let totalBreak = 0;

  for (const session of sessions) {
    const { workedSeconds, breakSeconds } = calculateWorkedSeconds(
      session,
      session.breaks,
      now,
    );
    totalWorked += workedSeconds;
    totalBreak += breakSeconds;
  }

  const firstClockIn = sessions[0].clockInAt;

  const lastSession = sessions[sessions.length - 1];
  const isWorking = lastSession.clockOutAt === null;
  const isOnBreak =
    isWorking && lastSession.breaks.some((b) => b.endAt === null);

  // Determine latest event timestamp
  let latestEvent = lastSession.clockOutAt ?? lastSession.clockInAt;
  for (const brk of lastSession.breaks) {
    const bTime = brk.endAt ?? brk.startAt;
    if (bTime > latestEvent) {
      latestEvent = bTime;
    }
  }

  const currentSession = isWorking ? toWorkSession(lastSession) : undefined;

  return {
    firstClockIn,
    latestEvent,
    workedSeconds: totalWorked,
    breakSeconds: totalBreak,
    isWorking,
    isOnBreak,
    currentSession,
  };
}

export async function updateWorkSession(
  id: number,
  data: {
    clockInAt?: string;
    clockOutAt?: string;
    note?: string;
  },
): Promise<WorkSession> {
  const prisma = getPrismaClient();

  const updateData: Record<string, string> = {};
  if (data.clockInAt !== undefined) {
    updateData.clockInAt = data.clockInAt;
    updateData.date = deriveDateFromIso(data.clockInAt);
  }
  if (data.clockOutAt !== undefined) updateData.clockOutAt = data.clockOutAt;
  if (data.note !== undefined) updateData.note = data.note;

  const row = await prisma.workSession.update({
    where: { id },
    data: updateData,
    include: { breaks: true },
  });

  return toWorkSession(row);
}

export async function deleteWorkSession(id: number): Promise<void> {
  const prisma = getPrismaClient();
  await prisma.workSession.delete({ where: { id } });
}

export async function createManualWorkSession(
  date: string,
  clockInAt: string,
  clockOutAt: string,
): Promise<WorkSession> {
  if (clockOutAt <= clockInAt) {
    throw new Error("clockOutAt must be after clockInAt.");
  }

  const prisma = getPrismaClient();

  const row = await prisma.workSession.create({
    data: {
      date,
      clockInAt,
      clockOutAt,
    },
    include: { breaks: true },
  });

  return toWorkSession(row);
}

export async function getDailySummaries(
  yearMonth: string,
): Promise<DailySummary[]> {
  const prisma = getPrismaClient();

  const sessions = await prisma.workSession.findMany({
    where: {
      date: { startsWith: yearMonth },
    },
    include: { breaks: true },
    orderBy: { clockInAt: "asc" },
  });

  const dayMap = new Map<
    string,
    typeof sessions
  >();

  for (const session of sessions) {
    const existing = dayMap.get(session.date);
    if (existing) {
      existing.push(session);
    } else {
      dayMap.set(session.date, [session]);
    }
  }

  const summaries: DailySummary[] = [];
  for (const [date, daySessions] of dayMap) {
    let totalWorked = 0;
    let totalBreak = 0;

    for (const session of daySessions) {
      // For historical summaries, don't count current time
      const now = session.clockOutAt
        ? new Date(session.clockOutAt).getTime()
        : Date.now();
      const { workedSeconds, breakSeconds } = calculateWorkedSeconds(
        session,
        session.breaks,
        now,
      );
      totalWorked += workedSeconds;
      totalBreak += breakSeconds;
    }

    const clockIns = daySessions.map((s) => s.clockInAt);
    const clockOuts = daySessions
      .filter((s) => s.clockOutAt !== null)
      .map((s) => s.clockOutAt!);

    summaries.push({
      date,
      workedSeconds: totalWorked,
      breakSeconds: totalBreak,
      firstClockIn: clockIns.length > 0 ? clockIns[0] : undefined,
      lastClockOut:
        clockOuts.length > 0 ? clockOuts[clockOuts.length - 1] : undefined,
      sessionCount: daySessions.length,
      firstSessionId: daySessions[0].id,
      lastSessionId: daySessions[daySessions.length - 1].id,
    });
  }

  summaries.sort((a, b) => a.date.localeCompare(b.date));
  return summaries;
}

export async function getMonthlySummary(
  yearMonth: string,
): Promise<MonthlySummary> {
  const dailySummaries = await getDailySummaries(yearMonth);

  const totalWorkedSeconds = dailySummaries.reduce(
    (sum, d) => sum + d.workedSeconds,
    0,
  );
  const totalBreakSeconds = dailySummaries.reduce(
    (sum, d) => sum + d.breakSeconds,
    0,
  );
  const workingDays = dailySummaries.filter(
    (d) => d.workedSeconds > 0,
  ).length;

  return {
    yearMonth,
    totalWorkedSeconds,
    totalBreakSeconds,
    workingDays,
    dailySummaries,
  };
}
