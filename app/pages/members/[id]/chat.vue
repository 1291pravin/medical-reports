<script setup lang="ts">
import type { FamilyMember } from '~/composables/useMembers'

const route = useRoute()
const router = useRouter()
const memberId = route.params.id as string

const { data: member } = await useFetch<FamilyMember>(`/api/members/${memberId}`)

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

const messages = ref<ChatMessage[]>([])
const input = ref('')
const sending = ref(false)
const clearing = ref(false)
const messagesContainer = ref<HTMLElement | null>(null)

// Load existing messages
const { data: existingMessages } = await useFetch<ChatMessage[]>(
  `/api/chat/${memberId}/messages`,
)
if (existingMessages.value) {
  messages.value = existingMessages.value
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

watch(messages, () => scrollToBottom(), { deep: true })
onMounted(() => scrollToBottom())

async function sendMessage() {
  const text = input.value.trim()
  if (!text || sending.value) return

  // Optimistic UI - show user message immediately
  const tempMsg: ChatMessage = {
    id: `temp-${Date.now()}`,
    role: 'user',
    content: text,
    createdAt: new Date().toISOString(),
  }
  messages.value.push(tempMsg)
  input.value = ''
  sending.value = true

  try {
    const response = await $fetch<ChatMessage>('/api/chat/send', {
      method: 'POST',
      body: { memberId, message: text },
    })
    // Add assistant response
    messages.value.push(response)
  } catch (err: any) {
    // Remove optimistic message on error
    messages.value = messages.value.filter((m) => m.id !== tempMsg.id)
    input.value = text
  } finally {
    sending.value = false
  }
}

async function clearChat() {
  if (clearing.value) return
  clearing.value = true

  try {
    await $fetch(`/api/chat/${memberId}/messages`, { method: 'DELETE' })
    messages.value = []
  } catch (err: any) {
    console.error('Failed to clear chat:', err)
  } finally {
    clearing.value = false
  }
}
</script>

<template>
  <div class="flex h-[calc(100vh-4rem)] flex-col">
    <!-- Header -->
    <div class="flex items-center justify-between border-b px-4 py-3">
      <div class="flex items-center gap-3">
        <Button variant="ghost" size="icon" @click="router.push(`/members/${memberId}`)">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </Button>
        <div>
          <h1 class="text-sm font-semibold tracking-tight">{{ member?.name || 'Health Chat' }}</h1>
          <p class="text-[11px] text-muted-foreground">AI Health Assistant</p>
        </div>
      </div>
      <Button
        v-if="messages.length"
        variant="outline"
        size="sm"
        :disabled="clearing || sending"
        @click="clearChat"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="mr-1.5 h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>
        {{ clearing ? 'Clearing...' : 'New Chat' }}
      </Button>
    </div>

    <!-- Messages -->
    <div ref="messagesContainer" class="flex-1 overflow-y-auto p-4 space-y-4">
      <div v-if="!messages.length" class="flex h-full items-center justify-center">
        <div class="text-center text-sm text-muted-foreground">
          <svg xmlns="http://www.w3.org/2000/svg" class="mx-auto mb-2 h-8 w-8 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          <p>Ask questions about {{ member?.name }}'s health</p>
          <p class="mt-1 text-xs">e.g. "What medications are currently active?" or "Summarize recent lab results"</p>
        </div>
      </div>

      <div
        v-for="msg in messages"
        :key="msg.id"
        class="flex"
        :class="msg.role === 'user' ? 'justify-end' : 'justify-start'"
      >
        <div
          class="max-w-[80%] rounded-2xl px-4 py-2.5 text-sm"
          :class="
            msg.role === 'user'
              ? 'bg-primary text-primary-foreground rounded-br-md'
              : 'bg-muted rounded-bl-md'
          "
        >
          <p class="whitespace-pre-wrap">{{ msg.content }}</p>
        </div>
      </div>

      <div v-if="sending" class="flex justify-start">
        <div class="bg-muted rounded-2xl rounded-bl-md px-4 py-2.5">
          <div class="flex gap-1">
            <span class="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40" style="animation-delay: 0ms" />
            <span class="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40" style="animation-delay: 150ms" />
            <span class="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40" style="animation-delay: 300ms" />
          </div>
        </div>
      </div>
    </div>

    <!-- Input -->
    <div class="border-t p-4">
      <form @submit.prevent="sendMessage" class="flex gap-2">
        <Input
          v-model="input"
          placeholder="Ask about health..."
          :disabled="sending"
          class="flex-1"
          @keydown.enter.exact.prevent="sendMessage"
        />
        <Button type="submit" :disabled="!input.trim() || sending" size="icon">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" x2="11" y1="2" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </Button>
      </form>
    </div>
  </div>
</template>
