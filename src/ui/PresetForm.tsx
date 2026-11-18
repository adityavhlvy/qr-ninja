import type { Preset } from "../../shared/payloads";
import { areaClass, fieldClass } from "./controls";

interface Props {
  preset: Preset;
  values: Record<string, string>;
  onChange: (name: string, value: string) => void;
  error: string | null;
}

export function PresetForm({ preset, values, onChange, error }: Props) {
  return (
    <div className="grid gap-5">
      {preset.fields.map((field) => {
        const id = `${preset.id}-${field.name}`;
        return (
          <div key={field.name} className="grid gap-2">
            <label htmlFor={id} className="label">
              {field.label}
              {field.required ? <span className="text-sea"> *</span> : null}
            </label>

            {field.options ? (
              <select
                id={id}
                className={fieldClass}
                value={values[field.name] ?? field.defaultValue ?? ""}
                onChange={(event) => onChange(field.name, event.target.value)}
              >
                {field.options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : field.type === "textarea" ? (
              <textarea
                id={id}
                className={areaClass}
                value={values[field.name] ?? ""}
                placeholder={field.placeholder}
                onChange={(event) => onChange(field.name, event.target.value)}
              />
            ) : (
              <input
                id={id}
                className={fieldClass}
                type={field.type ?? "text"}
                value={values[field.name] ?? ""}
                placeholder={field.placeholder}
                autoComplete="off"
                spellCheck={false}
                onChange={(event) => onChange(field.name, event.target.value)}
              />
            )}

            {field.hint ? <p className="text-xs text-mute">{field.hint}</p> : null}
          </div>
        );
      })}

      {error ? (
        <p role="alert" className="border-l-2 border-sea pl-3 text-sm text-ink">
          {error}
        </p>
      ) : null}
    </div>
  );
}
