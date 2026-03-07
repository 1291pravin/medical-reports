<template>
  <div class="flex min-h-screen">
    <!-- Left panel - branding -->
    <div class="hidden lg:flex lg:w-[45%] flex-col justify-between bg-primary p-10 text-primary-foreground">
      <div class="flex items-center gap-2.5">
        <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M11 2a2 2 0 0 0-2 2v5H4a2 2 0 0 0-2 2v2c0 1.1.9 2 2 2h5v5c0 1.1.9 2 2 2h2a2 2 0 0 0 2-2v-5h5a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-5V4a2 2 0 0 0-2-2h-2z" />
          </svg>
        </div>
        <span class="text-lg font-semibold tracking-tight">MedRecords</span>
      </div>

      <div>
        <h2 class="text-3xl font-bold leading-tight tracking-tight">
          Your family's health,<br />organized and secure.
        </h2>
        <p class="mt-3 text-base text-primary-foreground/70">
          Upload medical reports, track medications, and get AI-powered health insights for every family member.
        </p>
      </div>

      <p class="text-xs text-primary-foreground/40">
        Your data is encrypted and only accessible by you.
      </p>
    </div>

    <!-- Right panel - form -->
    <div class="flex flex-1 items-center justify-center px-6 py-12">
      <div class="w-full max-w-[380px]">
        <div class="mb-8 lg:hidden text-center">
          <div
            class="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M11 2a2 2 0 0 0-2 2v5H4a2 2 0 0 0-2 2v2c0 1.1.9 2 2 2h5v5c0 1.1.9 2 2 2h2a2 2 0 0 0 2-2v-5h5a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-5V4a2 2 0 0 0-2-2h-2z" />
            </svg>
          </div>
          <h1 class="text-xl font-bold tracking-tight">MedRecords</h1>
        </div>
        <slot />
      </div>
    </div>
  </div>
</template>
