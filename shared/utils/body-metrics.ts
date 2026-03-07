export interface BodyMetricsSummary {
  bmi: number | null
  bmiCategory: string | null
}

export function roundMetricValue(value: number): number {
  return Math.round(value * 10) / 10
}

export function calculateBmi(weightKg: number | null, heightCm: number | null): number | null {
  if (!weightKg || !heightCm || weightKg <= 0 || heightCm <= 0) {
    return null
  }

  const heightM = heightCm / 100
  const bmi = weightKg / (heightM * heightM)
  return Math.round(bmi * 10) / 10
}

export function getBmiCategory(bmi: number | null): string | null {
  if (bmi === null) return null
  if (bmi < 18.5) return 'Underweight'
  if (bmi < 25) return 'Normal'
  if (bmi < 30) return 'Overweight'
  return 'Obese'
}

export function summarizeBodyMetrics(weightKg: number | null, heightCm: number | null): BodyMetricsSummary {
  const bmi = calculateBmi(weightKg, heightCm)
  return {
    bmi,
    bmiCategory: getBmiCategory(bmi),
  }
}
