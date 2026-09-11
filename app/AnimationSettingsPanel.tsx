import React from "react";
import type { AnimationSettings } from "./animationSettings";

type Props = {
  settings: AnimationSettings;
  defaults: AnimationSettings;
  onChange: (next: AnimationSettings) => void;
  onClose: () => void;
};

const Slider: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  displayValue: string;
  help?: string;
  onChange: (value: number) => void;
}> = ({ label, value, min, max, step, displayValue, help, onChange }) => (
  <label className="settings-field">
    <div className="settings-field-header">
      <span>{label}</span>
      <span className="settings-value">{displayValue}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
    />
    {help && <span className="settings-help">{help}</span>}
  </label>
);

export const AnimationSettingsPanel: React.FC<Props> = ({
  settings,
  defaults,
  onChange,
  onClose,
}) => {
  const set = <K extends keyof AnimationSettings>(
    key: K,
    value: AnimationSettings[K],
  ) => onChange({ ...settings, [key]: value });

  return (
    <div className="settings-panel">
      <div className="settings-panel-header">
        <h2>Réglages de l&apos;animation</h2>
        <button
          type="button"
          className="settings-close"
          onClick={onClose}
          aria-label="Fermer"
        >
          ×
        </button>
      </div>

      <Slider
        label="Marges (gauche / droite)"
        value={settings.margin}
        min={0}
        max={200}
        step={5}
        displayValue={`${settings.margin}px`}
        help="Le mot touche toujours ces deux marges une fois l'animation terminée"
        onChange={(v) => set("margin", v)}
      />

      <Slider
        label="Intensité du stretch (pic)"
        value={settings.stretchPeak}
        min={1}
        max={2.5}
        step={0.05}
        displayValue={`${Math.round(settings.stretchPeak * 100)}%`}
        onChange={(v) => set("stretchPeak", v)}
      />

      <Slider
        label="Vitesse de l'animation"
        value={settings.sequenceDurationSeconds * 1000}
        min={200}
        max={1500}
        step={10}
        displayValue={`${Math.round(settings.sequenceDurationSeconds * 1000)} ms`}
        help="Plus petit = plus rapide"
        onChange={(v) => set("sequenceDurationSeconds", v / 1000)}
      />

      <Slider
        label="Easing — sortie (narrow → pic)"
        value={settings.easingOutPower}
        min={1}
        max={8}
        step={0.5}
        displayValue={settings.easingOutPower.toString()}
        help="Plus haut = ralenti plus marqué en arrivant au pic"
        onChange={(v) => set("easingOutPower", v)}
      />

      <Slider
        label="Easing — entrée (pic → repos)"
        value={settings.easingInPower}
        min={1}
        max={8}
        step={0.5}
        displayValue={settings.easingInPower.toString()}
        help="Plus haut = démarrage plus lent en quittant le pic"
        onChange={(v) => set("easingInPower", v)}
      />

      <button
        type="button"
        className="settings-reset"
        onClick={() => onChange(defaults)}
      >
        Réinitialiser
      </button>
    </div>
  );
};
