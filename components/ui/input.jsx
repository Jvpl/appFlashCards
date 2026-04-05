import * as React from 'react';
import { TextInput } from 'react-native';
import { cn } from '../../lib/utils';

const Input = React.forwardRef(({ className, placeholderClassName, ...props }, ref) => {
  return (
    <TextInput
      ref={ref}
      className={cn(
        'web:flex h-10 native:h-12 web:w-full rounded-button border border-border',
        'bg-surface px-3 web:py-2 text-base text-[#E6EDF3]',
        'web:ring-offset-background placeholder:text-[#6E7681]',
        'web:focus-visible:outline-none web:focus-visible:ring-2',
        'web:focus-visible:ring-primary web:focus-visible:ring-offset-2',
        props.disabled && 'opacity-50 web:cursor-not-allowed',
        className
      )}
      placeholderTextColor="#6E7681"
      {...props}
    />
  );
});
Input.displayName = 'Input';

export { Input };
