import { z } from "zod";

export const ooktoberSchema = z.object({
  text: z.string(),
  // Manual overrides for the dynamic word. All optional — undefined falls
  // back to the calibrated defaults in constants.ts.
  margin: z.number().optional(),
  stretchPeak: z.number().optional(),
  sequenceDurationSeconds: z.number().optional(),
  easingOutPower: z.number().optional(),
  easingInPower: z.number().optional(),
});

export type OoktoberInputProps = z.infer<typeof ooktoberSchema>;

export type OoktoberResolvedProps = OoktoberInputProps & {
  displayText: string;
  insertIndex: number | null;
  hasAnimation: boolean;
  fontSize: number;
  // Resolved letter-spacing in px. Normally the standard -7% tracking at
  // `fontSize`; widened instead of growing `fontSize` further once the
  // word is short enough to hit the 8-character size cap, so it still
  // spans exactly from margin to margin.
  letterSpacing: number;
};
