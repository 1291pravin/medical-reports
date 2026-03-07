CREATE TYPE "public"."timeline_event_category" AS ENUM('surgery', 'diagnosis', 'medication', 'lab', 'vaccination', 'hospitalization', 'consultation', 'other');--> statement-breakpoint
CREATE TYPE "public"."timeline_source_type" AS ENUM('ai_extracted', 'manual');--> statement-breakpoint
CREATE TABLE "timeline_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_member_id" uuid NOT NULL,
	"document_id" uuid,
	"title" text NOT NULL,
	"event_date" date,
	"category" timeline_event_category DEFAULT 'other' NOT NULL,
	"description" text,
	"source_type" timeline_source_type DEFAULT 'ai_extracted' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "timeline_events" ADD CONSTRAINT "timeline_events_family_member_id_family_members_id_fk" FOREIGN KEY ("family_member_id") REFERENCES "public"."family_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeline_events" ADD CONSTRAINT "timeline_events_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE set null ON UPDATE no action;