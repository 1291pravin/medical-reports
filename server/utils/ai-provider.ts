import { spawn } from 'node:child_process'
import { writeFile, unlink, mkdtemp } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import OpenAI from 'openai'

// ─── Types ──────────────────────────────────────────────────────────

export interface DocumentExtraction {
  isMedicalDocument?: boolean
  title?: string
  category: string
  summary: string
  diagnosis: string[]
  medications: {
    name: string
    dosage?: string
    frequency?: string
    duration?: string
    purpose?: string
  }[]
  testValues: {
    name: string
    value: string
    unit?: string
    normalRange?: string
    isAbnormal?: boolean
  }[]
  doctorName?: string
  hospitalName?: string
  reportDate?: string
  keyFindings: string[]
  timelineEvents?: {
    title: string
    eventDate?: string
    category: string
    description?: string
  }[]
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

// ─── Provider interface ─────────────────────────────────────────────

export interface AIProvider {
  extractDocument(fileBytes: Uint8Array, fileType: string): Promise<DocumentExtraction>
  generateJSON(systemPrompt: string, userContent: string): Promise<any>
  chat(systemPrompt: string, messages: ChatMessage[]): Promise<string>
}

// ─── Prompts (shared across providers) ──────────────────────────────

export function getExtractionPrompt(): string {
  const today = new Date().toISOString().split('T')[0]
  return `You are a medical document analyzer. Today's date is ${today}. Analyze the provided medical document and extract structured information.

Return a JSON object with these fields:
{
  "isMedicalDocument": true or false,
  "title": "A concise descriptive title for this report (e.g., 'Complete Blood Count - Jan 2024', 'Chest X-Ray Report', 'Prescription - Dr. Smith')",
  "category": "lab_report" | "prescription" | "scan" | "discharge_summary" | "vaccination" | "insurance" | "other",
  "summary": "Brief 2-3 sentence summary of the document",
  "diagnosis": ["list of diagnoses or conditions mentioned"],
  "medications": [
    {
      "name": "medication name",
      "dosage": "dosage amount",
      "frequency": "how often",
      "duration": "for how long",
      "purpose": "what it's for"
    }
  ],
  "testValues": [
    {
      "name": "test name",
      "value": "result value",
      "unit": "unit of measurement",
      "normalRange": "normal range if mentioned",
      "isAbnormal": true/false
    }
  ],
  "doctorName": "doctor name if mentioned",
  "hospitalName": "hospital/clinic name if mentioned",
  "reportDate": "date of report in YYYY-MM-DD format if found",
  "keyFindings": ["list of key findings or observations"],
  "timelineEvents": [
    {
      "title": "Short event title (e.g., 'Left Eye Cataract Surgery', 'Diagnosed with Diabetes', 'Started Metformin')",
      "eventDate": "YYYY-MM-DD if found",
      "category": "surgery" | "diagnosis" | "medication" | "lab" | "vaccination" | "hospitalization" | "consultation" | "other",
      "description": "Brief description of the event"
    }
  ]
}

Set "isMedicalDocument" to false if the document is NOT a medical/health-related document (e.g., receipts, invoices, random photos, non-medical text). If false, you may skip all other fields.
Only include fields where you find relevant information. Be precise with medication dosages and test values. Flag abnormal test values. Always provide a meaningful title and try to extract the report date.
For timelineEvents: Extract ALL significant medical events with dates from the document - surgeries, diagnoses, hospital admissions/discharges, vaccinations, medication starts/stops, significant lab results, consultations. Each event should be a distinct, dated occurrence.
IMPORTANT: Return ONLY valid JSON, no markdown fences, no extra text.`
}

export function getHealthSummaryPrompt(): string {
  const today = new Date().toISOString().split('T')[0]
  return `Today's date is ${today}. You are a health analysis agent. Analyze the patient's health data and return structured JSON.

Consider the patient's age, weight, height, BMI, blood group, allergies, diet preference, conditions, medications, and lab values when generating insights.

Return JSON with this exact structure:
{
  "summaryText": {
    "executiveSummary": "2-3 sentence overall health status",
    "keyHealthMetrics": [{ "label": "...", "value": "...", "status": "normal|warning|critical" }],
    "riskFactors": ["..."],
    "trends": ["..."]
  },
  "alerts": [{ "type": "warning|info|critical", "message": "..." }],
  "recommendations": {
    "exercise": [{ "title": "...", "description": "...", "frequency": "...", "priority": "high|medium|low" }],
    "diet": [{ "title": "...", "description": "...", "priority": "high|medium|low" }],
    "lifestyle": [{ "title": "...", "description": "...", "priority": "high|medium|low" }],
    "monitoring": [{ "testName": "...", "reason": "...", "suggestedInterval": "...", "priority": "high|medium|low" }]
  }
}

Do not flag dates as being in the future if they are before or on today's date. Be specific and actionable in recommendations. Respect the patient's diet preference when making diet recommendations.
IMPORTANT: Return ONLY valid JSON, no markdown fences, no extra text.`
}

// ─── JSON extraction helper ─────────────────────────────────────────

function extractJSON(text: string): any {
  // Try direct parse first
  try {
    return JSON.parse(text.trim())
  } catch {}

  // Try extracting from markdown code fences
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1].trim())
    } catch {}
  }

  // Try finding first { to last }
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start !== -1 && end > start) {
    try {
      return JSON.parse(text.slice(start, end + 1))
    } catch {}
  }

  console.error('[AI] Failed to extract JSON from response (first 500 chars):', text.slice(0, 500))
  throw new Error('Could not extract valid JSON from AI response')
}

// ─── CLI Provider (shared logic for codex/claude) ───────────────────

function runCli(command: string, args: string[], input: string, timeoutMs = 300000): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
      timeout: timeoutMs,
    })

    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (d: Buffer) => { stdout += d.toString() })
    child.stderr.on('data', (d: Buffer) => { stderr += d.toString() })

    child.on('error', (err) => {
      reject(new Error(`Failed to start ${command}: ${err.message}. Is ${command} installed and in PATH?`))
    })

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`${command} exited with code ${code}: ${stderr || stdout}`))
      } else {
        resolve(stdout)
      }
    })

    child.stdin.write(input)
    child.stdin.end()
  })
}

class ClaudeCliProvider implements AIProvider {
  async extractDocument(fileBytes: Uint8Array, fileType: string): Promise<DocumentExtraction> {
    const tmpDir = await mkdtemp(join(tmpdir(), 'med-'))
    const ext = fileType.includes('pdf') ? 'pdf' : fileType.includes('png') ? 'png' : 'jpg'
    const tmpFile = join(tmpDir, `document.${ext}`)

    try {
      await writeFile(tmpFile, fileBytes)
      const prompt = `${getExtractionPrompt()}\n\nThe medical document file is at: ${tmpFile}\nPlease read and analyze it, then return the JSON extraction.`
      const output = await runCli('claude', ['-p', '--output-format', 'text', '--max-turns', '3'], prompt)
      return extractJSON(output)
    } finally {
      await unlink(tmpFile).catch(() => {})
    }
  }

  async generateJSON(systemPrompt: string, userContent: string): Promise<any> {
    const prompt = `${systemPrompt}\n\nData to analyze:\n${userContent}`
    const output = await runCli('claude', ['-p', '--output-format', 'text', '--max-turns', '1'], prompt)
    return extractJSON(output)
  }

  async chat(systemPrompt: string, messages: ChatMessage[]): Promise<string> {
    const conversationText = messages
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n\n')

    const prompt = `${systemPrompt}\n\nConversation so far:\n${conversationText}\n\nRespond to the user's last message. Be helpful, clear, and conversational. Do not wrap your response in any role prefix.`
    const output = await runCli('claude', ['-p', '--output-format', 'text', '--max-turns', '1'], prompt)
    return output.trim()
  }
}

class CodexCliProvider implements AIProvider {
  async extractDocument(fileBytes: Uint8Array, fileType: string): Promise<DocumentExtraction> {
    const tmpDir = await mkdtemp(join(tmpdir(), 'med-'))
    const ext = fileType.includes('pdf') ? 'pdf' : fileType.includes('png') ? 'png' : 'jpg'
    const tmpFile = join(tmpDir, `document.${ext}`)

    try {
      await writeFile(tmpFile, fileBytes)
      const prompt = `${getExtractionPrompt()}\n\nThe medical document file is at: ${tmpFile}\nPlease read and analyze it, then return the JSON extraction.`
      const output = await runCli('codex', ['exec'], prompt)
      return extractJSON(output)
    } finally {
      await unlink(tmpFile).catch(() => {})
    }
  }

  async generateJSON(systemPrompt: string, userContent: string): Promise<any> {
    const prompt = `${systemPrompt}\n\nData to analyze:\n${userContent}`
    const output = await runCli('codex', ['exec'], prompt)
    return extractJSON(output)
  }

  async chat(systemPrompt: string, messages: ChatMessage[]): Promise<string> {
    const conversationText = messages
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n\n')

    const prompt = `${systemPrompt}\n\nConversation so far:\n${conversationText}\n\nRespond to the user's last message. Be helpful, clear, and conversational. Do not wrap your response in any role prefix.`
    const output = await runCli('codex', ['exec'], prompt)
    return output.trim()
  }
}

class OpenAIProvider implements AIProvider {
  private client: OpenAI
  private visionModel: string
  private model: string

  constructor() {
    const config = useRuntimeConfig()
    this.client = new OpenAI({
      apiKey: config.openaiApiKey,
      baseURL: config.openaiBaseUrl,
    })
    this.visionModel = config.aiVisionModel || config.aiModel || 'gpt-4o'
    this.model = config.aiSummaryModel || config.aiModel || 'gpt-4o'
  }

  async extractDocument(fileBytes: Uint8Array, fileType: string): Promise<DocumentExtraction> {
    const base64 = Buffer.from(fileBytes).toString('base64')
    const mediaType = fileType.includes('pdf') ? 'application/pdf' : fileType

    const response = await this.client.chat.completions.create({
      model: this.visionModel,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: getExtractionPrompt() },
            {
              type: 'image_url',
              image_url: { url: `data:${mediaType};base64,${base64}` },
            },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 4096,
    })

    const content = response.choices[0]?.message?.content
    if (!content) throw new Error('AI processing failed - no response')
    return extractJSON(content)
  }

  async generateJSON(systemPrompt: string, userContent: string): Promise<any> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 16384,
    })

    const content = response.choices[0]?.message?.content
    if (!content) throw new Error('AI processing failed - no response')
    if (response.choices[0]?.finish_reason === 'length') {
      console.warn('[AI] generateJSON response was truncated (hit max_tokens)')
    }
    return extractJSON(content)
  }

  async chat(systemPrompt: string, messages: ChatMessage[]): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      ],
      max_tokens: 1024,
    })

    return response.choices[0]?.message?.content || 'Sorry, I could not generate a response.'
  }
}

// ─── Singleton factory ──────────────────────────────────────────────

let _provider: AIProvider | null = null

export function useAIProvider(): AIProvider {
  if (!_provider) {
    const config = useRuntimeConfig()
    const providerName = config.aiProvider || 'codex'

    switch (providerName) {
      case 'claude':
        _provider = new ClaudeCliProvider()
        break
      case 'openai':
        _provider = new OpenAIProvider()
        break
      case 'codex':
      default:
        _provider = new CodexCliProvider()
        break
    }

    console.log(`[AI] Using provider: ${providerName}`)
  }
  return _provider
}
