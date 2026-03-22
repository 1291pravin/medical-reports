export interface AppNotification {
  key: string
  type: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  title: string
  description: string
  memberName: string
  memberId: string
  linkTo: string
  isRead: boolean
  relatedDate: string | null
}

export function useNotifications() {
  const notifications = useState<AppNotification[]>('notifications', () => [])
  const loading = ref(false)

  const unreadCount = computed(() => notifications.value.filter((n) => !n.isRead).length)

  async function fetchNotifications() {
    loading.value = true
    try {
      const headers = import.meta.server ? useRequestHeaders(['cookie']) : {}
      notifications.value = await $fetch<AppNotification[]>('/api/notifications', { headers })
    } finally {
      loading.value = false
    }
  }

  async function markRead(key: string) {
    await $fetch('/api/notifications/read', { method: 'POST', body: { key } })
    const idx = notifications.value.findIndex((n) => n.key === key)
    if (idx !== -1) notifications.value[idx] = { ...notifications.value[idx]!, isRead: true }
  }

  async function markAllRead() {
    await $fetch('/api/notifications/read-all', { method: 'POST' })
    notifications.value = notifications.value.map((n) => ({ ...n, isRead: true }))
  }

  function priorityColor(priority: string): string {
    const colors: Record<string, string> = {
      critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      low: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    }
    return colors[priority] ?? 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
  }

  function priorityDotColor(priority: string): string {
    const colors: Record<string, string> = {
      critical: 'bg-red-500',
      high: 'bg-orange-500',
      medium: 'bg-yellow-500',
      low: 'bg-blue-500',
    }
    return colors[priority] ?? 'bg-gray-500'
  }

  function typeIcon(type: string): string {
    const icons: Record<string, string> = {
      'followup-overdue': 'clock',
      'followup-due-soon': 'clock',
      'appointment-today': 'calendar',
      'appointment-tomorrow': 'calendar',
      'medication-expiring': 'pill',
      'lab-abnormal': 'flask-conical',
    }
    return icons[type] ?? 'bell'
  }

  return {
    notifications,
    loading,
    unreadCount,
    fetchNotifications,
    markRead,
    markAllRead,
    priorityColor,
    priorityDotColor,
    typeIcon,
  }
}
