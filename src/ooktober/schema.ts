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
  // True when the raw input matched a profanity/insult in any supported
  // language — all text elements (word + both static captions) are hidden
  // while this is true.
  isBlocked: boolean;
};
