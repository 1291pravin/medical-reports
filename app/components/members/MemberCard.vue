<script setup lang="ts">
import { ChevronRight } from 'lucide-vue-next'
import type { FamilyMember } from '~/composables/useMembers'

const props = defineProps<{
  member: FamilyMember
}>()

function getAge(dob: string | null): string {
  if (!dob) return ''
  const birth = new Date(dob)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return `${age}y`
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}
</script>

<template>
  <NuxtLink :to="`/members/${member.id}`" class="group block">
    <div class="flex items-center gap-3.5 rounded-xl border bg-card p-3.5 transition-all group-hover:border-primary/25 group-hover:shadow-sm">
      <Avatar class="h-11 w-11 shrink-0">
        <AvatarImage v-if="member.photoUrl" :src="member.photoUrl" :alt="member.name" />
        <AvatarFallback class="bg-primary/8 text-primary text-sm font-semibold">{{ getInitials(member.name) }}</AvatarFallback>
      </Avatar>

      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <h3 class="text-sm font-semibold truncate">{{ member.name }}</h3>
          <span v-if="member.dob" class="text-[11px] text-muted-foreground">{{ getAge(member.dob) }}</span>
        </div>

        <div class="mt-0.5 flex items-center gap-2.5 text-[11px] text-muted-foreground">
          <span v-if="member.bloodGroup" class="font-semibold text-red-500 dark:text-red-400">{{ member.bloodGroup }}</span>
          <span v-if="member.bmi">BMI {{ member.bmi }}</span>
          <span>{{ member.documentCount }} reports</span>
          <span v-if="member.activeMedCount">{{ member.activeMedCount }} meds</span>
        </div>

        <div v-if="member.allergies?.length" class="mt-1.5 flex flex-wrap gap-1">
          <span
            v-for="allergy in member.allergies.slice(0, 3)"
            :key="allergy"
            class="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground"
          >
            {{ allergy }}
          </span>
          <span v-if="member.allergies.length > 3" class="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground">
            +{{ member.allergies.length - 3 }}
          </span>
        </div>
      </div>

      <ChevronRight class="h-4 w-4 text-muted-foreground/40 transition-colors group-hover:text-primary" />
    </div>
  </NuxtLink>
</template>
