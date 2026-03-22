CREATE TYPE "public"."appointment_status" AS ENUM('scheduled', 'completed', 'cancelled', 'rescheduled', 'no_show');--> statement-breakpoint
CREATE TYPE "public"."appointment_type" AS ENUM('consultation', 'lab_test', 'imaging', 'vaccination', 'dental', 'eye_exam', 'therapy', 'other');--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_member_id" uuid NOT NULL,
	"follow_up_id" uuid,
	"appointment_type" "appointment_type" DEFAULT 'consultation' NOT NULL,
	"date_time" timestamp NOT NULL,
	"end_date_time" timestamp,
	"location" text,
	"doctor_name" text,
	"notes" text,
	"status" "appointment_status" DEFAULT 'scheduled' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_family_member_id_family_members_id_fk" FOREIGN KEY ("family_member_id") REFERENCES "public"."family_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_follow_up_id_follow_ups_id_fk" FOREIGN KEY ("follow_up_id") REFERENCES "public"."follow_ups"("id") ON DELETE set null ON UPDATE no action;