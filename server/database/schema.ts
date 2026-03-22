import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  date,
  integer,
  numeric,
  jsonb,
  pgEnum,
  primaryKey,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// Enums
export const documentCategoryEnum = pgEnum('document_category', [
  'lab_report',
  'prescription',
  'scan',
  'discharge_summary',
  'vaccination',
  'insurance',
  'other',
])

export const conditionStatusEnum = pgEnum('condition_status', [
  'active',
  'resolved',
  'monitoring',
])

export const timelineEventCategoryEnum = pgEnum('timeline_event_category', [
  'surgery',
  'diagnosis',
  'medication',
  'lab',
  'vaccination',
  'hospitalization',
  'consultation',
  'other',
])

export const timelineSourceTypeEnum = pgEnum('timeline_source_type', [
  'ai_extracted',
  'manual',
])

export const chatRoleEnum = pgEnum('chat_role', ['user', 'assistant'])

export const followUpStatusEnum = pgEnum('follow_up_status', ['pending', 'completed', 'dismissed'])

export const weightLogSourceEnum = pgEnum('weight_log_source', ['manual', 'document'])

export const appointmentTypeEnum = pgEnum('appointment_type', [
  'consultation',
  'lab_test',
  'imaging',
  'vaccination',
  'dental',
  'eye_exam',
  'therapy',
  'other',
])

export const appointmentStatusEnum = pgEnum('appointment_status', [
  'scheduled',
  'completed',
  'cancelled',
  'rescheduled',
  'no_show',
])

// Tables
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const familyMembers = pgTable('family_members', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  dob: date('dob'),
  weightKg: numeric('weight_kg', { precision: 5, scale: 2 }),
  heightCm: numeric('height_cm', { precision: 5, scale: 2 }),
  bloodGroup: text('blood_group'),
  allergies: text('allergies').array(),
  emergencyContact: text('emergency_contact'),
  dietPreference: text('diet_preference'),
  photoUrl: text('photo_url'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const documents = pgTable('documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  familyMemberId: uuid('family_member_id')
    .references(() => familyMembers.id, { onDelete: 'cascade' })
    .notNull(),
  title: text('title').notNull(),
  fileUrl: text('file_url').notNull(),
  fileType: text('file_type').notNull(),
  fileSize: integer('file_size'),
  category: documentCategoryEnum('category'),
  reportDate: date('report_date'),
  isProcessed: boolean('is_processed').default(false).notNull(),
  isApproved: boolean('is_approved').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const aiSummaries = pgTable('ai_summaries', {
  id: uuid('id').defaultRandom().primaryKey(),
  documentId: uuid('document_id')
    .references(() => documents.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  summary: text('summary'),
  diagnosis: text('diagnosis').array(),
  keyFindings: text('key_findings').array(),
  testValues: jsonb('test_values'),
  doctorName: text('doctor_name'),
  hospitalName: text('hospital_name'),
  confidence: numeric('confidence'),
  isReviewed: boolean('is_reviewed').default(false).notNull(),
  rawExtraction: jsonb('raw_extraction'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const medications = pgTable('medications', {
  id: uuid('id').defaultRandom().primaryKey(),
  familyMemberId: uuid('family_member_id')
    .references(() => familyMembers.id, { onDelete: 'cascade' })
    .notNull(),
  documentId: uuid('document_id').references(() => documents.id, {
    onDelete: 'set null',
  }),
  name: text('name').notNull(),
  dosage: text('dosage'),
  frequency: text('frequency'),
  startDate: date('start_date'),
  endDate: date('end_date'),
  purpose: text('purpose'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const conditions = pgTable('conditions', {
  id: uuid('id').defaultRandom().primaryKey(),
  familyMemberId: uuid('family_member_id')
    .references(() => familyMembers.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  firstDetected: date('first_detected'),
  status: conditionStatusEnum('status').default('active').notNull(),
  notes: text('notes'),
})

export const documentConditions = pgTable(
  'document_conditions',
  {
    documentId: uuid('document_id')
      .references(() => documents.id, { onDelete: 'cascade' })
      .notNull(),
    conditionId: uuid('condition_id')
      .references(() => conditions.id, { onDelete: 'cascade' })
      .notNull(),
  },
  (table) => [primaryKey({ columns: [table.documentId, table.conditionId] })],
)

export const memberHealthSummaries = pgTable('member_health_summaries', {
  id: uuid('id').defaultRandom().primaryKey(),
  familyMemberId: uuid('family_member_id')
    .references(() => familyMembers.id, { onDelete: 'cascade' })
    .notNull(),
  summaryText: text('summary_text'),
  conditions: jsonb('conditions'),
  alerts: jsonb('alerts'),
  recommendations: jsonb('recommendations'),
  lastUpdatedFromDocId: uuid('last_updated_from_doc_id').references(
    () => documents.id,
    { onDelete: 'set null' },
  ),
  version: integer('version').default(1).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const timelineEvents = pgTable('timeline_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  familyMemberId: uuid('family_member_id')
    .references(() => familyMembers.id, { onDelete: 'cascade' })
    .notNull(),
  documentId: uuid('document_id').references(() => documents.id, {
    onDelete: 'set null',
  }),
  title: text('title').notNull(),
  eventDate: date('event_date'),
  category: timelineEventCategoryEnum('category').default('other').notNull(),
  description: text('description'),
  sourceType: timelineSourceTypeEnum('source_type').default('ai_extracted').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const chatMessages = pgTable('chat_messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  familyMemberId: uuid('family_member_id').references(
    () => familyMembers.id,
    { onDelete: 'cascade' },
  ),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  role: chatRoleEnum('role').notNull(),
  content: text('content').notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const followUps = pgTable('follow_ups', {
  id: uuid('id').defaultRandom().primaryKey(),
  familyMemberId: uuid('family_member_id').references(() => familyMembers.id, { onDelete: 'cascade' }).notNull(),
  documentId: uuid('document_id').references(() => documents.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  dueDate: date('due_date'),
  instructions: text('instructions'),
  doctorName: text('doctor_name'),
  hospitalName: text('hospital_name'),
  status: followUpStatusEnum('status').default('pending').notNull(),
  sourceType: timelineSourceTypeEnum('source_type').default('ai_extracted').notNull(),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const weightLogs = pgTable('weight_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  familyMemberId: uuid('family_member_id')
    .references(() => familyMembers.id, { onDelete: 'cascade' })
    .notNull(),
  weightKg: numeric('weight_kg', { precision: 5, scale: 2 }).notNull(),
  recordedAt: date('recorded_at').notNull(),
  source: weightLogSourceEnum('source').default('manual').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const labResults = pgTable('lab_results', {
  id: uuid('id').defaultRandom().primaryKey(),
  familyMemberId: uuid('family_member_id')
    .references(() => familyMembers.id, { onDelete: 'cascade' })
    .notNull(),
  documentId: uuid('document_id').references(() => documents.id, {
    onDelete: 'set null',
  }),
  testName: text('test_name').notNull(),
  testValue: text('test_value').notNull(),
  numericValue: numeric('numeric_value', { precision: 10, scale: 4 }),
  unit: text('unit'),
  referenceMin: numeric('reference_min', { precision: 10, scale: 4 }),
  referenceMax: numeric('reference_max', { precision: 10, scale: 4 }),
  isAbnormal: boolean('is_abnormal').default(false),
  reportDate: date('report_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const appointments = pgTable('appointments', {
  id: uuid('id').defaultRandom().primaryKey(),
  familyMemberId: uuid('family_member_id')
    .references(() => familyMembers.id, { onDelete: 'cascade' })
    .notNull(),
  followUpId: uuid('follow_up_id').references(() => followUps.id, { onDelete: 'set null' }),
  appointmentType: appointmentTypeEnum('appointment_type').default('consultation').notNull(),
  dateTime: timestamp('date_time').notNull(),
  endDateTime: timestamp('end_date_time'),
  location: text('location'),
  doctorName: text('doctor_name'),
  notes: text('notes'),
  status: appointmentStatusEnum('status').default('scheduled').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  familyMembers: many(familyMembers),
  chatMessages: many(chatMessages),
}))

export const familyMembersRelations = relations(
  familyMembers,
  ({ one, many }) => ({
    user: one(users, {
      fields: [familyMembers.userId],
      references: [users.id],
    }),
    documents: many(documents),
    medications: many(medications),
    conditions: many(conditions),
    healthSummaries: many(memberHealthSummaries),
    timelineEvents: many(timelineEvents),
    followUps: many(followUps),
    appointments: many(appointments),
    weightLogs: many(weightLogs),
    labResults: many(labResults),
  }),
)

export const documentsRelations = relations(documents, ({ one, many }) => ({
  familyMember: one(familyMembers, {
    fields: [documents.familyMemberId],
    references: [familyMembers.id],
  }),
  aiSummary: one(aiSummaries),
  medications: many(medications),
  documentConditions: many(documentConditions),
}))

export const aiSummariesRelations = relations(aiSummaries, ({ one }) => ({
  document: one(documents, {
    fields: [aiSummaries.documentId],
    references: [documents.id],
  }),
}))

export const medicationsRelations = relations(medications, ({ one }) => ({
  familyMember: one(familyMembers, {
    fields: [medications.familyMemberId],
    references: [familyMembers.id],
  }),
  document: one(documents, {
    fields: [medications.documentId],
    references: [documents.id],
  }),
}))

export const conditionsRelations = relations(conditions, ({ one, many }) => ({
  familyMember: one(familyMembers, {
    fields: [conditions.familyMemberId],
    references: [familyMembers.id],
  }),
  documentConditions: many(documentConditions),
}))

export const documentConditionsRelations = relations(
  documentConditions,
  ({ one }) => ({
    document: one(documents, {
      fields: [documentConditions.documentId],
      references: [documents.id],
    }),
    condition: one(conditions, {
      fields: [documentConditions.conditionId],
      references: [conditions.id],
    }),
  }),
)

export const memberHealthSummariesRelations = relations(
  memberHealthSummaries,
  ({ one }) => ({
    familyMember: one(familyMembers, {
      fields: [memberHealthSummaries.familyMemberId],
      references: [familyMembers.id],
    }),
    lastDocument: one(documents, {
      fields: [memberHealthSummaries.lastUpdatedFromDocId],
      references: [documents.id],
    }),
  }),
)

export const timelineEventsRelations = relations(timelineEvents, ({ one }) => ({
  familyMember: one(familyMembers, {
    fields: [timelineEvents.familyMemberId],
    references: [familyMembers.id],
  }),
  document: one(documents, {
    fields: [timelineEvents.documentId],
    references: [documents.id],
  }),
}))

export const followUpsRelations = relations(followUps, ({ one }) => ({
  familyMember: one(familyMembers, { fields: [followUps.familyMemberId], references: [familyMembers.id] }),
  document: one(documents, { fields: [followUps.documentId], references: [documents.id] }),
}))

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  familyMember: one(familyMembers, {
    fields: [chatMessages.familyMemberId],
    references: [familyMembers.id],
  }),
  user: one(users, {
    fields: [chatMessages.userId],
    references: [users.id],
  }),
}))

export const weightLogsRelations = relations(weightLogs, ({ one }) => ({
  familyMember: one(familyMembers, {
    fields: [weightLogs.familyMemberId],
    references: [familyMembers.id],
  }),
}))

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  familyMember: one(familyMembers, {
    fields: [appointments.familyMemberId],
    references: [familyMembers.id],
  }),
  followUp: one(followUps, {
    fields: [appointments.followUpId],
    references: [followUps.id],
  }),
}))

export const labResultsRelations = relations(labResults, ({ one }) => ({
  familyMember: one(familyMembers, {
    fields: [labResults.familyMemberId],
    references: [familyMembers.id],
  }),
  document: one(documents, {
    fields: [labResults.documentId],
    references: [documents.id],
  }),
}))
