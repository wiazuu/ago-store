export const mealPlanDefinitions = [
  { code: "A1", line: "A", interval: "weekly", weeks: 1, mealsPerWeek: 7 },
  { code: "A2", line: "A", interval: "monthly", weeks: 4, mealsPerWeek: 7 },
  { code: "A3", line: "A", interval: "quarterly", weeks: 12, mealsPerWeek: 7 },
  { code: "B1", line: "B", interval: "weekly", weeks: 1, mealsPerWeek: 7 },
  { code: "B2", line: "B", interval: "monthly", weeks: 4, mealsPerWeek: 7 },
  { code: "B3", line: "B", interval: "quarterly", weeks: 12, mealsPerWeek: 7 },
] as const;

export type MealPlanCode = (typeof mealPlanDefinitions)[number]["code"];
export type MealPlanInterval = (typeof mealPlanDefinitions)[number]["interval"];

export function getMealPlanDefinition(code?: string) {
  return mealPlanDefinitions.find((plan) => plan.code === code);
}

export function mealPlanIntervalLabel(interval: MealPlanInterval) {
  return interval === "weekly" ? "semana" : interval === "monthly" ? "mês" : "trimestre";
}
