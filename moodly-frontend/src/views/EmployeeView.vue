<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";
import MoodFace from "../components/MoodFace.vue";
import { fetchMyEntries, saveToday, explainError } from "../api";
import { theme } from "../theme";

const PARIS = "Europe/Paris";

const labels = { 1: "Très bas", 2: "Bas", 3: "Neutre", 4: "Bien", 5: "Très bien" };

const tagOptions = [
  "Charge de travail",
  "Ambiance d'équipe",
  "Management",
  "Reconnaissance",
  "Équilibre vie pro/perso",
  "RSE / Sens du travail",
];

const helpLines = [
  {
    title: "3114",
    detail: "Numéro national de prévention du suicide, gratuit, 24 h/24.",
    href: "tel:3114",
  },
  {
    title: "Votre médecin du travail ou votre référent RH",
    detail: "Demandez un rendez-vous, sans attendre.",
  },
];

const weekdays = ["L", "M", "M", "J", "V", "S", "D"];

const dayKeyOf = (date) => date.toLocaleDateString("en-CA", { timeZone: PARIS });

const selectedScore = ref(null);
const selectedTags = ref([]);
const comment = ref("");
const loading = ref(false);
const successMessage = ref("");
const errorMessage = ref("");
const todayDocumentId = ref(null);
const history = ref([]);
const showWelcome = ref(!localStorage.getItem("moodly_welcome_seen"));

const dateLabel = new Date().toLocaleDateString("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: PARIS,
});

const headline = computed(() =>
  selectedScore.value ? labels[selectedScore.value] : "Comment ça va aujourd'hui ?",
);

const showHelp = computed(
  () => selectedScore.value !== null && selectedScore.value <= 2,
);

const buttonLabel = computed(() => {
  if (loading.value) return "Enregistrement…";
  return todayDocumentId.value ? "Mettre à jour" : "Enregistrer";
});

const entryByDay = computed(() => {
  const map = {};
  history.value.forEach((e) => {
    map[e.day] = e;
  });
  return map;
});

const streak = computed(() => {
  const cursor = new Date();
  if (!entryByDay.value[dayKeyOf(cursor)]) cursor.setDate(cursor.getDate() - 1);
  let count = 0;
  while (entryByDay.value[dayKeyOf(cursor)]) {
    count++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
});

const streakLabel = computed(() => `${streak.value} jour${streak.value > 1 ? "s" : ""}`);

const weekAverage = computed(() => {
  const limit = new Date();
  limit.setDate(limit.getDate() - 6);
  const limitKey = dayKeyOf(limit);
  const scores = history.value.filter((e) => e.day >= limitKey).map((e) => e.score);
  if (!scores.length) return null;
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  return mean.toFixed(1).replace(".", ",");
});

const todayKey = dayKeyOf(new Date());

const monthCount = computed(
  () => history.value.filter((e) => e.day.startsWith(todayKey.slice(0, 7))).length,
);

const topTagsText = computed(() => {
  const counts = {};
  history.value.forEach((e) =>
    e.tags.forEach((t) => {
      counts[t] = (counts[t] || 0) + 1;
    }),
  );
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([tag]) => tag)
    .join(", ");
});

const monthLabel = new Date().toLocaleDateString("fr-FR", {
  month: "long",
  year: "numeric",
  timeZone: PARIS,
});

const calendarDays = computed(() => {
  const [year, month] = todayKey.split("-").map(Number);
  const offset = (new Date(year, month - 1, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month, 0).getDate();

  const cells = Array.from({ length: offset }, () => null);
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({
      day: d,
      score: entryByDay.value[key]?.score ?? null,
      today: key === todayKey,
    });
  }
  return cells;
});

watch(selectedScore, (value) => {
  theme.score = value;
});

const selectScore = (score) => {
  selectedScore.value = score;
  successMessage.value = "";
};

const toggleTag = (tag) => {
  selectedTags.value = selectedTags.value.includes(tag)
    ? selectedTags.value.filter((t) => t !== tag)
    : [...selectedTags.value, tag];
};

const closeWelcome = () => {
  localStorage.setItem("moodly_welcome_seen", "1");
  showWelcome.value = false;
};

const fetchUserHistory = async () => {
  try {
    const { data } = await fetchMyEntries();

    history.value = data.map((e) => ({
      day: e.day,
      score: e.score,
      tags: e.Tags || [],
    }));

    const today = data.find((e) => e.isToday);
    if (today) {
      todayDocumentId.value = today.documentId;
      selectedScore.value = today.score;
      selectedTags.value = today.Tags || [];
      comment.value = today.Comment || "";
    }
  } catch (err) {
    errorMessage.value = explainError(err);
  }
};

const submitMood = async () => {
  loading.value = true;
  successMessage.value = "";
  errorMessage.value = "";
  const isUpdate = Boolean(todayDocumentId.value);

  try {
    await saveToday({
      score: Number(selectedScore.value),
      Tags: selectedTags.value,
      Comment: comment.value,
    });
    successMessage.value = isUpdate ? "Humeur mise à jour." : "Humeur enregistrée.";
    await fetchUserHistory();
  } catch (err) {
    errorMessage.value = explainError(err);
  } finally {
    loading.value = false;
  }
};

onMounted(fetchUserHistory);

onBeforeUnmount(() => {
  theme.score = null;
});
</script>

<template>
  <div class="today">
    <div
      v-if="showWelcome"
      class="welcome"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
    >
      <div class="welcome-inner">
        <h2 id="welcome-title">Un point rapide, chaque jour.</h2>
        <p>Moodly prend dix secondes : vous indiquez comment vous allez, et c'est tout.</p>
        <ul>
          <li>
            Votre manager ne voit jamais votre réponse, seulement la moyenne de l'équipe, à
            partir de trois réponses par jour.
          </li>
          <li>Votre historique n'est visible que par vous.</li>
        </ul>
        <button type="button" class="primary" @click="closeWelcome">Commencer</button>
      </div>
    </div>

    <section class="entry">
      <p class="date">{{ dateLabel }}</p>
      <h1 class="headline">{{ headline }}</h1>

      <div class="scale" role="group" aria-label="Votre humeur du jour">
        <button
          v-for="n in 5"
          :key="n"
          type="button"
          class="face"
          :class="{ chosen: selectedScore === n }"
          :aria-pressed="selectedScore === n"
          :aria-label="labels[n]"
          @click="selectScore(n)"
        >
          <MoodFace :score="n" />
        </button>
      </div>

      <Transition name="reveal">
        <div v-if="selectedScore" class="details">
          <div v-if="showHelp" class="help">
            <h2>Si cette période est difficile</h2>
            <p>Vous n'avez pas à la traverser seul·e. Voici où vous adresser.</p>
            <ul>
              <li v-for="line in helpLines" :key="line.title">
                <component
                  :is="line.href ? 'a' : 'span'"
                  :href="line.href"
                  class="help-title"
                >{{ line.title }}</component>
                <span class="help-detail">{{ line.detail }}</span>
              </li>
            </ul>
          </div>

          <fieldset class="tags">
            <legend>Qu'est-ce qui pèse ou qui aide aujourd'hui ?</legend>
            <div class="tag-list">
              <button
                v-for="tag in tagOptions"
                :key="tag"
                type="button"
                class="tag"
                :class="{ on: selectedTags.includes(tag) }"
                :aria-pressed="selectedTags.includes(tag)"
                @click="toggleTag(tag)"
              >
                {{ tag }}
              </button>
            </div>
          </fieldset>

          <label class="note">
            <span>Un mot de plus, si vous voulez</span>
            <textarea v-model="comment" rows="3" maxlength="255"></textarea>
            <small>
              <span>Ce commentaire reste privé : votre manager ne le voit pas.</span>
              <span>{{ comment.length }}/255</span>
            </small>
          </label>

          <p v-if="errorMessage" class="notice" role="alert">{{ errorMessage }}</p>
          <p v-if="successMessage" class="success" role="status">{{ successMessage }}</p>

          <button type="button" class="primary" :disabled="loading" @click="submitMood">
            {{ buttonLabel }}
          </button>
        </div>
      </Transition>
    </section>

    <section class="journal">
      <h2>Votre suivi</h2>

      <dl class="figures">
        <div>
          <dt>Série en cours</dt>
          <dd>{{ streakLabel }}</dd>
        </div>
        <div>
          <dt>Moyenne sur 7 jours</dt>
          <dd>{{ weekAverage || "–" }}</dd>
        </div>
        <div>
          <dt>Saisies ce mois-ci</dt>
          <dd>{{ monthCount }}</dd>
        </div>
      </dl>

      <p v-if="topTagsText" class="frequent">Sujets les plus cités : {{ topTagsText }}.</p>

      <h3 class="month">{{ monthLabel }}</h3>
      <div class="calendar" aria-label="Calendrier du mois">
        <span v-for="(d, i) in weekdays" :key="'w' + i" class="weekday">{{ d }}</span>
        <div
          v-for="(cell, i) in calendarDays"
          :key="i"
          class="cell"
          :class="{ filled: cell && cell.score, today: cell && cell.today }"
        >
          <MoodFace v-if="cell && cell.score" :score="cell.score" />
          <span v-else-if="cell">{{ cell.day }}</span>
        </div>
      </div>

      <p class="private">Seul vous voyez ce suivi.</p>
    </section>
  </div>
</template>

<style scoped>
.today {
  flex: 1;
  padding-bottom: 56px;
}

.entry {
  padding-top: 28px;
}

.date {
  margin: 0;
  color: var(--soft);
}

.headline {
  margin: 10px 0 32px;
  min-height: 2.95em;
  display: flex;
  align-items: flex-end;
  font-size: clamp(2.5rem, 12.5vw, 4rem);
  line-height: 0.98;
  font-weight: 700;
  letter-spacing: -0.035em;
  text-wrap: balance;
}

.scale {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.face {
  flex: 1 1 0;
  max-width: 72px;
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  padding: 0;
  border: 1.5px solid var(--fg);
  border-radius: 50%;
  background: transparent;
  color: var(--fg);
  transition: background-color 0.25s, color 0.25s, transform 0.25s;
}

.face :deep(svg) {
  width: 62%;
  height: 62%;
}

.face.chosen {
  background: var(--fg);
  color: var(--bg);
  transform: scale(1.08);
}

.details {
  margin-top: 36px;
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.reveal-enter-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.reveal-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.help {
  border: 1.5px solid var(--fg);
  border-radius: 14px;
  padding: 18px 18px 6px;
}

.help h2 {
  margin: 0 0 6px;
  font-size: 1.15rem;
  letter-spacing: -0.01em;
}

.help p {
  margin: 0 0 14px;
  color: var(--soft);
}

.help ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

.help li {
  display: flex;
  flex-direction: column;
  padding: 12px 0;
  border-top: 1px solid var(--line);
}

.help-title {
  color: inherit;
  font-weight: 700;
}

.help-detail {
  color: var(--soft);
  font-size: 0.92rem;
}

.tags {
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.tags legend {
  margin-bottom: 12px;
  padding: 0;
  font-weight: 600;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag {
  padding: 8px 14px;
  border: 1.5px solid var(--line);
  border-radius: 999px;
  background: transparent;
  font-size: 0.92rem;
  transition: background-color 0.2s, color 0.2s, border-color 0.2s;
}

.tag.on {
  background: var(--fg);
  border-color: var(--fg);
  color: var(--bg);
}

.note {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-weight: 600;
}

.note textarea {
  resize: none;
  padding: 8px 0;
  border: 0;
  border-bottom: 1.5px solid var(--line);
  border-radius: 0;
  background: transparent;
  font-weight: 400;
  line-height: 1.5;
}

.note textarea:focus {
  outline: none;
  border-bottom-color: var(--fg);
  box-shadow: 0 1px 0 var(--fg);
}

.note small {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: var(--soft);
  font-size: 0.82rem;
  font-weight: 400;
}

.success {
  margin: 0;
  font-weight: 600;
}

.journal {
  margin-top: 64px;
  padding-top: 28px;
  border-top: 1px solid var(--line);
}

.journal h2 {
  margin: 0 0 8px;
  font-size: 1.5rem;
  letter-spacing: -0.02em;
}

.figures {
  margin: 0;
}

.figures div {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 14px 0;
  border-bottom: 1px solid var(--line);
}

.figures dt {
  color: var(--soft);
}

.figures dd {
  margin: 0;
  font-size: 1.6rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.frequent {
  margin: 14px 0 0;
  color: var(--soft);
}

.month {
  margin: 36px 0 12px;
  font-size: 1rem;
  font-weight: 600;
  text-transform: capitalize;
}

.calendar {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
}

.weekday {
  padding-bottom: 4px;
  text-align: center;
  font-size: 0.78rem;
  color: var(--soft);
}

.cell {
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  border-radius: 50%;
  font-size: 0.85rem;
  color: var(--soft);
}

.cell.filled {
  padding: 22%;
  background: var(--fg);
  color: var(--bg);
}

.cell.today {
  box-shadow: 0 0 0 2px var(--bg), 0 0 0 3.5px var(--fg);
}

.private {
  margin: 20px 0 0;
  color: var(--soft);
  font-size: 0.88rem;
}

.welcome {
  position: fixed;
  inset: 0;
  z-index: 30;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 24px 24px calc(24px + env(safe-area-inset-bottom, 0px));
  background: var(--bg);
  color: var(--fg);
}

.welcome-inner {
  width: min(100%, 512px);
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.welcome h2 {
  margin: 0;
  font-size: clamp(2.4rem, 11vw, 3.6rem);
  line-height: 1;
  letter-spacing: -0.035em;
}

.welcome p {
  margin: 0;
  color: var(--soft);
}

.welcome ul {
  margin: 0;
  padding: 18px 0 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 12px;
  border-top: 1px solid var(--line);
}
</style>