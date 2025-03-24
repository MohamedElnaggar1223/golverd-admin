'use client';

import { useState, useCallback } from 'react';

export interface ToastProps {
    id?: string;
    title: string;
    description?: string;
    variant?: 'default' | 'destructive';
    duration?: number;
}

export function useToast() {
    const [toasts, setToasts] = useState<ToastProps[]>([]);

    const toast = useCallback(
        ({ title, description, variant = 'default', duration = 3000 }: ToastProps) => {
            const id = Math.random().toString(36).slice(2, 9);

            setToasts((prev) => [...prev, { id, title, description, variant }]);

            setTimeout(() => {
                setToasts((prev) => prev.filter((toast) => toast.id !== id));
            }, duration);

            return id;
        },
        []
    );

    const dismiss = useCallback((id: string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    return {
        toasts,
        toast,
        dismiss,
    };
} 