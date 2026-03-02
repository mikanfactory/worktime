import { getPrismaClient } from "./client";
import { Prisma } from "@prisma/client";
import {
  type AttendanceEventType,
  type AttendanceLog,
  type AttendanceLogsPage,
  type AttendanceSummary,
  type DailySummary,
  type MonthlySummary,
} from "../shared/attendance";

interface CursorPayload {
  timestamp: string;
  id: number;
}

export async function saveAttendanceLog(
  eventType: AttendanceEventType,
  timestamp: string,
  note?: string,
): Promise<number> {
  const prisma = getPrismaClient();

  const record = await prisma.attendanceLog.create({
    data: {
      eventType,
      timestamp,
      note: note ?? null,
    },
  });

  return record.id;
}

export async function getAttendanceLogs({
  from,
  to,
  limit = 50,
  cursor,
}: {
  from?: string;
  to?: string;
  limit?: number;
  cursor?: string;
}): Promise<AttendanceLogsPage> {
  const prisma = getPrismaClient();
  const safeLimit = Math.max(1, Math.min(limit, 200));

  const where: Prisma.AttendanceLogWhereInput[] = [];

  if (from) {
    where.push({ timestamp: { gte: from } });
  }

  if (to) {
    where.push({ timestamp: { lt: to } });
  }

  const decodedCursor = cursor ? decodeCursorValue(cursor) : null;
  if (decodedCursor) {
    where.push({
      OR: [
        { timestamp: { lt: decodedCursor.timestamp } },
        {
          AND: [
            { timestamp: decodedCursor.timestamp },
            { id: { lt: decodedCursor.id } },
          ],
        },
      ],
    });
  }

  const rows = await prisma.attendanceLog.findMany({
    where: where.length > 0 ? { AND: where } : undefined,
    orderBy: [{ timestamp: "desc" }, { id: "desc" }],
    take: safeLimit,
  });

  const logs: AttendanceLog[] = rows.map((row) => ({
    id: row.id,
    eventType: row.eventType as AttendanceEventType,
    timestamp: row.timestamp,
    note: row.note ?? undefined,
    createdAt: row.createdAt.toISOString(),
  }));

  const nextCursor =
    logs.length === safeLimit
      ? encodeCursor(logs[logs.length - 1].timestamp, logs[logs.length - 1].id)
      : undefined;

  return { logs, nextCursor };
}

export function calculateWorkedSeconds(
  events: { eventType: string; timestamp: string }[],
  countCurrentSession: boolean,
): { workedSeconds: number; isWorking: boolean } {
  let workedSeconds = 0;
  let currentClockInTime: number | null = null;

  for (const event of events) {
    if (event.eventType === "clock_in" && currentClockInTime === null) {
      currentClockInTime = new Date(event.timestamp).getTime();
    } else if (event.eventType === "clock_out" && currentClockInTime !== null) {
      workedSeconds += Math.floor(
        (new Date(event.timestamp).getTime() - currentClockInTime) / 1000,
      );
      currentClockInTime = null;
    }
  }

  const isWorking = currentClockInTime !== null;
  if (countCurrentSession && currentClockInTime !== null) {
    workedSeconds += Math.floor((Date.now() - currentClockInTime) / 1000);
  }

  return { workedSeconds: Math.max(0, workedSeconds), isWorking };
}

export async function getTodaySummary(
  dayStartIso: string,
  dayEndIso: string,
): Promise<AttendanceSummary> {
  const prisma = getPrismaClient();

  const firstClockInRow = await prisma.attendanceLog.findFirst({
    where: {
      timestamp: { gte: dayStartIso, lt: dayEndIso },
      eventType: "clock_in",
    },
    orderBy: { timestamp: "asc" },
    select: { timestamp: true },
  });

  const latestEventRow = await prisma.attendanceLog.findFirst({
    where: {
      timestamp: { gte: dayStartIso, lt: dayEndIso },
    },
    orderBy: { timestamp: "desc" },
    select: { timestamp: true },
  });

  const events = await prisma.attendanceLog.findMany({
    where: {
      timestamp: { gte: dayStartIso, lt: dayEndIso },
      eventType: { in: ["clock_in", "clock_out"] },
    },
    orderBy: [{ timestamp: "asc" }, { id: "asc" }],
    select: { eventType: true, timestamp: true },
  });

  const { workedSeconds, isWorking } = calculateWorkedSeconds(events, true);

  return {
    firstClockIn: firstClockInRow?.timestamp || undefined,
    latestEvent: latestEventRow?.timestamp || undefined,
    workedSeconds,
    isWorking,
  };
}

export async function updateAttendanceLog(
  id: number,
  data: {
    eventType?: AttendanceEventType;
    timestamp?: string;
    note?: string;
  },
): Promise<AttendanceLog> {
  const prisma = getPrismaClient();

  const updateData: Prisma.AttendanceLogUpdateInput = {};
  if (data.eventType !== undefined) updateData.eventType = data.eventType;
  if (data.timestamp !== undefined) updateData.timestamp = data.timestamp;
  if (data.note !== undefined) updateData.note = data.note;

  const row = await prisma.attendanceLog.update({
    where: { id },
    data: updateData,
  });

  return {
    id: row.id,
    eventType: row.eventType as AttendanceEventType,
    timestamp: row.timestamp,
    note: row.note ?? undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function deleteAttendanceLog(id: number): Promise<void> {
  const prisma = getPrismaClient();
  await prisma.attendanceLog.delete({ where: { id } });
}

export async function getDailySummaries(
  yearMonth: string,
): Promise<DailySummary[]> {
  const prisma = getPrismaClient();

  const [year, month] = yearMonth.split("-").map(Number);
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);
  const startIso = startDate.toISOString();
  const endIso = endDate.toISOString();

  const events = await prisma.attendanceLog.findMany({
    where: {
      timestamp: { gte: startIso, lt: endIso },
      eventType: { in: ["clock_in", "clock_out"] },
    },
    orderBy: [{ timestamp: "asc" }, { id: "asc" }],
    select: { eventType: true, timestamp: true },
  });

  const dayMap = new Map<
    string,
    { eventType: string; timestamp: string }[]
  >();

  for (const event of events) {
    const date = event.timestamp.substring(0, 10);
    const existing = dayMap.get(date);
    if (existing) {
      existing.push(event);
    } else {
      dayMap.set(date, [event]);
    }
  }

  const summaries: DailySummary[] = [];
  for (const [date, dayEvents] of dayMap) {
    const { workedSeconds } = calculateWorkedSeconds(dayEvents, false);

    const clockIns = dayEvents.filter((e) => e.eventType === "clock_in");
    const clockOuts = dayEvents.filter((e) => e.eventType === "clock_out");

    summaries.push({
      date,
      workedSeconds,
      firstClockIn: clockIns.length > 0 ? clockIns[0].timestamp : undefined,
      lastClockOut:
        clockOuts.length > 0
          ? clockOuts[clockOuts.length - 1].timestamp
          : undefined,
      logCount: dayEvents.length,
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
  const workingDays = dailySummaries.filter(
    (d) => d.workedSeconds > 0,
  ).length;

  return {
    yearMonth,
    totalWorkedSeconds,
    workingDays,
    dailySummaries,
  };
}

function encodeCursor(timestamp: string, id: number): string {
  const payload: CursorPayload = { timestamp, id };
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
}

function decodeCursorValue(cursor: string): CursorPayload | null {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64").toString("utf8"));
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof parsed.timestamp === "string" &&
      Number.isInteger(parsed.id)
    ) {
      return { timestamp: parsed.timestamp, id: parsed.id };
    }
    return null;
  } catch {
    return null;
  }
}

