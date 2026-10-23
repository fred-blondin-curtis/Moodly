import { reactive, computed } from "vue";

const light = "#F2F0E9";
const ink = "#16212C";

export const palette = {
  neutral: {
    bg: "#E8ECEF",
    fg: ink,
    soft: "rgba(22, 33, 44, 0.68)",
    line: "rgba(22, 33, 44, 0.2)",
  },
  1: {
    bg: "#27324D",
    fg: light,
    soft: "rgba(242, 240, 233, 0.72)",
    line: "rgba(242, 240, 233, 0.24)",
  },
  2: {
    bg: "#47628F",
    fg: light,
    soft: "rgba(242, 240, 233, 0.86)",
    line: "rgba(242, 240, 233, 0.28)",
  },
  3: {
    bg: "#A3B6C8",
    fg: ink,
    soft: "rgba(22, 33, 44, 0.78)",
    line: "rgba(22, 33, 44, 0.24)",
  },
  4: {
    bg: "#EFD07A",
    fg: "#2B2208",
    soft: "rgba(43, 34, 8, 0.72)",
    line: "rgba(43, 34, 8, 0.24)",
  },
  5: {
    bg: "#F5B544",
    fg: "#2B1A04",
    soft: "rgba(43, 26, 4, 0.72)",
    line: "rgba(43, 26, 4, 0.26)",
  },
};

export const theme = reactive({ score: null });

export const tone = computed(() => palette[theme.score ?? "neutral"]);