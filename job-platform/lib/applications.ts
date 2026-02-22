export const APPLICATION_STAGES = [
  "APPLIED",
  "INVITED",
  "INTERVIEWS",
  "HIRED",
  "REJECTED",
] as const;

export type ApplicationStageValue = (typeof APPLICATION_STAGES)[number];

export const APPLICATION_STAGE_LABELS: Record<ApplicationStageValue, string> = {
  APPLIED: "Beworben",
  INVITED: "Eingeladen",
  INTERVIEWS: "Interviews",
  HIRED: "Eingestellt",
  REJECTED: "Abgelehnt",
};

export function isApplicationStage(value: string): value is ApplicationStageValue {
  return APPLICATION_STAGES.includes(value as ApplicationStageValue);
}
