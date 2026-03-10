import * as React from "react";

type RadioGroupContextValue = {
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  name: string;
};

const RadioGroupContext = React.createContext<RadioGroupContextValue | null>(null);

function RadioGroup({
  value,
  onValueChange,
  disabled,
  className,
  children,
}: {
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const groupName = React.useId();

  return (
    <RadioGroupContext.Provider value={{ value, onValueChange, disabled, name: groupName }}>
      <div role="radiogroup" className={className}>
        {children}
      </div>
    </RadioGroupContext.Provider>
  );
}

function RadioGroupItem({
  value,
  id,
  className,
}: {
  value: string;
  id?: string;
  className?: string;
}) {
  const context = React.useContext(RadioGroupContext);

  if (!context) {
    throw new Error("RadioGroupItem must be used within a RadioGroup");
  }

  return (
    <input
      type="radio"
      id={id}
      value={value}
      name={context.name}
      checked={context.value === value}
      onChange={() => context.onValueChange?.(value)}
      disabled={context.disabled}
      className={className}
    />
  );
}

export { RadioGroup, RadioGroupItem };
