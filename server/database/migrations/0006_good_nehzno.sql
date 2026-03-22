CREATE TABLE "notification_reads" (
	"user_id" uuid NOT NULL,
	"notification_key" text NOT NULL,
	"read_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "notification_reads_user_id_notification_key_pk" PRIMARY KEY("user_id","notification_key")
);
--> statement-breakpoint
ALTER TABLE "notification_reads" ADD CONSTRAINT "notification_reads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;