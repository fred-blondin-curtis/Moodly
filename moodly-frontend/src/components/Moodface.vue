<script setup>
defineProps({
  score: { type: Number, required: true },
});

const mouths = {
  1: "M7.5 17 Q12 12.5 16.5 17",
  2: "M8 16.2 Q12 14 16 16.2",
  3: "M8 15.5 H16",
  4: "M8 14.2 Q12 17.2 16 14.2",
  5: "M7 13 Q12 19 17 13",
};
</script>

<template>
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.7"
    stroke-linecap="round"
    aria-hidden="true"
  >
    <circle cx="9" cy="9.5" r="0.6" />
    <circle cx="15" cy="9.5" r="0.6" />
    <path :d="mouths[score]" />
  </svg>
</template>

<style scoped>
svg {
  display: block;
  width: 100%;
  height: 100%;
}
</style>