import * as React from 'react';
import { Text as RNText } from 'react-native';
import { cn } from '../../lib/utils';

const TextClassContext = React.createContext(undefined);

const Text = React.forwardRef(({ className, asChild = false, ...props }, ref) => {
  const textClass = React.useContext(TextClassContext);
  return (
    <RNText
      className={cn('text-base text-[#E6EDF3] web:select-text', textClass, className)}
      ref={ref}
      {...props}
    />
  );
});
Text.displayName = 'Text';

export { Text, TextClassContext };
