import * as React from 'react';

// Re-export all Lucide icons behind a single module so we can swap libraries later if desired.
export * from 'lucide-react';

export type IconDefaults = {
  strokeWidth?: number;
  className?: string;
  color?: string;
};

const defaultIconProps: IconDefaults = {
  strokeWidth: 1.75,
  color: 'currentColor',
};

// Higher-order helper to apply consistent defaults to any icon component if you want to opt in.
export function withIconDefaults<T extends { className?: string; strokeWidth?: number; color?: string }>(
  IconComponent: React.ComponentType<T>
) {
  return function IconWithDefaults(props: T) {
    return <IconComponent {...(defaultIconProps as T)} {...props} />;
  };
}

// Generic wrapper to render any passed icon with consistent defaults.
export function Icon<T extends { className?: string; strokeWidth?: number; color?: string }>(
  props: React.PropsWithChildren<{
    as: React.ComponentType<T>;
  } & T>
) {
  const { as: Comp, ...rest } = props as any;
  return <Comp {...defaultIconProps as any} {...rest as any} />;
}


