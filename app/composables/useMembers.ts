export interface FamilyMember {
  id: string
  name: string
  dob: string | null
  weightKg: number | null
  heightCm: number | null
  bmi: number | null
  bmiCategory: string | null
  bloodGroup: string | null
  allergies: string[]
  emergencyContact: string | null
  dietPreference: string | null
  photoUrl: string | null
  isActive: boolean
  createdAt: string
  documentCount: number
  activeMedCount: number
}

export async function useMembers() {
  const { data: members, status, refresh } = await useFetch<FamilyMember[]>('/api/members', {
    default: () => [],
  })

  const loading = computed(() => status.value === 'pending')

  async function createMember(data: {
    name: string
    dob?: string
    weightKg?: number
    heightCm?: number
    bloodGroup?: string
    allergies?: string[]
    emergencyContact?: string
    dietPreference?: string
    photoUrl?: string
  }) {
    const member = await $fetch<FamilyMember>('/api/members', {
      method: 'POST',
      body: data,
    })
    await refresh()
    return member
  }

  async function updateMember(
    id: string,
    data: Partial<{
      name: string
      dob: string | null
      weightKg: number | null
      heightCm: number | null
      bloodGroup: string | null
      allergies: string[]
      emergencyContact: string | null
      dietPreference: string | null
      photoUrl: string | null
    }>,
  ) {
    const updated = await $fetch(`/api/members/${id}`, {
      method: 'PUT',
      body: data,
    })
    await refresh()
    return updated
  }

  async function deleteMember(id: string) {
    await $fetch(`/api/members/${id}`, { method: 'DELETE' })
    await refresh()
  }

  return {
    members,
    loading,
    refresh,
    createMember,
    updateMember,
    deleteMember,
  }
}
