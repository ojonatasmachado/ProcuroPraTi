
import React, { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { MessageSquare, Users, Building2, X } from 'lucide-react';
import { motion } from 'framer-motion';

const ChatListModal = ({ isOpen, onClose, currentUser, chats, users, companies, onOpenChat }) => {
  const userChats = useMemo(() => {
    const chatList = [];
    
    Object.entries(chats).forEach(([chatId, messages]) => {
      if (messages.length === 0) return;
      
      const participantIds = chatId.split('_');
      const otherUserId = participantIds.find(id => id !== currentUser.id);
      
      if (!otherUserId) return;
      
      const otherUser = users.find(u => u.id === otherUserId) || companies.find(c => c.id === otherUserId);
      if (!otherUser) return;
      
      const lastMessage = messages[messages.length - 1];
      const unreadCount = messages.filter(msg => 
        msg.receiverId === currentUser.id && !msg.isRead
      ).length;
      
      chatList.push({
        chatId,
        otherUser,
        lastMessage,
        unreadCount,
        timestamp: new Date(lastMessage.timestamp).getTime()
      });
    });
    
    return chatList.sort((a, b) => b.timestamp - a.timestamp);
  }, [chats, currentUser, users, companies]);

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md w-[90vw] h-[80vh] flex flex-col bg-card border-border text-foreground p-0">
        <DialogHeader className="p-4 border-b border-border flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary" />
            <DialogTitle className="text-lg text-foreground">Conversas</DialogTitle>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-muted-foreground hover:text-primary">
            <X className="h-5 w-5" />
          </Button>
        </DialogHeader>

        <ScrollArea className="flex-grow p-4">
          {userChats.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Nenhuma conversa ainda</h3>
              <p className="text-muted-foreground text-sm">
                Suas conversas aparecerão aqui quando você iniciar um chat.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {userChats.map((chat, index) => (
                <motion.div
                  key={chat.chatId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                >
                  <Card 
                    className="cursor-pointer hover:bg-accent/50 transition-colors border-border/50"
                    onClick={() => onOpenChat(chat.otherUser.id)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="flex-shrink-0">
                            {users.some(u => u.id === chat.otherUser.id) ? (
                              <Users className="h-8 w-8 text-primary" />
                            ) : (
                              <Building2 className="h-8 w-8 text-primary" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-foreground truncate">
                              {chat.otherUser.name}
                            </h4>
                            <p className="text-sm text-muted-foreground truncate">
                              {chat.lastMessage.senderId === currentUser.id ? 'Você: ' : ''}
                              {chat.lastMessage.text}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-xs text-muted-foreground">
                            {formatTime(chat.timestamp)}
                          </span>
                          {chat.unreadCount > 0 && (
                            <span className="bg-green-500 text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center">
                              {chat.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default ChatListModal;
