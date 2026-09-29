import React from "react";
import type { AnimationSettings } from "./animationSettings";

const SliderField: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  displayValue: string;
  onChange: (value: number) => void;
}> = ({ label, value, min, max, step, displayValue, onChange }) => {
  const percent = ((value - min) / (max - min)) * 100;

  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span className="field-box field-box--slider">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          style={{
            background: `linear-gradient(to right, #e34c81 ${percent}%, #f5c1d0 ${percent}%)`,
          }}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <span className="field-value">{displayValue}</span>
      </span>
    </label>
  );
};

// The 5 animation-tuning fields, rendered in order (margin, stretch, speed,
// easing-in, easing-out) so that placed right after the name field in the
// parent's 2-column grid, they fall into the same row pairing as the
// reference design (public/ref/UIEXemple-WIthSettings.svg).
export const SettingsFields: React.FC<{
  settings: AnimationSettings;
  onChange: (next: AnimationSettings) => void;
}> = ({ settings, onChange }) => {
  const set = <K extends keyof AnimationSettings>(
    key: K,
    value: AnimationSettings[K],
  ) => onChange({ ...settings, [key]: value });

  return (
    // Wrapped so the whole group can be hidden as a unit on mobile (the
    // animation settings aren't exposed there) while still participating
    // in the parent's grid on desktop via `display: contents`.
    <div className="settings-fields">
      <SliderField
        label="Marges"
        value={settings.margin}
        min={0}
        max={200}
        step={5}
        displayValue={`${settings.margin}px`}
        onChange={(v) => set("margin", v)}
      />
      <SliderField
        label="Stretch intensity"
        value={settings.stretchPeak}
        min={1}
        max={2.5}
        step={0.05}
        displayValue={`${Math.round(settings.stretchPeak * 100)}%`}
        onChange={(v) => set("stretchPeak", v)}
      />
      <SliderField
        label="Speed"
        value={settings.sequenceDurationSeconds * 1000}
        min={200}
        max={1500}
        step={10}
        displayValue={`${Math.round(settings.sequenceDurationSeconds * 1000)}ms`}
        onChange={(v) => set("sequenceDurationSeconds", v / 1000)}
      />
      <SliderField
        label="Easing - in"
        value={settings.easingInPower}
        min={1}
        max={8}
        step={0.5}
        displayValue={settings.easingInPower.toString()}
        onChange={(v) => set("easingInPower", v)}
      />
      <SliderField
        label="Easing - out"
        value={settings.easingOutPower}
        min={1}
        max={8}
        step={0.5}
        displayValue={settings.easingOutPower.toString()}
        onChange={(v) => set("easingOutPower", v)}
      />
    </div>
  );
};
