export interface Appointment {
  id: string
  familyMemberId: string
  memberName: string
  followUpId: string | null
  followUpTitle: string | null
  appointmentType: 'consultation' | 'lab_test' | 'imaging' | 'vaccination' | 'dental' | 'eye_exam' | 'therapy' | 'other'
  dateTime: string
  endDateTime: string | null
  location: string | null
  doctorName: string | null
  notes: string | null
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled' | 'no_show'
  createdAt: string
}

export function useAppointments() {
  const appointments = useState<Appointment[]>('appointments', () => [])
  const loading = ref(false)

  async function fetchAppointments(params?: {
    memberId?: string
    status?: string
    from?: string
    to?: string
  }) {
    loading.value = true
    try {
      const headers = import.meta.server ? useRequestHeaders(['cookie']) : {}
      appointments.value = await $fetch<Appointment[]>('/api/appointments', {
        query: params,
        headers,
      })
    } finally {
      loading.value = false
    }
  }

  async function createAppointment(data: {
    familyMemberId: string
    followUpId?: string | null
    appointmentType?: string
    dateTime: string
    endDateTime?: string | null
    location?: string | null
    doctorName?: string | null
    notes?: string | null
  }) {
    return await $fetch('/api/appointments', {
      method: 'POST',
      body: data,
    })
  }

  async function updateAppointment(id: string, data: Partial<Appointment>) {
    return await $fetch(`/api/appointments/${id}`, {
      method: 'PUT',
      body: data,
    })
  }

  async function deleteAppointment(id: string) {
    await $fetch(`/api/appointments/${id}`, {
      method: 'DELETE',
    })
  }

  const typeLabels: Record<string, string> = {
    consultation: 'Consultation',
    lab_test: 'Lab Test',
    imaging: 'Imaging',
    vaccination: 'Vaccination',
    dental: 'Dental',
    eye_exam: 'Eye Exam',
    therapy: 'Therapy',
    other: 'Other',
  }

  const typeColors: Record<string, string> = {
    consultation: 'bg-blue-500',
    lab_test: 'bg-purple-500',
    imaging: 'bg-cyan-500',
    vaccination: 'bg-green-500',
    dental: 'bg-orange-500',
    eye_exam: 'bg-indigo-500',
    therapy: 'bg-pink-500',
    other: 'bg-gray-500',
  }

  const typeBadgeColors: Record<string, string> = {
    consultation: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    lab_test: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    imaging: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
    vaccination: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    dental: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    eye_exam: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
    therapy: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
    other: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  }

  function appointmentTypeLabel(type: string): string {
    return typeLabels[type] || type
  }

  function appointmentTypeColor(type: string): string {
    return typeColors[type] ?? 'bg-gray-500'
  }

  function appointmentTypeBadgeColor(type: string): string {
    return typeBadgeColors[type] ?? 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
  }

  function formatAppointmentTime(dateTime: string): string {
    return new Date(dateTime).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
  }

  function formatAppointmentDate(dateTime: string): string {
    return new Date(dateTime).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  function isUpcoming(dateTime: string): boolean {
    return new Date(dateTime) > new Date()
  }

  return {
    appointments,
    loading,
    fetchAppointments,
    createAppointment,
    updateAppointment,
    deleteAppointment,
    appointmentTypeLabel,
    appointmentTypeColor,
    appointmentTypeBadgeColor,
    formatAppointmentTime,
    formatAppointmentDate,
    isUpcoming,
  }
}
