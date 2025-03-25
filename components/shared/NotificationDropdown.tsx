'use client'
import { useState } from 'react';
import { Bell, CheckCircle, RefreshCw, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications } from '@/providers/notification-provider';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export default function NotificationDropdown() {
    const {
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        loading,
        sseConnected,
        reconnectSSE,
        error
    } = useNotifications();
    const [open, setOpen] = useState(false);
    const [isReconnecting, setIsReconnecting] = useState(false);

    const handleMarkAsRead = (id: string) => {
        markAsRead(id);
    };

    const handleMarkAllAsRead = () => {
        markAllAsRead();
    };

    const handleReconnect = () => {
        setIsReconnecting(true);
        // Reconnect SSE
        reconnectSSE();
        // Reset reconnecting state after a short delay
        setTimeout(() => {
            setIsReconnecting(false);
        }, 1000);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <div className="flex items-center">
                {/* Connection status indicator */}
                {!sseConnected && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleReconnect}
                                className="relative text-white mr-1"
                                disabled={isReconnecting}
                            >
                                {isReconnecting ? (
                                    <RefreshCw size={16} className="animate-spin" />
                                ) : (
                                    <AlertCircle size={16} className="text-red-500" />
                                )}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            Notifications offline. Click to reconnect
                        </TooltipContent>
                    </Tooltip>
                )}

                <PopoverTrigger asChild>
                    <div className="relative">
                        <Button variant="ghost" size="icon" className="text-white relative">
                            <Bell size={24} fill='none' stroke='white' className="h-[1.2rem] w-[1.2rem]" />
                            {unreadCount > 0 && (
                                <Badge
                                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500"
                                    variant="destructive"
                                >
                                    {unreadCount}
                                </Badge>
                            )}
                        </Button>
                    </div>
                </PopoverTrigger>
            </div>
            <PopoverContent className="w-80 p-0">
                <div className="flex items-center justify-between p-4 bg-zinc-100">
                    <h3 className="font-semibold">Notifications</h3>
                    <div className="flex items-center gap-2">
                        {!sseConnected && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleReconnect}
                                disabled={isReconnecting}
                                className="h-7 px-2 text-xs"
                            >
                                {isReconnecting ? (
                                    <RefreshCw size={12} className="mr-1 animate-spin" />
                                ) : (
                                    <RefreshCw size={12} className="mr-1" />
                                )}
                                Reconnect
                            </Button>
                        )}
                        {unreadCount > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleMarkAllAsRead}
                                className="h-7 text-xs"
                            >
                                Mark all as read
                            </Button>
                        )}
                    </div>
                </div>
                <Separator />
                <ScrollArea className="h-[400px]">
                    {loading && <div className="flex justify-center p-4">Loading...</div>}

                    {error && !loading && (
                        <div className="flex flex-col items-center justify-center p-4 text-center bg-red-50">
                            <AlertCircle className="h-6 w-6 text-red-500 mb-2" />
                            <p className="text-red-600 text-sm">{error}</p>
                        </div>
                    )}

                    {!loading && !error && notifications.length === 0 && (
                        <div className="flex flex-col items-center justify-center p-6 text-center">
                            <Bell className="h-12 w-12 text-gray-300 mb-2" />
                            <p className="text-gray-500">No notifications yet</p>
                        </div>
                    )}

                    {!loading && notifications.map((notification) => (
                        <div key={notification._id} className={`p-4 hover:bg-gray-50 transition-colors ${notification.read ? '' : 'bg-blue-50'}`}>
                            <div className="flex items-start gap-3">
                                <Avatar className="h-10 w-10">
                                    {notification.sender.profilePicture ? (
                                        <AvatarImage src={notification.sender.profilePicture} alt={notification.sender.name} />
                                    ) : (
                                        <AvatarFallback>
                                            {notification.sender.name.substring(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    )}
                                </Avatar>
                                <div className="flex-1">
                                    <div className="flex justify-between">
                                        <p className="font-medium text-sm">{notification.title}</p>
                                        <div className="flex items-center">
                                            {!notification.read && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleMarkAsRead(notification._id)}
                                                    className="h-6 w-6 text-gray-400 hover:text-blue-500"
                                                >
                                                    <CheckCircle className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-gray-600 text-xs mt-1">{notification.message}</p>
                                    <p className="text-gray-400 text-xs mt-2">
                                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
} 