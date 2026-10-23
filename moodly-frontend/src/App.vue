<script setup>
import { ref, computed, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import { currentUser, isManager as checkManager, logout as endSession } from "./api";
import { tone } from "./theme";

const router = useRouter();
const route = useRoute();

const user = ref(currentUser());
const isManager = computed(() => checkManager(user.value));

const cssVars = computed(() => ({
  "--bg": tone.value.bg,
  "--fg": tone.value.fg,
  "--soft": tone.value.soft,
  "--line": tone.value.line,
}));

watch(
  () => route.fullPath,
  () => {
    user.value = currentUser();
  },
);

watch(
  tone,
  (t) => {
    document.documentElement.style.backgroundColor = t.bg;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", t.bg);
  },
  { immediate: true },
);

const logout = () => {
  endSession();
  user.value = null;
  router.push("/login");
};
</script>

<template>
  <div class="shell" :style="cssVars">
    <div class="frame">
      <header v-if="user" class="topbar">
        <RouterLink :to="isManager ? '/manager' : '/'" class="wordmark">moodly</RouterLink>
        <button type="button" class="logout" @click="logout">Se déconnecter</button>
      </header>

      <main class="content">
        <RouterView />
      </main>

      <nav v-if="user && isManager" class="tabs" aria-label="Navigation principale">
        <RouterLink to="/" class="tab" exact-active-class="current">Aujourd'hui</RouterLink>
        <RouterLink to="/manager" class="tab" active-class="current">Équipe</RouterLink>
      </nav>
    </div>
  </div>
</template>

<style>
*,
*::before,
*::after {
  box-sizing: border-box;
}

html {
  background: #e8ecef;
}

body {
  margin: 0;
  font-family: "Bricolage Grotesque", system-ui, -apple-system, "Segoe UI", sans-serif;
  font-size: 16px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

button,
input,
textarea {
  font: inherit;
  color: inherit;
}

button {
  cursor: pointer;
}

:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 3px;
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
  }
}

.shell {
  min-height: 100vh;
  min-height: 100dvh;
  background: var(--bg);
  color: var(--fg);
  padding-top: env(safe-area-inset-top, 0px);
  transition: background-color 0.5s ease, color 0.5s ease;
}

.frame {
  width: min(100%, 560px);
  min-height: calc(100dvh - env(safe-area-inset-top, 0px));
  margin: 0 auto;
  padding: 0 24px;
  display: flex;
  flex-direction: column;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 0 8px;
}

.wordmark {
  font-size: 1.35rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: inherit;
  text-decoration: none;
}

.logout {
  background: none;
  border: 1.5px solid var(--line);
  border-radius: 999px;
  padding: 7px 14px;
  font-size: 0.85rem;
  font-weight: 500;
  transition: border-color 0.2s;
}

.logout:hover {
  border-color: var(--fg);
}

.content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.tabs {
  position: sticky;
  bottom: 0;
  display: flex;
  gap: 28px;
  padding: 14px 0 calc(14px + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid var(--line);
  background: var(--bg);
  transition: background-color 0.5s ease;
}

.tab {
  color: var(--soft);
  text-decoration: none;
  font-weight: 600;
  padding-bottom: 4px;
  border-bottom: 2px solid transparent;
}

.tab.current {
  color: var(--fg);
  border-bottom-color: var(--fg);
}

.primary {
  width: 100%;
  border: 0;
  border-radius: 14px;
  padding: 16px 20px;
  background: var(--fg);
  color: var(--bg);
  font-weight: 700;
  font-size: 1.05rem;
  transition: opacity 0.2s;
}

.primary:disabled {
  opacity: 0.55;
  cursor: default;
}

.notice {
  margin: 0;
  padding: 10px 14px;
  border-radius: 10px;
  background: var(--fg);
  color: var(--bg);
  font-size: 0.92rem;
  font-weight: 500;
}
</style> 