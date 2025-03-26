'use client';

import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2, type LucideProps } from 'lucide-react';

const spinnerVariants = cva('animate-spin text-muted-foreground', {
    variants: {
        size: {
            default: 'h-4 w-4',
            sm: 'h-3 w-3',
            lg: 'h-6 w-6',
            xl: 'h-8 w-8',
        },
    },
    defaultVariants: {
        size: 'default',
    },
});

export interface SpinnerProps extends VariantProps<typeof spinnerVariants>, Omit<LucideProps, 'size'> { }

export function Spinner({ className, size, ...props }: SpinnerProps) {
    return (
        <Loader2 className={cn(spinnerVariants({ size }), className)} {...props} />
    );
} 