ALTER TABLE `flavors` ADD `pattern` varchar(12) DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE `flavors` ADD `accent` varchar(7) DEFAULT '#3E2A22' NOT NULL;--> statement-breakpoint
UPDATE `flavors` SET `pattern` = 'seeds', `accent` = '#3B2A20' WHERE `pattern` = 'none' AND `name` IN ('Vanille', 'Vanilla');--> statement-breakpoint
UPDATE `flavors` SET `pattern` = 'chunks', `accent` = '#C23A55' WHERE `pattern` = 'none' AND `name` IN ('Fraise', 'Strawberry');--> statement-breakpoint
UPDATE `flavors` SET `pattern` = 'chunks', `accent` = '#6F9A4F' WHERE `pattern` = 'none' AND `name` IN ('Pistache', 'Pistachio');--> statement-breakpoint
UPDATE `flavors` SET `pattern` = 'swirl', `accent` = '#A5652B' WHERE `pattern` = 'none' AND `name` IN ('Caramel beurre salé', 'Salted caramel');--> statement-breakpoint
UPDATE `flavors` SET `pattern` = 'flecks', `accent` = '#3E2A22' WHERE `pattern` = 'none' AND `name` IN ('Menthe chocolat', 'Mint chocolate chip');--> statement-breakpoint
UPDATE `flavors` SET `pattern` = 'seeds', `accent` = '#8E1F3D' WHERE `pattern` = 'none' AND `name` IN ('Framboise', 'Raspberry');--> statement-breakpoint
UPDATE `flavors` SET `pattern` = 'flecks', `accent` = '#C9BBA5' WHERE `pattern` = 'none' AND `name` IN ('Noix de coco', 'Coconut');--> statement-breakpoint
UPDATE `flavors` SET `pattern` = 'flecks', `accent` = '#3E2A22' WHERE `pattern` = 'none' AND `name` IN ('Stracciatella', 'Stracciatella');
