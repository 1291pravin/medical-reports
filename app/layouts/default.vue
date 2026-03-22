<template>
  <div class="min-h-screen bg-background">
    <AppHeader />
    <div class="flex">
      <Sidebar class="hidden lg:block" />
      <main class="flex-1 px-4 pb-20 pt-6 lg:px-8 lg:pb-8">
        <Breadcrumbs />
        <slot />
      </main>
    </div>
    <BottomNav class="lg:hidden" />
  </div>
</template>
