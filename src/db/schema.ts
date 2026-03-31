import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

const nowIso = () => new Date().toISOString();

export const workSessions = sqliteTable(
  "work_sessions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    date: text("date").notNull(),
    clockInAt: text("clock_in_at").notNull(),
    clockOutAt: text("clock_out_at"),
    note: text("note"),
    createdAt: text("created_at").notNull().$defaultFn(nowIso),
    updatedAt: text("updated_at").notNull().$defaultFn(nowIso),
  },
  (table) => [
    index("idx_work_sessions_date").on(table.date),
    index("idx_work_sessions_clock_in").on(table.clockInAt),
  ],
);

export const breakSessions = sqliteTable(
  "break_sessions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    workSessionId: integer("work_session_id")
      .notNull()
      .references(() => workSessions.id, { onDelete: "cascade", onUpdate: "cascade" }),
    startAt: text("start_at").notNull(),
    endAt: text("end_at"),
    note: text("note"),
    createdAt: text("created_at").notNull().$defaultFn(nowIso),
    updatedAt: text("updated_at").notNull().$defaultFn(nowIso),
  },
  (table) => [
    index("idx_break_sessions_work_session_id").on(table.workSessionId),
  ],
);

export const workSessionsRelations = relations(workSessions, ({ many }) => ({
  breaks: many(breakSessions),
}));

export const breakSessionsRelations = relations(breakSessions, ({ one }) => ({
  workSession: one(workSessions, {
    fields: [breakSessions.workSessionId],
    references: [workSessions.id],
  }),
}));
