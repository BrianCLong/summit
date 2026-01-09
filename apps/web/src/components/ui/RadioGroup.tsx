import * as React from 'react';

import { cn } from '@/lib/utils';

type RadioGroupContextValue = {
  value?: string;
  onValueChange?: (value: string) => void;
  name?: string;
  disabled?: boolean;
};

const RadioGroupContext = React.createContext<RadioGroupContextValue | null>(
  null
);

type RadioGroupProps = React.HTMLAttributes<HTMLDivElement> & {
  value?: string;
  onValueChange?: (value: string) => void;
  name?: string;
  disabled?: boolean;
};

const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
  ({ className, value, onValueChange, name, disabled, ...props }, ref) => (
    <RadioGroupContext.Provider
      value={{ value, onValueChange, name, disabled }}
    >
      <div
        ref={ref}
        role="radiogroup"
        className={cn('grid gap-2', className)}
        {...props}
      />
    </RadioGroupContext.Provider>
  )
);
RadioGroup.displayName = 'RadioGroup';

type RadioGroupItemProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'type' | 'checked' | 'defaultChecked' | 'onChange'
> & {
  value: string;
};

const RadioGroupItem = React.forwardRef<HTMLInputElement, RadioGroupItemProps>(
  ({ className, value, disabled, onChange, ...props }, ref) => {
    const context = React.useContext(RadioGroupContext);
    const checked = context?.value === value;
    const isDisabled = disabled ?? context?.disabled;
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      context?.onValueChange?.(value);
      onChange?.(event);
    };

    return (
      <span className="relative flex items-center">
        <input
          ref={ref}
          type="radio"
          name={context?.name}
          value={value}
          checked={checked}
          disabled={isDisabled}
          onChange={handleChange}
          className={cn(
            'h-4 w-4 rounded-full border border-primary text-primary focus:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
            className
          )}
          {...props}
        />
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary transition-opacity',
            checked ? 'opacity-100' : 'opacity-0'
          )}
        />
      </span>
    );
  }
);
RadioGroupItem.displayName = 'RadioGroupItem';

export { RadioGroup, RadioGroupItem };
