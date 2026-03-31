import { getDb } from "./client";
import { eq, isNull, like, asc, type InferSelectModel } from "drizzle-orm";
import { workSessions, breakSessions } from "./schema";
import type {
  WorkSession,
  BreakSession,
  AttendanceSummary,
  DailySummary,
  MonthlySummary,
} from "../shared/attendance";

type WorkSessionRow = InferSelectModel<typeof workSessions> & {
  breaks?: InferSelectModel<typeof breakSessions>[];
};

type BreakSessionRow = Pick<
  InferSelectModel<typeof breakSessions>,
  "id" | "workSessionId" | "startAt" | "endAt" | "note"
>;

function toWorkSession(row: WorkSessionRow): WorkSession {
  return {
    id: row.id,
    date: row.date,
    clockInAt: row.clockInAt,
    clockOutAt: row.clockOutAt ?? undefined,
    note: row.note ?? undefined,
    breaks: (row.breaks ?? []).map(toBreakSession),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toBreakSession(row: BreakSessionRow): BreakSession {
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
  const db = getDb();

  const openSession = await db.query.workSessions.findFirst({
    where: isNull(workSessions.clockOutAt),
  });
  if (openSession) {
    throw new Error("An open work session already exists. Clock out first.");
  }

  const date = deriveDateFromIso(clockInAt);

  const row = db
    .insert(workSessions)
    .values({
      date,
      clockInAt,
      note: note ?? null,
    })
    .returning()
    .get();

  return toWorkSession({ ...row, breaks: [] });
}

export async function endWorkSession(
  clockOutAt: string,
): Promise<WorkSession> {
  const db = getDb();

  const openSession = await db.query.workSessions.findFirst({
    where: isNull(workSessions.clockOutAt),
    with: { breaks: true },
  });
  if (!openSession) {
    throw new Error("No open work session found.");
  }

  if (clockOutAt <= openSession.clockInAt) {
    throw new Error("clockOutAt must be after clockInAt.");
  }

  const openBreaks = openSession.breaks.filter((b) => b.endAt === null);
  for (const brk of openBreaks) {
    db.update(breakSessions)
      .set({ endAt: clockOutAt, updatedAt: new Date().toISOString() })
      .where(eq(breakSessions.id, brk.id))
      .run();
  }

  db.update(workSessions)
    .set({ clockOutAt, updatedAt: new Date().toISOString() })
    .where(eq(workSessions.id, openSession.id))
    .run();

  const row = await db.query.workSessions.findFirst({
    where: eq(workSessions.id, openSession.id),
    with: { breaks: true },
  });

  if (!row) {
    throw new Error("Failed to re-fetch updated work session.");
  }

  return toWorkSession(row);
}

export async function createBreakSession(
  startAt: string,
  note?: string,
): Promise<BreakSession> {
  const db = getDb();

  const openSession = await db.query.workSessions.findFirst({
    where: isNull(workSessions.clockOutAt),
    with: { breaks: true },
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

  const row = db
    .insert(breakSessions)
    .values({
      workSessionId: openSession.id,
      startAt,
      note: note ?? null,
    })
    .returning()
    .get();

  return toBreakSession(row);
}

export async function endBreakSession(
  endAt: string,
): Promise<BreakSession> {
  const db = getDb();

  const openSession = await db.query.workSessions.findFirst({
    where: isNull(workSessions.clockOutAt),
    with: { breaks: true },
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

  const row = db
    .update(breakSessions)
    .set({ endAt, updatedAt: new Date().toISOString() })
    .where(eq(breakSessions.id, openBreak.id))
    .returning()
    .get();

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
  const db = getDb();

  const sessions = await db.query.workSessions.findMany({
    where: eq(workSessions.date, dateStr),
    with: { breaks: true },
    orderBy: [asc(workSessions.clockInAt)],
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
  const db = getDb();

  const updateData: Partial<InferSelectModel<typeof workSessions>> = {
    updatedAt: new Date().toISOString(),
  };
  if (data.clockInAt !== undefined) {
    updateData.clockInAt = data.clockInAt;
    updateData.date = deriveDateFromIso(data.clockInAt);
  }
  if (data.clockOutAt !== undefined) updateData.clockOutAt = data.clockOutAt;
  if (data.note !== undefined) updateData.note = data.note;

  db.update(workSessions)
    .set(updateData)
    .where(eq(workSessions.id, id))
    .run();

  const row = await db.query.workSessions.findFirst({
    where: eq(workSessions.id, id),
    with: { breaks: true },
  });

  if (!row) {
    throw new Error(`Work session with id ${id} not found.`);
  }

  return toWorkSession(row);
}

export async function deleteWorkSession(id: number): Promise<void> {
  const db = getDb();
  db.delete(workSessions).where(eq(workSessions.id, id)).run();
}

export async function createManualWorkSession(
  date: string,
  clockInAt: string,
  clockOutAt: string,
): Promise<WorkSession> {
  if (clockOutAt <= clockInAt) {
    throw new Error("clockOutAt must be after clockInAt.");
  }

  const db = getDb();

  const row = db
    .insert(workSessions)
    .values({
      date,
      clockInAt,
      clockOutAt,
    })
    .returning()
    .get();

  return toWorkSession({ ...row, breaks: [] });
}

export async function getDailySummaries(
  yearMonth: string,
): Promise<DailySummary[]> {
  const db = getDb();

  const sessions = await db.query.workSessions.findMany({
    where: like(workSessions.date, `${yearMonth}%`),
    with: { breaks: true },
    orderBy: [asc(workSessions.clockInAt)],
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
