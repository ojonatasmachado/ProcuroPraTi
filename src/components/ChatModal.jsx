
import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, UserCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const ChatModal = ({ isOpen, onClose, currentUser, targetUser, messages = [], onSendMessage, onMarkAsRead }) => {
  const [newMessage, setNewMessage] = useState('');
  const scrollAreaRef = useRef(null);

  useEffect(() => {
    if (isOpen && scrollAreaRef.current) {
      const scrollViewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (scrollViewport) {
        scrollViewport.scrollTop = scrollViewport.scrollHeight;
      }
    }
  }, [messages, isOpen]);

  useEffect(() => {
    if (isOpen && messages.length > 0) {
      messages.forEach(msg => {
        if (msg.receiverId === currentUser.id && !msg.isRead) {
          onMarkAsRead(msg.chatId, msg.id);
        }
      });
    }
  }, [isOpen, messages, currentUser, onMarkAsRead]);

  const handleSend = () => {
    if (newMessage.trim() === '') return;
    const chatId = `${Math.min(currentUser.id, targetUser.id)}_${Math.max(currentUser.id, targetUser.id)}`;
    onSendMessage(chatId, newMessage);
    setNewMessage('');
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  if (!targetUser) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg w-[90vw] h-[80vh] flex flex-col bg-card border-border text-foreground p-0">
        <DialogHeader className="p-4 border-b border-border flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCircle className="h-8 w-8 text-primary" />
            <DialogTitle className="text-lg text-primary">{targetUser.name}</DialogTitle>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-muted-foreground hover:text-primary">
            <X className="h-5 w-5" />
          </Button>
        </DialogHeader>

        <ScrollArea ref={scrollAreaRef} className="flex-grow p-4">
          <div className="space-y-4">
            <AnimatePresence>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    "flex",
                    msg.senderId === currentUser.id ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[75%] p-3 rounded-lg text-sm",
                      msg.senderId === currentUser.id 
                        ? "bg-primary text-primary-foreground rounded-br-none ml-4" 
                        : "bg-input text-foreground rounded-bl-none mr-4"
                    )}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                    <span className={cn(
                      "text-xs mt-1 block",
                      msg.senderId === currentUser.id 
                        ? "text-primary-foreground/70 text-right" 
                        : "text-muted-foreground/70 text-left"
                    )}>
                      {formatTimestamp(msg.timestamp)}
                    </span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-border">
          <div className="flex w-full items-center gap-2">
            <Input
              type="text"
              placeholder="Digite sua mensagem..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              className="bg-input border-border flex-grow"
              autoFocus
            />
            <Button onClick={handleSend} className="gradient-bg hover:opacity-90 text-primary-foreground">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChatModal;
