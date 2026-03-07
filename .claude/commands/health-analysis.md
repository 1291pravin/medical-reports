# Health Analysis Command

Analyze all medical reports for a family member and update their health summary, conditions, and medications in the database.

## Usage
Provide the member_id (UUID) as the argument: `/health-analysis <member_id>`
If no member_id provided, list all members and ask which one to analyze.

The argument is: $ARGUMENTS

## Database Access

This project uses Docker PostgreSQL. All queries use:
```
docker exec medical-records-db psql -U medrecords -d medrecords -c "<SQL>"
```

## Step-by-Step Process

### Step 1: Get Member Info
```sql
SELECT id, name, dob, blood_group, allergies, diet_preference
FROM family_members WHERE id = '<member_id>';
```

If member not found, show available members:
```sql
SELECT id, name, dob FROM family_members;
```

### Step 2: Get All Documents & AI Summaries
```sql
SELECT d.id, d.title, d.category, d.report_date, d.is_approved,
       a.summary, a.diagnosis, a.key_findings, a.test_values,
       a.doctor_name, a.hospital_name, a.raw_extraction, a.is_reviewed
FROM documents d
LEFT JOIN ai_summaries a ON a.document_id = d.id
WHERE d.family_member_id = '<member_id>'
ORDER BY d.report_date;
```

### Step 3: Check What's Already Analyzed
```sql
SELECT version, last_updated_from_doc_id, created_at,
       substring(summary_text, 1, 200) as summary_preview
FROM member_health_summaries
WHERE family_member_id = '<member_id>'
ORDER BY version DESC LIMIT 1;
```

### Step 4: Get Current Conditions & Medications
```sql
SELECT id, name, status, first_detected, notes FROM conditions
WHERE family_member_id = '<member_id>';

SELECT id, name, dosage, frequency, purpose, is_active, start_date, end_date, document_id
FROM medications WHERE family_member_id = '<member_id>';
```

### Step 5: Read Actual Report Files (if needed)
If AI summaries are missing or incomplete for any document, read the actual uploaded files:
- Files are stored under `uploads/documents/<member_id>/` directory
- Use `ls` to find files, then `Read` tool to view images/PDFs
- This gives you the raw report data to analyze

### Step 6: Analyze & Decide What Needs Updating

Compare the last health summary version against current documents. Identify:
- **New documents** not yet incorporated into the summary (documents uploaded after the last summary update)
- **Incorrect conditions** (e.g., test results stored as conditions like "Negative for HIV antibodies")
- **Missing medications** from prescriptions
- **Incomplete summaries** (empty fields, generic text)

Report to the user what you found and what you plan to update before making changes.

### Step 7: Clean Up Bad Data

Fix any issues found:
- Remove non-conditions from the `conditions` table (test results are NOT conditions)
- Fix condition names to be medically accurate
- Add missing medications from prescription documents
- Update medication `is_active` based on end dates

### Step 8: Generate Comprehensive Health Summary

Using YOUR medical knowledge (not the AI API), create a proper health summary based on ALL reports. The summary goes into `member_health_summaries` table.

#### Schema for summary_text (JSON string):
```json
{
  "executiveSummary": "2-3 sentence overall health status mentioning age, key findings, and overall assessment",
  "keyHealthMetrics": [
    { "label": "Test/Metric Name", "value": "Result", "status": "normal|warning|critical" }
  ],
  "riskFactors": ["List of identified risk factors based on age, reports, lifestyle"],
  "trends": ["Observable health trends from the data"]
}
```

#### Schema for alerts (JSONB array):
```json
[{ "type": "warning|info|critical", "message": "Actionable alert message" }]
```

#### Schema for recommendations (JSONB object):
```json
{
  "exercise": [{ "title": "...", "description": "...", "frequency": "...", "priority": "high|medium|low" }],
  "diet": [{ "title": "...", "description": "...", "priority": "high|medium|low" }],
  "lifestyle": [{ "title": "...", "description": "...", "priority": "high|medium|low" }],
  "monitoring": [{ "testName": "...", "reason": "...", "suggestedInterval": "...", "priority": "high|medium|low" }]
}
```

#### Schema for conditions (JSONB array in health summary):
```json
[{ "name": "Condition name", "status": "active|resolved|monitoring", "since": "YYYY-MM-DD" }]
```

### Step 9: Write to Database

**Option A: Update existing latest version** (if just fixing/improving current data):
```sql
UPDATE member_health_summaries SET
  summary_text = '<json_string>',
  alerts = '<json>',
  recommendations = '<json>',
  conditions = '<json>',
  last_updated_from_doc_id = '<latest_doc_id>',
  updated_at = NOW()
WHERE family_member_id = '<member_id>' AND version = <current_version>;
```

**Option B: Create new version** (if new documents have been added since last analysis):
```sql
INSERT INTO member_health_summaries
  (family_member_id, summary_text, conditions, alerts, recommendations, last_updated_from_doc_id, version)
VALUES ('<member_id>', '<json_string>', '<json>', '<json>', '<json>', '<latest_doc_id>', <next_version>);
```

### Step 10: Report Results

After updating, show the user:
1. What was analyzed (list of reports)
2. What was updated (conditions, medications, summary)
3. What's still missing (recommended reports that should be uploaded)
4. Key health findings in plain language

## Important Guidelines

- **Be medically accurate**: Use proper medical terminology for conditions. "Dental caries" not "Decay with multiple teeth". "Non-reactive" test results are NOT conditions.
- **Consider the whole picture**: Age, diet preference, blood group, allergies all matter for recommendations.
- **Flag gaps**: Always mention what important tests/reports are missing for a comprehensive health profile.
- **Respect diet preferences**: If vegetarian, recommend B12/iron-rich vegetarian sources, not meat.
- **Be conservative with conditions**: Only list actual diagnosed medical conditions, not normal test results.
- **Track incremental analysis**: Use `last_updated_from_doc_id` and `version` to know what's already been analyzed. Only create a new version if there's new data.
- **Age-appropriate recommendations**: A 77-year-old gets different advice than a 31-year-old.
