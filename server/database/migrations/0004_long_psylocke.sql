CREATE TYPE "public"."weight_log_source" AS ENUM('manual', 'document');--> statement-breakpoint
CREATE TABLE "lab_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_member_id" uuid NOT NULL,
	"document_id" uuid,
	"test_name" text NOT NULL,
	"test_value" text NOT NULL,
	"numeric_value" numeric(10, 4),
	"unit" text,
	"reference_min" numeric(10, 4),
	"reference_max" numeric(10, 4),
	"is_abnormal" boolean DEFAULT false,
	"report_date" date,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weight_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_member_id" uuid NOT NULL,
	"weight_kg" numeric(5, 2) NOT NULL,
	"recorded_at" date NOT NULL,
	"source" "weight_log_source" DEFAULT 'manual' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lab_results" ADD CONSTRAINT "lab_results_family_member_id_family_members_id_fk" FOREIGN KEY ("family_member_id") REFERENCES "public"."family_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_results" ADD CONSTRAINT "lab_results_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weight_logs" ADD CONSTRAINT "weight_logs_family_member_id_family_members_id_fk" FOREIGN KEY ("family_member_id") REFERENCES "public"."family_members"("id") ON DELETE cascade ON UPDATE no action;