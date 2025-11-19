'use client';

import * as ToggleGroupPrimitive from '@radix-ui/react-toggle-group';
import type { VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { toggleVariants } from '@/components/ui/toggle';
import { cn } from '@/lib/utils';

const ToggleGroupContext = React.createContext<
  VariantProps<typeof toggleVariants> & {
    spacing?: number;
    direction?: 'horizontal' | 'vertical';
  }
>({
  size: 'default',
  variant: 'default',
  spacing: 0,
  direction: 'horizontal',
});

function ToggleGroup({
  className,
  variant,
  size,
  spacing = 0,
  direction = 'horizontal',
  children,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Root> &
  VariantProps<typeof toggleVariants> & {
    spacing?: number;
    direction?: 'horizontal' | 'vertical';
  }) {
  return (
    <ToggleGroupPrimitive.Root
      data-slot='toggle-group'
      data-variant={variant}
      data-size={size}
      data-spacing={spacing}
      data-direction={direction}
      style={{ '--gap': spacing } as React.CSSProperties}
      className={cn(
        'group/toggle-group flex w-fit items-center gap-[--spacing(var(--gap))] rounded-md data-[spacing=default]:data-[variant=outline]:shadow-xs data-[direction=vertical]:flex-col',
        className,
      )}
      {...props}
    >
      <ToggleGroupContext.Provider value={{ variant, size, spacing, direction }}>
        {children}
      </ToggleGroupContext.Provider>
    </ToggleGroupPrimitive.Root>
  );
}

function ToggleGroupItem({
  className,
  children,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Item> & VariantProps<typeof toggleVariants>) {
  const context = React.useContext(ToggleGroupContext);

  return (
    <ToggleGroupPrimitive.Item
      data-slot='toggle-group-item'
      data-variant={context.variant || variant}
      data-size={context.size || size}
      data-spacing={context.spacing}
      data-direction={context.direction}
      className={cn(
        toggleVariants({
          variant: context.variant || variant,
          size: context.size || size,
        }),
        'w-auto min-w-0 shrink-0 px-3 focus:z-10 focus-visible:z-10 data-[spacing=0]:data-[direction=horizontal]:rounded-none data-[spacing=0]:data-[direction=vertical]:rounded-none data-[spacing=0]:data-[direction=vertical]:border-t-0 data-[spacing=0]:data-[direction=horizontal]:border-l-0 data-[spacing=0]:data-[direction=horizontal]:shadow-none data-[spacing=0]:data-[direction=vertical]:shadow-none data-[spacing=0]:data-[direction=horizontal]:last:rounded-r-md data-[spacing=0]:data-[direction=vertical]:last:rounded-b-md data-[spacing=0]:data-[direction=vertical]:first:rounded-t-md data-[spacing=0]:data-[direction=horizontal]:first:rounded-l-md data-[spacing=0]:data-[direction=vertical]:data-[variant=outline]:first:border-t data-[spacing=0]:data-[direction=horizontal]:data-[variant=outline]:first:border-l',
        className,
      )}
      {...props}
    >
      {children}
    </ToggleGroupPrimitive.Item>
  );
}

export { ToggleGroup, ToggleGroupItem };
