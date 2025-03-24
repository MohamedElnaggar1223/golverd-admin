'use client';

import { X } from 'lucide-react';
import { useToast } from './use-toast';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export function Toaster() {
    const { toasts } = useToast();
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) return null;

    return createPortal(
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm">
            {toasts.map((toast, index) => (
                <div
                    key={index}
                    className={`rounded-md p-4 shadow-md transition-all ${toast.variant === 'destructive'
                            ? 'bg-red-600 text-white'
                            : 'bg-white text-gray-900'
                        }`}
                >
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="font-medium">{toast.title}</h3>
                            {toast.description && (
                                <p className="text-sm mt-1">{toast.description}</p>
                            )}
                        </div>
                        <button className="text-gray-400 hover:text-gray-600">
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            ))}
        </div>,
        document.body
    );
} 