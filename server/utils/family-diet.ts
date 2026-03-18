import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib'
import { z } from 'zod'
import type { FamilyDietPlan, FamilyGroceryList } from '~~/shared/types/diet'
import { useAIProvider } from '~~/server/utils/ai-provider'

const familyDietMealModificationSchema = z.object({
  member: z.string(),
  modification: z.string(),
})

const familyDietMealSchema = z.object({
  time: z.string().optional(),
  sharedItems: z.array(z.string()).optional(),
  memberModifications: z.array(familyDietMealModificationSchema).optional(),
  notes: z.string().optional(),
})

const familyDietDaySchema = z.object({
  day: z.number(),
  meals: z.record(z.string(), familyDietMealSchema.nullish()),
})

const familyDietPerMemberNoteSchema = z.object({
  member: z.string(),
  dailyCalories: z.string().optional(),
  keyFocus: z.string().optional(),
})

export const familyDietPlanSchema = z.object({
  overview: z.string(),
  familyConstraints: z.object({
    commonDietBase: z.string().optional(),
    combinedAllergies: z.array(z.string()).optional(),
    specialConsiderations: z.array(z.string()).optional(),
  }).optional(),
  days: z.array(familyDietDaySchema).min(1),
  shoppingTips: z.array(z.string()).optional(),
  perMemberNotes: z.array(familyDietPerMemberNoteSchema).optional(),
})

export const familyGroceryListSchema = z.object({
  summary: z.string().optional(),
  sections: z.array(z.object({
    title: z.string(),
    items: z.array(z.string()),
  })).min(1),
  pantryStaples: z.array(z.string()).optional(),
  prepAhead: z.array(z.string()).optional(),
  notes: z.array(z.string()).optional(),
})

function getFamilyGroceryPrompt(days: number, memberNames: string[]): string {
  return `You are a practical family nutrition assistant. Convert the provided family diet plan into one consolidated grocery list.

IMPORTANT RULES:
- Combine duplicate ingredients into one entry instead of repeating them
- Keep all groceries safe for the whole family and respect the strictest allergy and diet constraints already present in the plan
- Use household shopping quantities when possible (for example: "Tomatoes - 10 to 12", "Oats - 1 kg", "Curd - 2 tubs")
- Group items into practical shopping sections such as Produce, Dairy, Proteins, Grains, Pantry, Snacks, Spices, or Frozen
- Infer obvious base ingredients when a prepared meal clearly requires them, but stay conservative and practical
- Keep the output concise and useful for an actual grocery trip for ${memberNames.join(', ')}

Generate a grocery list for a ${days}-day family diet plan.

Return JSON with this exact structure:
{
  "summary": "Short 1-2 sentence grocery strategy summary",
  "sections": [
    {
      "title": "Produce",
      "items": ["Spinach - 3 bunches", "Bananas - 14"]
    }
  ],
  "pantryStaples": ["items that are assumed reusable pantry basics"],
  "prepAhead": ["batch prep suggestions to make the plan easier"],
  "notes": ["short shopping notes such as storage or substitution guidance"]
}

IMPORTANT: Return ONLY valid JSON, no markdown fences, no extra text.`
}

export async function generateFamilyGroceryList(input: {
  days: number
  memberNames: string[]
  plan: FamilyDietPlan
}): Promise<FamilyGroceryList> {
  const ai = useAIProvider()
  const result = await ai.generateJSON(
    getFamilyGroceryPrompt(input.days, input.memberNames),
    JSON.stringify({
      familyMembers: input.memberNames,
      dietPlan: input.plan,
    }),
  )

  return familyGroceryListSchema.parse(result)
}

type PdfColors = {
  brand: ReturnType<typeof rgb>
  brandSoft: ReturnType<typeof rgb>
  accent: ReturnType<typeof rgb>
  text: ReturnType<typeof rgb>
  muted: ReturnType<typeof rgb>
  border: ReturnType<typeof rgb>
  grocerySoft: ReturnType<typeof rgb>
}

function splitText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = []
  const paragraphs = text.split('\n')

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim()
    if (!trimmed) {
      lines.push('')
      continue
    }

    const words = trimmed.split(/\s+/)
    let currentLine = ''

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word
      const width = font.widthOfTextAtSize(testLine, size)
      if (width <= maxWidth) {
        currentLine = testLine
      } else if (currentLine) {
        lines.push(currentLine)
        currentLine = word
      } else {
        lines.push(word)
      }
    }

    if (currentLine) {
      lines.push(currentLine)
    }
  }

  return lines.length ? lines : ['']
}

function formatMealLabel(mealKey: string): string {
  return mealKey.replace(/([A-Z])/g, ' $1').replace(/^\w/, (char) => char.toUpperCase()).trim()
}

function formatGeneratedDate(): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date())
}

export async function buildFamilyDietPdf(input: {
  days: number
  memberNames: string[]
  plan: FamilyDietPlan
  groceryList: FamilyGroceryList
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  const regularFont = await pdf.embedFont(StandardFonts.Helvetica)
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold)

  const pageWidth = 595.28
  const pageHeight = 841.89
  const margin = 42
  const contentWidth = pageWidth - margin * 2
  const footerHeight = 30
  const lineGap = 1.35
  const colors: PdfColors = {
    brand: rgb(0.08, 0.32, 0.29),
    brandSoft: rgb(0.91, 0.96, 0.94),
    accent: rgb(0.71, 0.82, 0.37),
    text: rgb(0.15, 0.18, 0.2),
    muted: rgb(0.4, 0.45, 0.47),
    border: rgb(0.84, 0.88, 0.86),
    grocerySoft: rgb(0.97, 0.95, 0.89),
  }

  let page = pdf.addPage([pageWidth, pageHeight])
  let cursorY = pageHeight

  function addPage() {
    page = pdf.addPage([pageWidth, pageHeight])
    cursorY = pageHeight - margin
  }

  function ensureSpace(requiredHeight: number) {
    if (cursorY - requiredHeight < margin + footerHeight) {
      addPage()
    }
  }

  function drawWrappedText(text: string, options: {
    x: number
    y: number
    width: number
    size?: number
    font?: PDFFont
    color?: ReturnType<typeof rgb>
  }): number {
    const size = options.size ?? 11
    const font = options.font ?? regularFont
    const color = options.color ?? colors.text
    const lines = splitText(text, font, size, options.width)
    const lineHeight = size * lineGap
    let lineY = options.y

    for (const line of lines) {
      page.drawText(line, {
        x: options.x,
        y: lineY,
        size,
        font,
        color,
      })
      lineY -= lineHeight
    }

    return lines.length * lineHeight
  }

  function drawBulletList(items: string[], options: {
    x: number
    width: number
    size?: number
    color?: ReturnType<typeof rgb>
    bulletColor?: ReturnType<typeof rgb>
  }) {
    const size = options.size ?? 10.5
    const color = options.color ?? colors.text
    const bulletColor = options.bulletColor ?? colors.brand
    const bulletX = options.x
    const textX = options.x + 12
    const textWidth = options.width - 12
    const bulletOffset = size * 0.2

    for (const item of items) {
      const textHeight = splitText(item, regularFont, size, textWidth).length * size * lineGap
      ensureSpace(textHeight + 6)
      page.drawCircle({
        x: bulletX + 3,
        y: cursorY - bulletOffset,
        size: 2.1,
        color: bulletColor,
      })
      const usedHeight = drawWrappedText(item, {
        x: textX,
        y: cursorY,
        width: textWidth,
        size,
        color,
      })
      cursorY -= usedHeight + 4
    }
  }

  function drawInfoCard(title: string, body: string[], options?: { fill?: ReturnType<typeof rgb> }) {
    const titleSize = 12
    const bodySize = 10.5
    const padding = 14
    const titleHeight = titleSize * 1.6
    const bodyHeights = body.map(item => splitText(item, regularFont, bodySize, contentWidth - padding * 2).length * bodySize * lineGap + 4)
    const cardHeight = padding * 2 + titleHeight + bodyHeights.reduce((sum, value) => sum + value, 0)

    ensureSpace(cardHeight + 8)

    page.drawRectangle({
      x: margin,
      y: cursorY - cardHeight,
      width: contentWidth,
      height: cardHeight,
      color: options?.fill ?? colors.brandSoft,
      borderColor: colors.border,
      borderWidth: 1,
    })

    page.drawText(title, {
      x: margin + padding,
      y: cursorY - padding - titleSize,
      size: titleSize,
      font: boldFont,
      color: colors.brand,
    })

    let textY = cursorY - padding - titleHeight - 2
    for (const item of body) {
      const usedHeight = drawWrappedText(item, {
        x: margin + padding,
        y: textY,
        width: contentWidth - padding * 2,
        size: bodySize,
        color: colors.text,
      })
      textY -= usedHeight + 4
    }

    cursorY -= cardHeight + 12
  }

  function drawSectionHeader(title: string, subtitle?: string, options?: { fill?: ReturnType<typeof rgb>; text?: ReturnType<typeof rgb> }) {
    const fill = options?.fill ?? colors.brand
    const textColor = options?.text ?? rgb(1, 1, 1)
    const titleSize = 14
    const subtitleSize = 10
    const blockHeight = subtitle ? 44 : 28

    ensureSpace(blockHeight + 8)
    page.drawRectangle({
      x: margin,
      y: cursorY - blockHeight,
      width: contentWidth,
      height: blockHeight,
      color: fill,
    })
    page.drawText(title, {
      x: margin + 14,
      y: cursorY - 20,
      size: titleSize,
      font: boldFont,
      color: textColor,
    })

    if (subtitle) {
      page.drawText(subtitle, {
        x: margin + 14,
        y: cursorY - 34,
        size: subtitleSize,
        font: regularFont,
        color: textColor,
      })
    }

    cursorY -= blockHeight + 10
  }

  function drawHeader() {
    const headerHeight = 122
    page.drawRectangle({
      x: 0,
      y: pageHeight - headerHeight,
      width: pageWidth,
      height: headerHeight,
      color: colors.brand,
    })
    page.drawRectangle({
      x: 0,
      y: pageHeight - headerHeight,
      width: 120,
      height: headerHeight,
      color: colors.accent,
      opacity: 0.2,
    })

    page.drawText('Family Diet Plan', {
      x: margin,
      y: pageHeight - 44,
      size: 24,
      font: boldFont,
      color: rgb(1, 1, 1),
    })

    page.drawText('Diet schedule and grocery guide', {
      x: margin,
      y: pageHeight - 66,
      size: 11,
      font: regularFont,
      color: rgb(0.9, 0.95, 0.93),
    })

    page.drawText(`Members: ${input.memberNames.join(', ')}`, {
      x: margin,
      y: pageHeight - 90,
      size: 10,
      font: regularFont,
      color: rgb(1, 1, 1),
    })

    page.drawText(`${input.days} day plan | Generated ${formatGeneratedDate()}`, {
      x: margin,
      y: pageHeight - 106,
      size: 10,
      font: regularFont,
      color: rgb(0.88, 0.95, 0.93),
    })

    cursorY = pageHeight - headerHeight - 22
  }

  function drawMealBlock(label: string, details: string[]) {
    const titleSize = 11.5
    const detailSize = 10
    const padding = 12
    const titleHeight = titleSize * 1.8
    const detailHeight = details.reduce((sum, line) => {
      const lines = splitText(line, regularFont, detailSize, contentWidth - padding * 2)
      return sum + lines.length * detailSize * lineGap + 4
    }, 0)
    const blockHeight = padding * 2 + titleHeight + detailHeight

    ensureSpace(blockHeight + 8)

    page.drawRectangle({
      x: margin,
      y: cursorY - blockHeight,
      width: contentWidth,
      height: blockHeight,
      color: rgb(0.99, 0.99, 0.98),
      borderColor: colors.border,
      borderWidth: 1,
    })

    page.drawText(label, {
      x: margin + padding,
      y: cursorY - padding - titleSize,
      size: titleSize,
      font: boldFont,
      color: colors.brand,
    })

    let blockY = cursorY - padding - titleHeight
    for (const detail of details) {
      const usedHeight = drawWrappedText(detail, {
        x: margin + padding,
        y: blockY,
        width: contentWidth - padding * 2,
        size: detailSize,
        color: colors.text,
      })
      blockY -= usedHeight + 4
    }

    cursorY -= blockHeight + 8
  }

  drawHeader()

  drawSectionHeader('Plan Snapshot', 'A quick summary before the detailed daily meals')
  drawInfoCard('Overview', [input.plan.overview])

  const familyConstraints: string[] = []
  if (input.plan.familyConstraints?.commonDietBase) {
    familyConstraints.push(`Common diet base: ${input.plan.familyConstraints.commonDietBase}`)
  }
  if (input.plan.familyConstraints?.combinedAllergies?.length) {
    familyConstraints.push(`Avoid for everyone: ${input.plan.familyConstraints.combinedAllergies.join(', ')}`)
  }
  if (input.plan.familyConstraints?.specialConsiderations?.length) {
    familyConstraints.push(...input.plan.familyConstraints.specialConsiderations)
  }
  if (familyConstraints.length) {
    drawInfoCard('Family Constraints', familyConstraints)
  }

  if (input.plan.perMemberNotes?.length) {
    drawSectionHeader('Per Member Focus')
    const memberLines = input.plan.perMemberNotes.map((note) => {
      const parts = [note.member]
      if (note.dailyCalories) {
        parts.push(note.dailyCalories)
      }
      if (note.keyFocus) {
        parts.push(note.keyFocus)
      }
      return parts.join(' | ')
    })
    drawBulletList(memberLines, {
      x: margin,
      width: contentWidth,
      size: 10.5,
      bulletColor: colors.accent,
    })
    cursorY -= 4
  }

  drawSectionHeader('Daily Diet Plan', `${input.plan.days.length} day schedule`, {
    fill: rgb(0.16, 0.41, 0.37),
  })

  for (const day of input.plan.days) {
    drawSectionHeader(`Day ${day.day}`, undefined, {
      fill: colors.brandSoft,
      text: colors.brand,
    })

    for (const [mealKey, meal] of Object.entries(day.meals)) {
      if (!meal) {
        continue
      }

      const detailLines: string[] = []
      if (meal.time) {
        detailLines.push(`Time: ${meal.time}`)
      }
      if (meal.sharedItems?.length) {
        detailLines.push(`Meal: ${meal.sharedItems.join(', ')}`)
      }
      if (meal.memberModifications?.length) {
        detailLines.push(...meal.memberModifications.map(mod => `${mod.member}: ${mod.modification}`))
      }
      if (meal.notes) {
        detailLines.push(`Note: ${meal.notes}`)
      }

      drawMealBlock(formatMealLabel(mealKey), detailLines)
    }
  }

  drawSectionHeader('Grocery List', 'Grouped for faster shopping', {
    fill: rgb(0.39, 0.5, 0.15),
  })

  if (input.groceryList.summary) {
    drawInfoCard('Grocery Summary', [input.groceryList.summary], {
      fill: colors.grocerySoft,
    })
  }

  for (const section of input.groceryList.sections) {
    drawInfoCard(section.title, section.items, {
      fill: rgb(0.99, 0.98, 0.95),
    })
  }

  if (input.groceryList.pantryStaples?.length) {
    drawInfoCard('Pantry Staples', input.groceryList.pantryStaples)
  }

  if (input.groceryList.prepAhead?.length) {
    drawInfoCard('Prep Ahead', input.groceryList.prepAhead, {
      fill: colors.brandSoft,
    })
  }

  const notes: string[] = []
  if (input.plan.shoppingTips?.length) {
    notes.push(...input.plan.shoppingTips)
  }
  if (input.groceryList.notes?.length) {
    notes.push(...input.groceryList.notes)
  }
  if (notes.length) {
    drawSectionHeader('Shopping Notes')
    drawBulletList(notes, {
      x: margin,
      width: contentWidth,
      size: 10.5,
      bulletColor: colors.accent,
    })
  }

  const pages = pdf.getPages()
  pages.forEach((currentPage, index) => {
    currentPage.drawLine({
      start: { x: margin, y: 24 },
      end: { x: pageWidth - margin, y: 24 },
      thickness: 1,
      color: colors.border,
    })
    currentPage.drawText(`Page ${index + 1} of ${pages.length}`, {
      x: pageWidth - margin - 70,
      y: 10,
      size: 9,
      font: regularFont,
      color: colors.muted,
    })
  })

  return pdf.save()
}
