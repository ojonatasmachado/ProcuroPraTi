import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, CheckCheck, ImagePlus, Loader2, Send, UserCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';

const MessageReceipt = ({ message }) => {
  if (message.readAt || message.isRead) return <span className="inline-flex items-center gap-1"><CheckCheck className="h-3.5 w-3.5 text-accent-agile" />Lida</span>;
  if (message.deliveredAt) return <span className="inline-flex items-center gap-1"><CheckCheck className="h-3.5 w-3.5" />Entregue</span>;
  return <span className="inline-flex items-center gap-1"><Check className="h-3.5 w-3.5" />Enviada</span>;
};

const ChatModal = ({ isOpen, onClose, currentUser, targetUser, procura, messages = [], onSendMessage, onMarkAsRead }) => {
  const [newMessage, setNewMessage] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [shouldRestoreMessageFocus, setShouldRestoreMessageFocus] = useState(false);
  const [viewport, setViewport] = useState(null);
  const scrollAreaRef = useRef(null);
  const messagesEndRef = useRef(null);
  const imageInputRef = useRef(null);
  const messageInputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    const scrollToLatest = () => {
      if (scrollAreaRef.current) scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
      messagesEndRef.current?.scrollIntoView({ block: 'end' });
    };
    const frame = window.requestAnimationFrame(scrollToLatest);
    const timer = window.setTimeout(scrollToLatest, 120);
    return () => { window.cancelAnimationFrame(frame); window.clearTimeout(timer); };
  }, [messages, isOpen]);

  useEffect(() => {
    if (isOpen && messages.length > 0) {
      messages.forEach(message => {
        if (message.receiverId === currentUser.id && !message.isRead) onMarkAsRead(message.chatId, message.id);
      });
    }
  }, [isOpen, messages, currentUser, onMarkAsRead]);

  useEffect(() => () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
  }, [imagePreview]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const viewport = window.visualViewport;
    const updateViewport = () => setViewport(window.matchMedia('(max-width: 639px)').matches ? {
      height: Math.round(viewport?.height || window.innerHeight),
      top: Math.round(viewport?.offsetTop || 0),
    } : null);
    updateViewport();
    viewport?.addEventListener('resize', updateViewport);
    viewport?.addEventListener('scroll', updateViewport);
    window.addEventListener('resize', updateViewport);
    return () => {
      viewport?.removeEventListener('resize', updateViewport);
      viewport?.removeEventListener('scroll', updateViewport);
      window.removeEventListener('resize', updateViewport);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!shouldRestoreMessageFocus || isSending) return undefined;
    const timer = window.setTimeout(() => {
      messageInputRef.current?.focus({ preventScroll: true });
      setShouldRestoreMessageFocus(false);
    }, 60);
    return () => window.clearTimeout(timer);
  }, [isSending, shouldRestoreMessageFocus]);

  useEffect(() => {
    if (!isOpen || !viewport) return undefined;
    const scrollToLatest = () => {
      if (scrollAreaRef.current) scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
      messagesEndRef.current?.scrollIntoView({ block: 'end', behavior: 'auto' });
    };
    const frame = window.requestAnimationFrame(scrollToLatest);
    const firstTimer = window.setTimeout(scrollToLatest, 120);
    const finalTimer = window.setTimeout(scrollToLatest, 300);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(firstTimer);
      window.clearTimeout(finalTimer);
    };
  }, [isOpen, viewport?.height]);

  const clearImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview('');
    setImageFile(null);
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const handleImageSelected = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Arquivo inválido', description: 'Selecione uma imagem.', variant: 'destructive' });
      event.target.value = '';
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast({ title: 'Imagem muito grande', description: 'A foto original deve ter no máximo 15 MB.', variant: 'destructive' });
      event.target.value = '';
      return;
    }
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setShouldRestoreMessageFocus(true);
  };

  const openNativeImagePicker = () => {
    const restoreFocus = () => setShouldRestoreMessageFocus(true);
    window.addEventListener('focus', restoreFocus, { once: true });
    imageInputRef.current?.click();
  };

  const handleSend = async () => {
    const text = newMessage.trim();
    if (!text && !imageFile) return;
    setIsSending(true);
    try {
      const sent = await onSendMessage({ text, imageFile });
      if (sent) {
        setNewMessage(current => current === text ? '' : current);
        clearImage();
        setShouldRestoreMessageFocus(true);
      }
    } finally {
      setIsSending(false);
    }
  };

  const formatTimestamp = (timestamp) => new Date(timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  if (!targetUser) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent onOpenAutoFocus={(event) => event.preventDefault()} style={viewport ? { height: `${viewport.height}px`, maxHeight: `${viewport.height}px`, top: `${viewport.top}px`, transform: 'none' } : undefined} className="inset-x-0 top-0 h-[100dvh] w-full max-w-none translate-x-0 translate-y-0 rounded-none border-x-0 flex flex-col bg-card border-border text-foreground p-0 sm:left-[50%] sm:top-[50%] sm:h-[80dvh] sm:max-h-[720px] sm:w-[calc(100%-1.5rem)] sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-card sm:border-x">
        <DialogHeader className="border-b border-border p-4 pr-14 text-left">
          <div className="flex w-full items-start gap-2 text-left">
            <UserCircle className="h-8 w-8 text-primary" />
            <div className="min-w-0">
              <DialogTitle className="text-left text-lg text-foreground">{targetUser.name}</DialogTitle>
              {procura && <p className="mt-0.5 whitespace-normal break-words text-left text-xs leading-relaxed text-primary">{procura.partName} • {[procura.vehicleBrand, procura.vehicleModel, procura.vehicleYear].filter(Boolean).join(' ')}</p>}
            </div>
          </div>
        </DialogHeader>

        <ScrollArea ref={scrollAreaRef} className="flex-grow p-4">
          <div className="space-y-4">
            <AnimatePresence>
              {messages.map((message) => {
                const isMine = message.senderId === currentUser.id;
                return (
                  <motion.div key={message.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className={cn('flex', isMine ? 'justify-end' : 'justify-start')}>
                    <div className={cn('max-w-[82%] p-2.5 rounded-lg text-sm sm:max-w-[75%]', isMine ? 'bg-primary text-primary-foreground rounded-br-none ml-4' : 'bg-input text-foreground rounded-bl-none mr-4')}>
                      {message.imageUrl && (
                        <a href={message.imageUrl} target="_blank" rel="noreferrer" className="mb-2 block overflow-hidden rounded-md">
                          <img src={message.imageUrl} alt="Imagem enviada na conversa" onLoad={() => { if (scrollAreaRef.current) scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight; }} className="max-h-64 w-full object-cover" />
                        </a>
                      )}
                      {message.text && <p className="whitespace-pre-wrap break-words px-0.5">{message.text}</p>}
                      <span className={cn('mt-1.5 flex items-center gap-1.5 text-[11px]', isMine ? 'justify-end text-primary-foreground/75' : 'justify-start text-muted-foreground/80')}>
                        {formatTimestamp(message.timestamp)}
                        {isMine && <MessageReceipt message={message} />}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            <div ref={messagesEndRef} aria-hidden="true" />
          </div>
        </ScrollArea>

        <div className="border-t border-border p-3 sm:p-4">
          {imagePreview && (
            <div className="relative mb-3 w-fit max-w-full rounded-xl border border-border bg-input p-2">
              <img src={imagePreview} alt="Imagem pronta para envio" className="h-24 max-w-48 rounded-lg object-cover" />
              <Button type="button" size="icon" variant="outline" onClick={clearImage} disabled={isSending} className="absolute -right-2 -top-2 h-7 w-7 rounded-full bg-card" aria-label="Remover imagem"><X className="h-3.5 w-3.5" /></Button>
            </div>
          )}
          <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageSelected} onCancel={() => setShouldRestoreMessageFocus(true)} className="sr-only" />
          <div className="flex w-full items-center gap-2">
            <Button type="button" size="icon" variant="outline" onPointerDown={(event) => event.preventDefault()} onClick={openNativeImagePicker} disabled={isSending} className="h-11 w-11 shrink-0 border-border text-foreground" aria-label="Adicionar imagem"><ImagePlus className="h-5 w-5 text-primary" /></Button>
            <Input ref={messageInputRef} type="text" placeholder="Digite sua mensagem..." value={newMessage} onFocus={() => { window.requestAnimationFrame(() => messagesEndRef.current?.scrollIntoView({ block: 'end', behavior: 'auto' })); window.setTimeout(() => messagesEndRef.current?.scrollIntoView({ block: 'end', behavior: 'auto' }), 180); }} onChange={(event) => setNewMessage(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void handleSend(); } }} className="min-w-0 flex-grow bg-input border-border" autoFocus />
            <Button type="button" onPointerDown={(event) => event.preventDefault()} onClick={() => void handleSend()} disabled={isSending || (!newMessage.trim() && !imageFile)} className="shrink-0 gradient-bg hover:opacity-90 text-primary-foreground" aria-label="Enviar mensagem">
              {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChatModal;
