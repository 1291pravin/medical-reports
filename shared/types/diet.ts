export interface FamilyDietMealModification {
  member: string
  modification: string
}

export interface FamilyDietMeal {
  time?: string
  sharedItems?: string[]
  memberModifications?: FamilyDietMealModification[]
  notes?: string
}

export interface FamilyDietDay {
  day: number
  meals: Record<string, FamilyDietMeal | null | undefined>
}

export interface FamilyDietPerMemberNote {
  member: string
  dailyCalories?: string
  keyFocus?: string
}

export interface FamilyDietConstraints {
  commonDietBase?: string
  combinedAllergies?: string[]
  specialConsiderations?: string[]
}

export interface FamilyDietPlan {
  overview: string
  familyConstraints?: FamilyDietConstraints
  days: FamilyDietDay[]
  shoppingTips?: string[]
  perMemberNotes?: FamilyDietPerMemberNote[]
}

export interface FamilyGrocerySection {
  title: string
  items: string[]
}

export interface FamilyGroceryList {
  summary?: string
  sections: FamilyGrocerySection[]
  pantryStaples?: string[]
  prepAhead?: string[]
  notes?: string[]
}
