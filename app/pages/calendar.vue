<script setup lang="ts">
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  User,
  Trash2,
  CheckCircle,
  X,
  Loader,
  Stethoscope,
} from 'lucide-vue-next'
import type { Appointment } from '~/composables/useAppointments'
import type { FamilyMember } from '~/composables/useMembers'

const {
  appointmentTypeLabel,
  appointmentTypeColor,
  appointmentTypeBadgeColor,
  formatAppointmentTime,
  isUpcoming,
} = useAppointments()

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

// Calendar state
const today = new Date()
const currentMonth = ref(new Date(today.getFullYear(), today.getMonth(), 1))
const selectedDate = ref<string>(toDateStr(today))
const memberFilter = ref<string>('all')

// Fetch members for filter
const { data: members } = await useFetch<FamilyMember[]>('/api/members')

// Compute date range for current month view (includes leading/trailing days)
const calendarRange = computed(() => {
  const year = currentMonth.value.getFullYear()
  const month = currentMonth.value.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  // Start from Sunday of the first week
  const startDate = new Date(firstDay)
  startDate.setDate(startDate.getDate() - startDate.getDay())

  // End on Saturday of the last week
  const endDate = new Date(lastDay)
  endDate.setDate(endDate.getDate() + (6 - endDate.getDay()) + 1)

  return {
    from: startDate.toISOString().slice(0, 10),
    to: endDate.toISOString().slice(0, 10),
  }
})

// Fetch appointments for displayed range
const { data: monthAppointments, refresh: refreshAppointments } = await useFetch<Appointment[]>('/api/appointments', {
  query: computed(() => ({
    status: 'all',
    from: calendarRange.value.from + 'T00:00:00',
    to: calendarRange.value.to + 'T00:00:00',
    ...(memberFilter.value !== 'all' ? { memberId: memberFilter.value } : {}),
  })),
  watch: [calendarRange, memberFilter],
})

// Group appointments by date
const appointmentsByDate = computed(() => {
  const map = new Map<string, Appointment[]>()
  for (const apt of monthAppointments.value || []) {
    const dateKey = new Date(apt.dateTime).toISOString().slice(0, 10)
    if (!map.has(dateKey)) map.set(dateKey, [])
    map.get(dateKey)!.push(apt)
  }
  return map
})

// Selected day's appointments
const selectedDayAppointments = computed(() => {
  if (!selectedDate.value) return []
  return appointmentsByDate.value.get(selectedDate.value) || []
})

// Calendar grid days
const calendarDays = computed(() => {
  const year = currentMonth.value.getFullYear()
  const month = currentMonth.value.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  const startDate = new Date(firstDay)
  startDate.setDate(startDate.getDate() - startDate.getDay())

  const days: { date: string; day: number; isCurrentMonth: boolean; isToday: boolean }[] = []
  const current = new Date(startDate)

  for (let i = 0; i < 42; i++) {
    const dateStr = current.toISOString().slice(0, 10)
    days.push({
      date: dateStr,
      day: current.getDate(),
      isCurrentMonth: current.getMonth() === month,
      isToday: dateStr === today.toISOString().slice(0, 10),
    })
    current.setDate(current.getDate() + 1)
    // Stop if we've passed the last day and completed the week
    if (i >= 27 && current.getDay() === 0 && current.getMonth() !== month) break
  }

  return days
})

const monthLabel = computed(() =>
  currentMonth.value.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
)

function prevMonth() {
  const d = new Date(currentMonth.value)
  d.setMonth(d.getMonth() - 1)
  currentMonth.value = d
}

function nextMonth() {
  const d = new Date(currentMonth.value)
  d.setMonth(d.getMonth() + 1)
  currentMonth.value = d
}

function goToday() {
  currentMonth.value = new Date(today.getFullYear(), today.getMonth(), 1)
  selectedDate.value = today.toISOString().slice(0, 10)
}

// Add/Edit appointment dialog
const showDialog = ref(false)
const editingAppointment = ref<Appointment | null>(null)
const saving = ref(false)
const form = ref({
  familyMemberId: '',
  appointmentType: 'consultation' as string,
  date: '',
  time: '09:00',
  endTime: '',
  location: '',
  doctorName: '',
  notes: '',
})

function openAddDialog(date?: string) {
  editingAppointment.value = null
  form.value = {
    familyMemberId: memberFilter.value !== 'all' ? memberFilter.value : (members.value?.[0]?.id || ''),
    appointmentType: 'consultation',
    date: date || selectedDate.value || today.toISOString().slice(0, 10),
    time: '09:00',
    endTime: '',
    location: '',
    doctorName: '',
    notes: '',
  }
  showDialog.value = true
}

function openEditDialog(apt: Appointment) {
  editingAppointment.value = apt
  const dt = new Date(apt.dateTime)
  const endDt = apt.endDateTime ? new Date(apt.endDateTime) : null
  form.value = {
    familyMemberId: apt.familyMemberId,
    appointmentType: apt.appointmentType,
    date: dt.toISOString().slice(0, 10),
    time: dt.toTimeString().slice(0, 5),
    endTime: endDt ? endDt.toTimeString().slice(0, 5) : '',
    location: apt.location || '',
    doctorName: apt.doctorName || '',
    notes: apt.notes || '',
  }
  showDialog.value = true
}

async function saveAppointment() {
  if (!form.value.familyMemberId || !form.value.date || !form.value.time) return
  saving.value = true
  try {
    const dateTime = `${form.value.date}T${form.value.time}:00`
    const endDateTime = form.value.endTime ? `${form.value.date}T${form.value.endTime}:00` : null

    if (editingAppointment.value) {
      await $fetch(`/api/appointments/${editingAppointment.value.id}`, {
        method: 'PUT',
        body: {
          appointmentType: form.value.appointmentType,
          dateTime,
          endDateTime,
          location: form.value.location || null,
          doctorName: form.value.doctorName || null,
          notes: form.value.notes || null,
        },
      })
    } else {
      await $fetch('/api/appointments', {
        method: 'POST',
        body: {
          familyMemberId: form.value.familyMemberId,
          appointmentType: form.value.appointmentType,
          dateTime,
          endDateTime,
          location: form.value.location || null,
          doctorName: form.value.doctorName || null,
          notes: form.value.notes || null,
        },
      })
    }
    showDialog.value = false
    await refreshAppointments()
  } finally {
    saving.value = false
  }
}

async function completeAppointment(id: string) {
  await $fetch(`/api/appointments/${id}`, { method: 'PUT', body: { status: 'completed' } })
  await refreshAppointments()
}

async function cancelAppointment(id: string) {
  await $fetch(`/api/appointments/${id}`, { method: 'PUT', body: { status: 'cancelled' } })
  await refreshAppointments()
}

async function deleteAppointment(id: string) {
  await $fetch(`/api/appointments/${id}`, { method: 'DELETE' })
  await refreshAppointments()
}

const appointmentTypes = [
  { value: 'consultation', label: 'Consultation' },
  { value: 'lab_test', label: 'Lab Test' },
  { value: 'imaging', label: 'Imaging' },
  { value: 'vaccination', label: 'Vaccination' },
  { value: 'dental', label: 'Dental' },
  { value: 'eye_exam', label: 'Eye Exam' },
  { value: 'therapy', label: 'Therapy' },
  { value: 'other', label: 'Other' },
]

function statusBadgeClass(status: string): string {
  const map: Record<string, string> = {
    scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    rescheduled: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    no_show: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  }
  return map[status] ?? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
}
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold flex items-center gap-2">
          <CalendarIcon class="h-6 w-6 text-primary" />
          Calendar
        </h1>
        <p class="text-sm text-muted-foreground mt-1">Manage appointments for your family</p>
      </div>
      <div class="flex items-center gap-2">
        <!-- Member Filter -->
        <select
          v-model="memberFilter"
          class="h-9 rounded-md border bg-background px-3 text-sm"
        >
          <option value="all">All Members</option>
          <option v-for="m in members" :key="m.id" :value="m.id">{{ m.name }}</option>
        </select>
        <Button size="sm" @click="openAddDialog()">
          <Plus class="mr-1 h-4 w-4" />
          New Appointment
        </Button>
      </div>
    </div>

    <div class="grid gap-4 lg:grid-cols-[1fr_320px]">
      <!-- Calendar Grid -->
      <Card>
        <CardHeader class="pb-2">
          <div class="flex items-center justify-between">
            <Button variant="ghost" size="icon" @click="prevMonth">
              <ChevronLeft class="h-4 w-4" />
            </Button>
            <h2 class="text-lg font-semibold">{{ monthLabel }}</h2>
            <div class="flex items-center gap-1">
              <Button variant="ghost" size="sm" @click="goToday">Today</Button>
              <Button variant="ghost" size="icon" @click="nextMonth">
                <ChevronRight class="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <!-- Day Headers -->
          <div class="grid grid-cols-7 mb-1">
            <div v-for="day in ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']" :key="day" class="py-1 text-center text-xs font-medium text-muted-foreground">
              {{ day }}
            </div>
          </div>

          <!-- Day Cells -->
          <div class="grid grid-cols-7 gap-px rounded-lg bg-border overflow-hidden">
            <button
              v-for="d in calendarDays"
              :key="d.date"
              class="relative min-h-[3.5rem] sm:min-h-[4.5rem] bg-background p-1 text-left transition-colors hover:bg-accent/50"
              :class="{
                'bg-accent/30': d.date === selectedDate,
                'opacity-40': !d.isCurrentMonth,
              }"
              @click="selectedDate = d.date"
            >
              <span
                class="inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium"
                :class="d.isToday ? 'bg-primary text-primary-foreground' : ''"
              >
                {{ d.day }}
              </span>
              <!-- Appointment dots -->
              <div class="mt-0.5 flex flex-wrap gap-0.5">
                <span
                  v-for="(apt, i) in (appointmentsByDate.get(d.date) || []).slice(0, 3)"
                  :key="i"
                  class="h-1.5 w-1.5 rounded-full"
                  :class="appointmentTypeColor(apt.appointmentType)"
                />
                <span
                  v-if="(appointmentsByDate.get(d.date) || []).length > 3"
                  class="text-[9px] leading-none text-muted-foreground"
                >
                  +{{ (appointmentsByDate.get(d.date) || []).length - 3 }}
                </span>
              </div>
            </button>
          </div>
        </CardContent>
      </Card>

      <!-- Day Detail Panel -->
      <div class="space-y-3">
        <Card>
          <CardHeader class="pb-2">
            <div class="flex items-center justify-between">
              <CardTitle class="text-base">
                {{ selectedDate ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }) : 'Select a date' }}
              </CardTitle>
              <Button v-if="selectedDate" size="sm" variant="outline" @click="openAddDialog(selectedDate)">
                <Plus class="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div v-if="selectedDayAppointments.length > 0" class="space-y-2">
              <div
                v-for="apt in selectedDayAppointments"
                :key="apt.id"
                class="rounded-lg border p-3 space-y-2"
              >
                <div class="flex items-start justify-between gap-2">
                  <div class="space-y-1">
                    <div class="flex items-center gap-2">
                      <span class="text-xs font-medium px-1.5 py-0.5 rounded" :class="appointmentTypeBadgeColor(apt.appointmentType)">
                        {{ appointmentTypeLabel(apt.appointmentType) }}
                      </span>
                      <span class="text-xs font-medium px-1.5 py-0.5 rounded" :class="statusBadgeClass(apt.status)">
                        {{ apt.status }}
                      </span>
                    </div>
                    <p class="text-sm font-medium flex items-center gap-1">
                      <Clock class="h-3 w-3 text-muted-foreground" />
                      {{ formatAppointmentTime(apt.dateTime) }}
                      <span v-if="apt.endDateTime" class="text-muted-foreground">– {{ formatAppointmentTime(apt.endDateTime) }}</span>
                    </p>
                  </div>
                </div>

                <div class="space-y-1 text-xs text-muted-foreground">
                  <p class="flex items-center gap-1">
                    <User class="h-3 w-3" />
                    {{ apt.memberName }}
                  </p>
                  <p v-if="apt.doctorName" class="flex items-center gap-1">
                    <Stethoscope class="h-3 w-3" />
                    {{ apt.doctorName }}
                  </p>
                  <p v-if="apt.location" class="flex items-center gap-1">
                    <MapPin class="h-3 w-3" />
                    {{ apt.location }}
                  </p>
                  <p v-if="apt.notes" class="mt-1 text-xs">{{ apt.notes }}</p>
                </div>

                <!-- Actions -->
                <div v-if="apt.status === 'scheduled'" class="flex gap-1 pt-1">
                  <Button size="sm" variant="ghost" class="h-7 text-xs text-green-600" @click="completeAppointment(apt.id)">
                    <CheckCircle class="mr-1 h-3 w-3" /> Done
                  </Button>
                  <Button size="sm" variant="ghost" class="h-7 text-xs" @click="openEditDialog(apt)">
                    Edit
                  </Button>
                  <Button size="sm" variant="ghost" class="h-7 text-xs text-amber-600" @click="cancelAppointment(apt.id)">
                    <X class="mr-1 h-3 w-3" /> Cancel
                  </Button>
                  <Button size="sm" variant="ghost" class="h-7 text-xs text-red-600" @click="deleteAppointment(apt.id)">
                    <Trash2 class="mr-1 h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
            <div v-else class="py-6 text-center text-sm text-muted-foreground">
              <CalendarIcon class="mx-auto h-8 w-8 mb-2 opacity-30" />
              <p>No appointments on this day</p>
              <Button size="sm" variant="link" class="mt-1" @click="openAddDialog(selectedDate)">
                Add one
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>

    <!-- Add/Edit Dialog -->
    <Dialog v-model:open="showDialog">
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>{{ editingAppointment ? 'Edit Appointment' : 'New Appointment' }}</DialogTitle>
        </DialogHeader>
        <div class="space-y-3">
          <!-- Member -->
          <div v-if="!editingAppointment" class="space-y-1">
            <Label>Family Member</Label>
            <select v-model="form.familyMemberId" class="h-9 w-full rounded-md border bg-background px-3 text-sm">
              <option v-for="m in members" :key="m.id" :value="m.id">{{ m.name }}</option>
            </select>
          </div>

          <!-- Type -->
          <div class="space-y-1">
            <Label>Appointment Type</Label>
            <select v-model="form.appointmentType" class="h-9 w-full rounded-md border bg-background px-3 text-sm">
              <option v-for="t in appointmentTypes" :key="t.value" :value="t.value">{{ t.label }}</option>
            </select>
          </div>

          <!-- Date + Time -->
          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1">
              <Label>Date</Label>
              <input v-model="form.date" type="date" class="h-9 w-full rounded-md border bg-background px-3 text-sm" />
            </div>
            <div class="space-y-1">
              <Label>Time</Label>
              <input v-model="form.time" type="time" class="h-9 w-full rounded-md border bg-background px-3 text-sm" />
            </div>
          </div>

          <!-- End Time -->
          <div class="space-y-1">
            <Label>End Time <span class="text-muted-foreground">(optional)</span></Label>
            <input v-model="form.endTime" type="time" class="h-9 w-full rounded-md border bg-background px-3 text-sm" />
          </div>

          <!-- Doctor -->
          <div class="space-y-1">
            <Label>Doctor Name <span class="text-muted-foreground">(optional)</span></Label>
            <input v-model="form.doctorName" type="text" placeholder="Dr. Smith" class="h-9 w-full rounded-md border bg-background px-3 text-sm" />
          </div>

          <!-- Location -->
          <div class="space-y-1">
            <Label>Location <span class="text-muted-foreground">(optional)</span></Label>
            <input v-model="form.location" type="text" placeholder="City Hospital" class="h-9 w-full rounded-md border bg-background px-3 text-sm" />
          </div>

          <!-- Notes -->
          <div class="space-y-1">
            <Label>Notes <span class="text-muted-foreground">(optional)</span></Label>
            <textarea v-model="form.notes" rows="2" placeholder="Bring reports, fasting required..." class="w-full rounded-md border bg-background px-3 py-2 text-sm" />
          </div>

          <div class="flex justify-end gap-2 pt-2">
            <Button variant="outline" @click="showDialog = false">Cancel</Button>
            <Button :disabled="saving || !form.familyMemberId || !form.date || !form.time" @click="saveAppointment">
              <Loader v-if="saving" class="mr-1 h-4 w-4 animate-spin" />
              {{ editingAppointment ? 'Update' : 'Create' }}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>
