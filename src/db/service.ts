import { getPrismaClient } from "./client";
import { Prisma } from "@prisma/client";
import {
  ATTENDANCE_EVENT_TYPES,
  type AttendanceEventType,
  type AttendanceLog,
  type AttendanceLogsPage,
  type AttendanceSummary,
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
      type: toLegacyType(eventType),
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
    eventType: normalizeEventType(row.eventType, row.type),
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

export async function getTodaySummary(
  dayStartIso: string,
  dayEndIso: string,
): Promise<AttendanceSummary> {
  const prisma = getPrismaClient();

  const firstClockInRow = await prisma.attendanceLog.findFirst({
    where: {
      timestamp: { gte: dayStartIso, lt: dayEndIso },
      OR: [
        { eventType: "clock_in" },
        {
          eventType: "",
          type: { in: ["打刻", "出勤", "clock_in"] },
        },
      ],
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
  if (currentClockInTime !== null) {
    workedSeconds += Math.floor((Date.now() - currentClockInTime) / 1000);
  }

  return {
    firstClockIn: firstClockInRow?.timestamp || undefined,
    latestEvent: latestEventRow?.timestamp || undefined,
    workedSeconds: Math.max(0, workedSeconds),
    isWorking,
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

function normalizeEventType(
  eventType: string | undefined | null,
  legacyType: string | undefined | null,
): AttendanceEventType {
  if (
    eventType &&
    ATTENDANCE_EVENT_TYPES.includes(eventType as AttendanceEventType)
  ) {
    return eventType as AttendanceEventType;
  }

  switch (legacyType) {
    case "退勤":
    case "clock_out":
      return "clock_out";
    case "休憩開始":
    case "break_start":
      return "break_start";
    case "休憩終了":
    case "break_end":
      return "break_end";
    default:
      return "clock_in";
  }
}

function toLegacyType(eventType: AttendanceEventType): string {
  switch (eventType) {
    case "clock_out":
      return "退勤";
    case "break_start":
      return "休憩開始";
    case "break_end":
      return "休憩終了";
    case "clock_in":
    default:
      return "打刻";
  }
}
