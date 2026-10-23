<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { login, register, isManager, explainError } from "../api";

const router = useRouter();
const isRegistering = ref(false);
const username = ref("");
const email = ref("");
const password = ref("");
const loading = ref(false);
const errorMessage = ref("");

const toggleMode = () => {
  isRegistering.value = !isRegistering.value;
  errorMessage.value = "";
};

const handleSubmit = async () => {
  loading.value = true;
  errorMessage.value = "";

  try {
    if (isRegistering.value) {
      await register(username.value, email.value, password.value);
    } else {
      await login(email.value, password.value);
    }
    router.push(isManager() ? "/manager" : "/");
  } catch (err) {
    errorMessage.value = explainError(err);
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="login">
    <div>
      <h1 class="brand">moodly</h1>
      <p class="tagline">Le moral de l'équipe, sans exposer personne.</p>
    </div>

    <div class="panel">
      <form class="form" @submit.prevent="handleSubmit">
        <label v-if="isRegistering" class="field">
          <span>Nom d'utilisateur</span>
          <input v-model="username" type="text" autocomplete="username" minlength="3" required />
        </label>

        <label class="field">
          <span>Adresse e-mail</span>
          <input v-model="email" type="email" autocomplete="email" required />
        </label>

        <label class="field">
          <span>Mot de passe</span>
          <input
            v-model="password"
            type="password"
            minlength="6"
            :autocomplete="isRegistering ? 'new-password' : 'current-password'"
            required
          />
        </label>

        <p v-if="errorMessage" class="notice" role="alert">{{ errorMessage }}</p>

        <button class="primary" type="submit" :disabled="loading">
          {{ loading ? "Un instant…" : isRegistering ? "Créer mon compte" : "Se connecter" }}
        </button>
      </form>

      <button class="switch" type="button" @click="toggleMode">
        {{ isRegistering ? "J'ai déjà un compte" : "Créer un compte" }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.login {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 48px;
  padding: 56px 0 calc(32px + env(safe-area-inset-bottom, 0px));
}

.brand {
  margin: 0;
  font-size: clamp(4rem, 22vw, 7rem);
  line-height: 0.9;
  font-weight: 800;
  letter-spacing: -0.06em;
}

.tagline {
  margin: 18px 0 0;
  max-width: 22ch;
  font-size: 1.15rem;
  color: var(--soft);
}

.panel {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.92rem;
  font-weight: 600;
}

.field input {
  background: transparent;
  border: 0;
  border-bottom: 1.5px solid var(--line);
  border-radius: 0;
  padding: 10px 0;
  font-size: 1.05rem;
  font-weight: 400;
}

.field input:focus {
  outline: none;
  border-bottom-color: var(--fg);
  box-shadow: 0 1px 0 var(--fg);
}

.switch {
  align-self: flex-start;
  background: none;
  border: 0;
  padding: 0;
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 4px;
}
</style>