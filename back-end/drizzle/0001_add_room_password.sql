ALTER TABLE "rooms" ADD COLUMN "password" text;--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "has_password" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_has_password_matches_secret" CHECK ("rooms"."has_password" = ("rooms"."password" is not null));