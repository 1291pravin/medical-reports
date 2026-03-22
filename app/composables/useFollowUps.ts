export interface FollowUp {
  id: string
  familyMemberId: string
  memberName: string
  documentId: string | null
  documentTitle: string | null
  title: string
  dueDate: string | null
  instructions: string | null
  doctorName: string | null
  hospitalName: string | null
  status: 'pending' | 'completed' | 'dismissed'
  sourceType: 'ai_extracted' | 'manual'
  completedAt: string | null
  createdAt: string
}

export function useFollowUps() {
  const followUps = useState<FollowUp[]>('followUps', () => [])
  const loading = ref(false)

  async function fetchFollowUps(params?: {
    memberId?: string
    status?: string
  }) {
    loading.value = true
    try {
      const headers = import.meta.server ? useRequestHeaders(['cookie']) : {}
      followUps.value = await $fetch<FollowUp[]>('/api/follow-ups', {
        query: params,
        headers,
      })
    } finally {
      loading.value = false
    }
  }

  async function createFollowUp(data: {
    familyMemberId: string
    title: string
    dueDate?: string | null
    instructions?: string | null
    doctorName?: string | null
    hospitalName?: string | null
  }) {
    await $fetch('/api/follow-ups', {
      method: 'POST',
      body: data,
    })
  }

  async function updateFollowUp(id: string, data: Partial<FollowUp>) {
    await $fetch(`/api/follow-ups/${id}`, {
      method: 'PUT',
      body: data,
    })
  }

  async function deleteFollowUp(id: string) {
    await $fetch(`/api/follow-ups/${id}`, {
      method: 'DELETE',
    })
  }

  function isOverdue(dueDate: string | null): boolean {
    if (!dueDate) return false
    const due = new Date(dueDate + 'T00:00:00')
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return due < today
  }

  function isDueSoon(dueDate: string | null, days = 3): boolean {
    if (!dueDate) return false
    const due = new Date(dueDate + 'T00:00:00')
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return diff >= 0 && diff <= days
  }

  function relativeDueDate(dueDate: string | null): string {
    if (!dueDate) return 'No date set'
    const due = new Date(dueDate + 'T00:00:00')
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (diff < 0) return `Overdue by ${Math.abs(diff)} day${Math.abs(diff) !== 1 ? 's' : ''}`
    if (diff === 0) return 'Today'
    if (diff === 1) return 'Tomorrow'
    return `In ${diff} day${diff !== 1 ? 's' : ''}`
  }

  return {
    followUps,
    loading,
    fetchFollowUps,
    createFollowUp,
    updateFollowUp,
    deleteFollowUp,
    isOverdue,
    isDueSoon,
    relativeDueDate,
  }
}
