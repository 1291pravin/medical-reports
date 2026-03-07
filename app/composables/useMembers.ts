export interface FamilyMember {
  id: string
  name: string
  dob: string | null
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

export function useMembers() {
  const members = useState<FamilyMember[]>('members', () => [])
  const loading = ref(false)

  async function fetchMembers() {
    loading.value = true
    try {
      members.value = await $fetch<FamilyMember[]>('/api/members')
    } finally {
      loading.value = false
    }
  }

  async function createMember(data: {
    name: string
    dob?: string
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
    await fetchMembers()
    return member
  }

  async function updateMember(
    id: string,
    data: Partial<{
      name: string
      dob: string | null
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
    await fetchMembers()
    return updated
  }

  async function deleteMember(id: string) {
    await $fetch(`/api/members/${id}`, { method: 'DELETE' })
    await fetchMembers()
  }

  return {
    members,
    loading,
    fetchMembers,
    createMember,
    updateMember,
    deleteMember,
  }
}
