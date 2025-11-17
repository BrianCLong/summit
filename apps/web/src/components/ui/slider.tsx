import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SliderProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'type' | 'value' | 'defaultValue' | 'max' | 'min' | 'step'
  > {
  value?: number[];
  defaultValue?: number[];
  onValueChange?: (value: number[]) => void;
  max?: number;
  min?: number;
  step?: number;
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  (
    {
      className,
      value,
      defaultValue,
      onValueChange,
      onChange,
      max = 100,
      min = 0,
      step = 1,
      ...props
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = React.useState(
      value?.[0] ?? defaultValue?.[0] ?? min
    );

    const currentValue = value?.[0] ?? internalValue;

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = Number(event.target.value);
      setInternalValue(newValue);
      if (onChange) {
        onChange(event);
      }
      if (onValueChange) {
        onValueChange([newValue]);
      }
    };

    return (
      <input
        type="range"
        className={cn(
          'w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700',
          className
        )}
        ref={ref}
        value={currentValue}
        onChange={handleChange}
        max={max}
        min={min}
        step={step}
        {...props}
      />
    );
  }
);
Slider.displayName = 'Slider';

export { Slider };
