CREATE TYPE "public"."follow_up_status" AS ENUM('pending', 'completed', 'dismissed');--> statement-breakpoint
CREATE TABLE "follow_ups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_member_id" uuid NOT NULL,
	"document_id" uuid,
	"title" text NOT NULL,
	"due_date" date,
	"instructions" text,
	"doctor_name" text,
	"hospital_name" text,
	"status" "follow_up_status" DEFAULT 'pending' NOT NULL,
	"source_type" timeline_source_type DEFAULT 'ai_extracted' NOT NULL,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "family_members" ADD COLUMN "weight_kg" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "family_members" ADD COLUMN "height_cm" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_family_member_id_family_members_id_fk" FOREIGN KEY ("family_member_id") REFERENCES "public"."family_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE set null ON UPDATE no action;