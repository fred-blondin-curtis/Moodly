<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";
import { Line } from "vue-chartjs";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
} from "chart.js";
import { fetchStats, explainError } from "../api";
import { theme, tone } from "../theme";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip);

const PARIS = "Europe/Paris";

const ACTIONS = {
  "Charge de travail":
    "La charge de travail revient souvent. Un point de priorisation en début de semaine peut aider.",
  "Ambiance d'équipe":
    "Un moment convivial ou un temps d'échange informel peut renforcer la cohésion.",
  Management:
    "Des points individuels réguliers et un espace pour recueillir du feedback peuvent aider.",
  Reconnaissance:
    "Valorisez les réussites de l'équipe : remerciements, retours positifs réguliers.",
  "Équilibre vie pro/perso":
    "Rappelez les règles de droit à la déconnexion lors des réunions d'équipe.",
  "RSE / Sens du travail":
    "Partagez l'impact concret du travail de l'équipe et associez-la à des actions RSE.",
};

const period = ref(30);
const stats = ref(null);
const previousDays = ref([]);
const loading = ref(true);
const errorMessage = ref("");

const dayKeyOf = (date) => date.toLocaleDateString("en-CA", { timeZone: PARIS });
const format = (n) => n.toFixed(1).replace(".", ",");

const cutoffKey = computed(() => {
  const d = new Date();
  d.setDate(d.getDate() - period.value);
  return dayKeyOf(d);
});

const weighted = (list) => {
  const total = list.reduce((sum, d) => sum + d.responses, 0);
  if (!total) return null;
  return list.reduce((sum, d) => sum + d.average * d.responses, 0) / total;
};

const days = computed(() => stats.value?.days ?? []);
const minResponses = computed(() => stats.value?.minResponses ?? 3);
const average = computed(() => weighted(days.value));
const previousAverage = computed(() => weighted(previousDays.value));
const responsesCount = computed(() => days.value.reduce((sum, d) => sum + d.responses, 0));

const bucket = computed(() =>
  average.value === null ? null : Math.min(5, Math.max(1, Math.round(average.value))),
);

const headline = computed(() => {
  const a = average.value;
  if (a === null) return loading.value ? "Chargement…" : "Pas encore assez de réponses.";
  if (a >= 4.2) return "Le moral de l'équipe est très bon.";
  if (a >= 3.5) return "Le moral de l'équipe est bon.";
  if (a >= 2.8) return "Le moral de l'équipe est stable.";
  if (a >= 2.2) return "Le moral de l'équipe est fragile.";
  return "Le moral de l'équipe est bas.";
});

const subline = computed(() => {
  if (average.value === null) {
    return `Un jour n'apparaît qu'à partir de ${minResponses.value} réponses, pour protéger l'anonymat.`;
  }
  const base = `${format(average.value)} sur 5 en moyenne, sur ${responsesCount.value} réponses.`;
  if (previousAverage.value === null) return base;
  const diff = average.value - previousAverage.value;
  if (Math.abs(diff) < 0.1) {
    return `${base} Stable par rapport aux ${period.value} jours précédents.`;
  }
  const unit = Math.abs(diff) >= 2 ? "points" : "point";
  const direction = diff > 0 ? "En hausse" : "En baisse";
  return `${base} ${direction} de ${format(Math.abs(diff))} ${unit} par rapport aux ${period.value} jours précédents.`;
});

const topTags = computed(() =>
  (stats.value?.topTags ?? []).map((t) => ({
    ...t,
    action: ACTIONS[t.tag] || "Échangez avec l'équipe sur ce sujet lors du prochain point.",
  })),
);

const chartData = computed(() => ({
  labels: days.value.map((d) =>
    new Date(`${d.day}T12:00:00`).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
    }),
  ),
  datasets: [
    {
      data: days.value.map((d) => d.average),
      borderColor: tone.value.fg,
      backgroundColor: tone.value.fg,
      borderWidth: 2,
      pointRadius: 3.5,
      pointHoverRadius: 5,
      tension: 0.25,
    },
  ],
}));

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    y: {
      min: 1,
      max: 5,
      ticks: { stepSize: 1, color: tone.value.soft },
      grid: { color: tone.value.line },
      border: { display: false },
    },
    x: {
      ticks: { color: tone.value.soft, maxTicksLimit: 6, maxRotation: 0 },
      grid: { display: false },
      border: { color: tone.value.line },
    },
  },
  plugins: {
    legend: { display: false },
    tooltip: {
      displayColors: false,
      callbacks: {
        label: (item) => `${String(item.parsed.y).replace(".", ",")} sur 5`,
        afterLabel: (item) => `${days.value[item.dataIndex].responses} réponses`,
      },
    },
  },
}));

watch(
  bucket,
  (value) => {
    theme.score = value;
  },
  { immediate: true },
);

const load = async () => {
  loading.value = true;
  errorMessage.value = "";
  try {
    const [current, wide] = await Promise.all([
      fetchStats(period.value),
      fetchStats(period.value * 2),
    ]);
    stats.value = current;
    previousDays.value = wide.days.filter((d) => d.day < cutoffKey.value);
  } catch (err) {
    errorMessage.value = explainError(err);
  } finally {
    loading.value = false;
  }
};

const setPeriod = (value) => {
  if (value === period.value) return;
  period.value = value;
  load();
};

const exportCsv = () => {
  const rows = [
    "date;moyenne;reponses",
    ...days.value.map(
      (d) => `${d.day};${String(d.average).replace(".", ",")};${d.responses}`,
    ),
  ];
  const blob = new Blob(["\ufeff" + rows.join("\r\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `moodly-equipe-${period.value}-jours.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

onMounted(load);

onBeforeUnmount(() => {
  theme.score = null;
});
</script>

<template>
  <div class="team">
    <section>
      <div class="periods" role="group" aria-label="Période">
        <button
          type="button"
          :class="{ on: period === 7 }"
          :aria-pressed="period === 7"
          @click="setPeriod(7)"
        >
          7 jours
        </button>
        <button
          type="button"
          :class="{ on: period === 30 }"
          :aria-pressed="period === 30"
          @click="setPeriod(30)"
        >
          30 jours
        </button>
      </div>
      <h1 class="headline">{{ headline }}</h1>
      <p class="subline">{{ subline }}</p>
    </section>

    <section v-if="errorMessage" class="problem">
      <p class="notice" role="alert">{{ errorMessage }}</p>
      <button type="button" class="ghost" @click="load">Réessayer</button>
    </section>

    <section v-if="stats && stats.alert" class="alert" role="status">
      <h2>Le moral baisse depuis plusieurs jours</h2>
      <p>
        La moyenne des trois derniers jours est sous 2,5 sur 5. Un point d'équipe ou quelques
        échanges individuels peuvent aider.
      </p>
    </section>

    <section v-if="days.length" class="chart">
      <h2>Évolution</h2>
      <div class="chart-box">
        <Line :data="chartData" :options="chartOptions" />
      </div>
    </section>

    <section v-if="stats" class="topics">
      <h2>Les sujets les plus cités</h2>
      <ul v-if="topTags.length">
        <li v-for="t in topTags" :key="t.tag">
          <div class="topic-head">
            <span>{{ t.tag }}</span>
            <span>{{ t.percent }} % des réponses</span>
          </div>
          <div class="bar"><span :style="{ width: t.percent + '%' }"></span></div>
          <p>{{ t.action }}</p>
        </li>
      </ul>
      <p v-else class="muted">
        Aucun sujet n'est cité par au moins {{ minResponses }} personnes sur cette période.
      </p>
    </section>

    <footer class="foot">
      <button v-if="days.length" type="button" class="ghost" @click="exportCsv">
        Exporter en CSV
      </button>
      <p>
        Aucune réponse individuelle n'est visible ici. Un jour n'apparaît qu'à partir de
        {{ minResponses }} réponses.
      </p>
    </footer>
  </div>
</template>

<style scoped>
.team {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 40px;
  padding: 20px 0 40px;
}

.periods {
  display: flex;
  gap: 22px;
  margin-bottom: 18px;
}

.periods button {
  padding: 0 0 4px;
  border: 0;
  border-bottom: 2px solid transparent;
  background: none;
  color: var(--soft);
  font-weight: 600;
}

.periods button.on {
  color: var(--fg);
  border-bottom-color: var(--fg);
}

.headline {
  margin: 0;
  min-height: 2em;
  font-size: clamp(2.5rem, 12vw, 3.8rem);
  line-height: 1;
  font-weight: 700;
  letter-spacing: -0.035em;
  text-wrap: balance;
}

.subline {
  margin: 14px 0 0;
  max-width: 46ch;
  color: var(--soft);
}

.problem {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
}

.alert {
  border: 1.5px solid var(--fg);
  border-radius: 14px;
  padding: 18px;
}

.alert h2 {
  margin: 0 0 6px;
  font-size: 1.15rem;
  letter-spacing: -0.01em;
}

.alert p {
  margin: 0;
  color: var(--soft);
}

.chart h2,
.topics h2 {
  margin: 0 0 14px;
  font-size: 1.3rem;
  letter-spacing: -0.02em;
}

.chart-box {
  height: 240px;
}

.topics ul {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.topic-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
  font-weight: 600;
}

.topic-head span:last-child {
  color: var(--soft);
  font-weight: 400;
}

.bar {
  height: 4px;
  overflow: hidden;
  border-radius: 2px;
  background: var(--line);
}

.bar span {
  display: block;
  height: 100%;
  border-radius: 2px;
  background: var(--fg);
}

.topics p {
  margin: 10px 0 0;
  color: var(--soft);
}

.foot {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 16px;
}

.foot p {
  margin: 0;
  color: var(--soft);
  font-size: 0.88rem;
}

.ghost {
  padding: 12px 18px;
  border: 1.5px solid var(--fg);
  border-radius: 12px;
  background: transparent;
  font-weight: 600;
}
</style>