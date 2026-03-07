export interface Medication {
  id: string
  familyMemberId: string
  memberName: string
  documentId: string | null
  documentTitle: string | null
  name: string
  dosage: string | null
  frequency: string | null
  startDate: string | null
  endDate: string | null
  purpose: string | null
  isActive: boolean
  createdAt: string
}

export function useMedications() {
  const medications = useState<Medication[]>('medications', () => [])
  const loading = ref(false)

  async function fetchMedications(params?: {
    memberId?: string
    active?: string
  }) {
    loading.value = true
    try {
      medications.value = await $fetch<Medication[]>('/api/medications', {
        query: params,
      })
    } finally {
      loading.value = false
    }
  }

  async function updateMedication(
    id: string,
    data: Partial<Medication>,
  ) {
    await $fetch(`/api/medications/${id}`, {
      method: 'PUT',
      body: data,
    })
    await fetchMedications()
  }

  async function deleteMedication(id: string) {
    await $fetch(`/api/medications/${id}`, {
      method: 'DELETE',
    })
  }

  function isEndingSoon(endDate: string | null): boolean {
    if (!endDate) return false
    const end = new Date(endDate)
    const now = new Date()
    const daysRemaining = Math.ceil(
      (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    )
    return daysRemaining >= 0 && daysRemaining <= 3
  }

  return {
    medications,
    loading,
    fetchMedications,
    updateMedication,
    deleteMedication,
    isEndingSoon,
  }
}
