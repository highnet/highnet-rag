'use client';

import { type ComponentProps } from 'react';
import { Collapsible as CollapsiblePrimitive } from 'radix-ui';

type CollapsibleProps = ComponentProps<typeof CollapsiblePrimitive.Root>;

const Collapsible = (props: CollapsibleProps) => {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />;
};

type CollapsibleTriggerProps = ComponentProps<typeof CollapsiblePrimitive.CollapsibleTrigger>;

const CollapsibleTrigger = (props: CollapsibleTriggerProps) => {
  return <CollapsiblePrimitive.CollapsibleTrigger data-slot="collapsible-trigger" {...props} />;
};

type CollapsibleContentProps = ComponentProps<typeof CollapsiblePrimitive.CollapsibleContent>;

const CollapsibleContent = (props: CollapsibleContentProps) => {
  return <CollapsiblePrimitive.CollapsibleContent data-slot="collapsible-content" {...props} />;
};

export { Collapsible, CollapsibleContent, CollapsibleTrigger };
