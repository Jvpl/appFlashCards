import * as React from 'react';
import { Pressable } from 'react-native';
import { cn } from '../../lib/utils';
import { Text, TextClassContext } from './text';

const buttonVariants = {
  default: 'bg-primary web:ring-offset-background web:transition-colors web:focus-visible:outline-none web:focus-visible:ring-2 web:focus-visible:ring-ring web:focus-visible:ring-offset-2',
  destructive: 'bg-danger web:ring-offset-background web:transition-colors',
  outline: 'border border-border bg-transparent web:transition-colors',
  secondary: 'bg-elevated web:ring-offset-background web:transition-colors',
  ghost: 'web:hover:bg-elevated',
  link: 'web:underline-offset-4 web:hover:underline web:focus-visible:ring-0',
};

const buttonSizeVariants = {
  default: 'h-10 px-4 py-2 native:h-12 native:px-5 native:py-3',
  sm: 'h-9 rounded-button px-3',
  lg: 'h-11 rounded-button px-8 native:h-14',
  icon: 'h-10 w-10',
};

const buttonTextVariants = {
  default: 'text-background web:whitespace-nowrap',
  destructive: 'text-white web:whitespace-nowrap',
  outline: 'text-[#E6EDF3] web:whitespace-nowrap',
  secondary: 'text-[#E6EDF3] web:whitespace-nowrap',
  ghost: 'text-[#E6EDF3] web:whitespace-nowrap',
  link: 'text-primary web:whitespace-nowrap',
};

const Button = React.forwardRef(
  ({ className, variant = 'default', size = 'default', asChild = false, ...props }, ref) => {
    return (
      <TextClassContext.Provider
        value={cn(
          props.disabled && 'web:pointer-events-none opacity-50',
          buttonTextVariants[variant]
        )}
      >
        <Pressable
          className={cn(
            'flex-row items-center justify-center rounded-button',
            buttonVariants[variant],
            buttonSizeVariants[size],
            props.disabled && 'opacity-50 web:pointer-events-none',
            className
          )}
          ref={ref}
          role="button"
          {...props}
        />
      </TextClassContext.Provider>
    );
  }
);
Button.displayName = 'Button';

export { Button };
