CREATE TABLE `containers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`name` varchar(40) NOT NULL,
	`kind` enum('cone','cup') NOT NULL,
	`max_scoops` int NOT NULL,
	`available` tinyint NOT NULL DEFAULT 1,
	`archived` tinyint NOT NULL DEFAULT 0,
	`position` int NOT NULL DEFAULT 0,
	CONSTRAINT `containers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `flavors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`name` varchar(60) NOT NULL,
	`color` varchar(7) NOT NULL,
	`available` tinyint NOT NULL DEFAULT 1,
	`archived` tinyint NOT NULL DEFAULT 0,
	`position` int NOT NULL DEFAULT 0,
	CONSTRAINT `flavors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`round_id` int NOT NULL,
	`name` varchar(40) NOT NULL,
	`container_id` int NOT NULL,
	`scoops` text NOT NULL,
	`toppings` text NOT NULL,
	`note` varchar(140),
	`source` enum('host','guest') NOT NULL DEFAULT 'host',
	`guest_token` varchar(64),
	`served_at` datetime,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rounds` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`title` varchar(80) NOT NULL,
	`code` varchar(16) NOT NULL,
	`status` enum('open','closed') NOT NULL DEFAULT 'open',
	`checks` text NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`closed_at` datetime,
	CONSTRAINT `rounds_id` PRIMARY KEY(`id`),
	CONSTRAINT `rounds_code_idx` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `toppings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`name` varchar(60) NOT NULL,
	`available` tinyint NOT NULL DEFAULT 1,
	`archived` tinyint NOT NULL DEFAULT 0,
	`position` int NOT NULL DEFAULT 0,
	CONSTRAINT `toppings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`name` varchar(120) NOT NULL,
	`password_hash` varchar(200) NOT NULL,
	`anonymous` tinyint NOT NULL DEFAULT 0,
	`session_version` int NOT NULL DEFAULT 0,
	`premium` tinyint NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_idx` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE INDEX `containers_user_idx` ON `containers` (`user_id`);--> statement-breakpoint
CREATE INDEX `flavors_user_idx` ON `flavors` (`user_id`);--> statement-breakpoint
CREATE INDEX `orders_round_idx` ON `orders` (`round_id`);--> statement-breakpoint
CREATE INDEX `rounds_user_idx` ON `rounds` (`user_id`);--> statement-breakpoint
CREATE INDEX `toppings_user_idx` ON `toppings` (`user_id`);