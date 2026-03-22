<script setup lang="ts">
import { Bell, BellDot, Clock, Calendar, Pill, FlaskConical, CheckCheck, User } from 'lucide-vue-next'

const router = useRouter()
const { notifications, loading, unreadCount, fetchNotifications, markRead, markAllRead, priorityColor, priorityDotColor } = useNotifications()

const isOpen = ref(false)

function onOpenChange(open: boolean) {
  isOpen.value = open
  if (open) {
    fetchNotifications()
  }
}

function typeIconComponent(type: string) {
  const map: Record<string, any> = {
    'followup-overdue': Clock,
    'followup-due-soon': Clock,
    'appointment-today': Calendar,
    'appointment-tomorrow': Calendar,
    'medication-expiring': Pill,
    'lab-abnormal': FlaskConical,
  }
  return map[type] || Bell
}

async function handleClick(notification: { key: string; linkTo: string; isRead: boolean }) {
  if (!notification.isRead) {
    await markRead(notification.key)
  }
  isOpen.value = false
  await router.push(notification.linkTo)
}

async function handleMarkAllRead() {
  await markAllRead()
}
</script>

<template>
  <Popover :open="isOpen" @update:open="onOpenChange">
    <PopoverTrigger as-child>
      <Button variant="ghost" size="icon" class="relative h-9 w-9">
        <BellDot v-if="unreadCount > 0" class="h-[18px] w-[18px]" />
        <Bell v-else class="h-[18px] w-[18px]" />
        <span
          v-if="unreadCount > 0"
          class="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white"
        >
          {{ unreadCount > 9 ? '9+' : unreadCount }}
        </span>
      </Button>
    </PopoverTrigger>
    <PopoverContent class="w-80 p-0 sm:w-96" align="end" :side-offset="8">
      <!-- Header -->
      <div class="flex items-center justify-between border-b px-4 py-3">
        <h3 class="text-sm font-semibold">Notifications</h3>
        <Button
          v-if="unreadCount > 0"
          variant="ghost"
          size="sm"
          class="h-7 text-xs text-muted-foreground"
          @click="handleMarkAllRead"
        >
          <CheckCheck class="mr-1 h-3.5 w-3.5" />
          Mark all read
        </Button>
      </div>

      <!-- Content -->
      <div class="max-h-[28rem] overflow-y-auto">
        <!-- Loading -->
        <div v-if="loading" class="flex items-center justify-center py-8">
          <div class="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>

        <!-- Notification List -->
        <div v-else-if="notifications.length > 0">
          <button
            v-for="n in notifications"
            :key="n.key"
            class="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50"
            :class="n.isRead ? 'opacity-60' : 'bg-primary/[0.02]'"
            @click="handleClick(n)"
          >
            <!-- Priority dot + icon -->
            <div class="relative mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
              <component :is="typeIconComponent(n.type)" class="h-4 w-4 text-muted-foreground" />
              <span
                v-if="!n.isRead"
                class="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-background"
                :class="priorityDotColor(n.priority)"
              />
            </div>

            <!-- Content -->
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium leading-tight">{{ n.title }}</p>
              <p class="mt-0.5 text-xs text-muted-foreground truncate">{{ n.description }}</p>
              <div class="mt-1 flex items-center gap-2">
                <span class="text-[10px] text-muted-foreground flex items-center gap-0.5">
                  <User class="h-2.5 w-2.5" /> {{ n.memberName }}
                </span>
                <span class="text-[10px] font-medium px-1 py-px rounded" :class="priorityColor(n.priority)">
                  {{ n.priority }}
                </span>
              </div>
            </div>
          </button>
        </div>

        <!-- Empty State -->
        <div v-else class="py-10 text-center">
          <Bell class="mx-auto h-8 w-8 text-muted-foreground/30" />
          <p class="mt-2 text-sm text-muted-foreground">No notifications</p>
          <p class="text-xs text-muted-foreground/70">You're all caught up!</p>
        </div>
      </div>
    </PopoverContent>
  </Popover>
</template>
