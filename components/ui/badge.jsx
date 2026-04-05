import * as React from 'react';
import { View } from 'react-native';
import { cn } from '../../lib/utils';
import { Text } from './text';

const badgeVariants = {
  default: 'bg-primary',
  secondary: 'bg-elevated',
  destructive: 'bg-danger',
  outline: 'border border-border',
};

const badgeTextVariants = {
  default: 'text-background',
  secondary: 'text-[#E6EDF3]',
  destructive: 'text-white',
  outline: 'text-[#E6EDF3]',
};

function Badge({ className, textClassName, variant = 'default', label, ...props }) {
  return (
    <View
      className={cn(
        'inline-flex flex-row items-center rounded-chip px-2.5 py-0.5',
        badgeVariants[variant],
        className
      )}
      {...props}
    >
      <Text className={cn('text-xs font-semibold', badgeTextVariants[variant], textClassName)}>
        {label}
      </Text>
    </View>
  );
}

export { Badge };
