
import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';
import { Bell, MessageSquare, PackageSearch } from 'lucide-react';
import { motion } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';

const NotificationDropdown = ({ notifications, onNotificationClick }) => {
  const unreadCount = notifications.length;

  const getIconForNotification = (type) => {
    if (type === 'new_response') return <PackageSearch className="h-4 w-4 text-primary mr-2" />;
    if (type === 'new_chat_message') return <MessageSquare className="h-4 w-4 text-blue-500 mr-2" />;
    return <Bell className="h-4 w-4 text-muted-foreground mr-2" />;
  };
  
  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const seconds = Math.round((now - new Date(timestamp)) / 1000);
    
    if (seconds < 60) return `${seconds}s atrás`;
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes}m atrás`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h atrás`;
    const days = Math.round(hours / 24);
    return `${days}d atrás`;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <motion.div
          animate={unreadCount > 0 ? { scale: [1, 1.1, 1], rotate: [0, -5, 5, -5, 0] } : {}}
          transition={unreadCount > 0 ? { duration: 0.5, repeat: Infinity, repeatDelay: 3 } : {}}
          className="relative"
        >
          <Button variant="ghost" size="icon" className="relative text-foreground hover:text-primary">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-green-500 text-xs text-white">
                {unreadCount}
              </span>
            )}
          </Button>
        </motion.div>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 bg-popover border-border text-popover-foreground p-0">
        <DropdownMenuLabel className="px-3 py-2 text-sm font-semibold">Notificações</DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-border" />
        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Nenhuma notificação nova.
            </div>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                onClick={() => onNotificationClick(notification)}
                className="cursor-pointer hover:!bg-accent/20 p-3 flex flex-col items-start"
              >
                <div className="flex items-center w-full">
                  {getIconForNotification(notification.type)}
                  <p className="text-xs text-popover-foreground flex-grow truncate">{notification.message}</p>
                </div>
                <span className="text-xs text-muted-foreground/80 mt-1 self-end">{formatTimeAgo(notification.timestamp)}</span>
              </DropdownMenuItem>
            ))
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationDropdown;
