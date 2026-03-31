CREATE TABLE `break_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`work_session_id` integer NOT NULL,
	`start_at` text NOT NULL,
	`end_at` text,
	`note` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`work_session_id`) REFERENCES `work_sessions`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_break_sessions_work_session_id` ON `break_sessions` (`work_session_id`);--> statement-breakpoint
CREATE TABLE `work_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`clock_in_at` text NOT NULL,
	`clock_out_at` text,
	`note` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_work_sessions_date` ON `work_sessions` (`date`);--> statement-breakpoint
CREATE INDEX `idx_work_sessions_clock_in` ON `work_sessions` (`clock_in_at`);