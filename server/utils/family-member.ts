import { summarizeBodyMetrics } from '~~/shared/utils/body-metrics'

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function serializeFamilyMember<T extends Record<string, any>>(member: T) {
  const weightKg = toNumber(member.weightKg)
  const heightCm = toNumber(member.heightCm)
  const { bmi, bmiCategory } = summarizeBodyMetrics(weightKg, heightCm)

  return {
    ...member,
    weightKg,
    heightCm,
    bmi,
    bmiCategory,
  }
}
