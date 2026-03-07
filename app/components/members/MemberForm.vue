<script setup lang="ts">
import type { FamilyMember } from '~/composables/useMembers'

const props = defineProps<{
  member?: FamilyMember
}>()

const emit = defineEmits<{
  submit: [data: {
    name: string
    dob?: string
    bloodGroup?: string
    dietPreference?: string
    allergies?: string[]
    emergencyContact?: string
  }]
}>()

const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
const dietOptions = ['vegetarian', 'non-vegetarian', 'vegan', 'eggetarian']

const form = reactive({
  name: props.member?.name || '',
  dob: props.member?.dob || '',
  bloodGroup: props.member?.bloodGroup || '',
  dietPreference: props.member?.dietPreference || '',
  emergencyContact: props.member?.emergencyContact || '',
})

const allergies = ref<string[]>(props.member?.allergies || [])
const newAllergy = ref('')

function addAllergy() {
  const val = newAllergy.value.trim()
  if (val && !allergies.value.includes(val)) {
    allergies.value.push(val)
  }
  newAllergy.value = ''
}

function removeAllergy(index: number) {
  allergies.value.splice(index, 1)
}

function handleSubmit() {
  emit('submit', {
    name: form.name,
    dob: form.dob || undefined,
    bloodGroup: form.bloodGroup || undefined,
    dietPreference: form.dietPreference || undefined,
    allergies: allergies.value.length > 0 ? allergies.value : undefined,
    emergencyContact: form.emergencyContact || undefined,
  })
}
</script>

<template>
  <form @submit.prevent="handleSubmit" class="space-y-4">
    <div class="space-y-2">
      <Label for="name">Name *</Label>
      <Input id="name" v-model="form.name" placeholder="Full name" required />
    </div>

    <div class="grid grid-cols-2 gap-4">
      <div class="space-y-2">
        <Label for="dob">Date of Birth</Label>
        <Input id="dob" v-model="form.dob" type="date" />
      </div>

      <div class="space-y-2">
        <Label for="bloodGroup">Blood Group</Label>
        <select
          id="bloodGroup"
          v-model="form.bloodGroup"
          class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="">Select</option>
          <option v-for="bg in bloodGroups" :key="bg" :value="bg">{{ bg }}</option>
        </select>
      </div>
    </div>

    <div class="space-y-2">
      <Label for="dietPreference">Diet Preference</Label>
      <select
        id="dietPreference"
        v-model="form.dietPreference"
        class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <option value="">Select</option>
        <option v-for="d in dietOptions" :key="d" :value="d" class="capitalize">{{ d }}</option>
      </select>
    </div>

    <div class="space-y-2">
      <Label>Allergies</Label>
      <div class="flex gap-2">
        <Input
          v-model="newAllergy"
          placeholder="Add allergy"
          @keydown.enter.prevent="addAllergy"
        />
        <Button type="button" variant="outline" size="sm" @click="addAllergy">Add</Button>
      </div>
      <div v-if="allergies.length" class="flex flex-wrap gap-1 mt-2">
        <Badge
          v-for="(allergy, i) in allergies"
          :key="allergy"
          variant="secondary"
          class="cursor-pointer"
          @click="removeAllergy(i)"
        >
          {{ allergy }} &times;
        </Badge>
      </div>
    </div>

    <div class="space-y-2">
      <Label for="emergency">Emergency Contact</Label>
      <Input id="emergency" v-model="form.emergencyContact" placeholder="Phone number" />
    </div>

    <div class="flex gap-2 pt-2">
      <Button type="submit" class="flex-1">
        {{ member ? 'Update Member' : 'Add Member' }}
      </Button>
      <Button type="button" variant="outline" @click="$router.back()">Cancel</Button>
    </div>
  </form>
</template>
