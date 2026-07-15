
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { AlertOctagon, Send, X } from 'lucide-react';
import { motion } from 'framer-motion';

const FACES = [
  { value: 1, emoji: '😞' },
  { value: 2, emoji: '😕' },
  { value: 3, emoji: '😐' },
  { value: 4, emoji: '🙂' },
  { value: 5, emoji: '😄' },
];

const FeedbackModal = ({ isOpen, onClose, onSubmit, feedbackType }) => {
  const [text, setText] = useState('');
  const [rating, setRating] = useState(0);
  const [contact, setContact] = useState('');

  const handleSubmit = () => {
    if (feedbackType === 'rating' && rating === 0) {
      alert("Por favor, selecione uma avaliação.");
      return;
    }
    if (feedbackType === 'problem' && text.trim() === '') {
      alert("Por favor, escreva sua mensagem.");
      return;
    }
    onSubmit({ type: feedbackType, text, rating: feedbackType === 'rating' ? rating : null, contact: feedbackType === 'problem' ? contact : null });
    setText('');
    setRating(0);
    setContact('');
    onClose();
  };

  const getTitleAndIcon = () => {
    switch (feedbackType) {
      case 'problem': return { title: 'Relatar um Problema', icon: <AlertOctagon className="h-6 w-6 text-destructive" /> };
      case 'rating': return { title: 'Encontrou o que procurava?', icon: <span className="text-2xl leading-none">🙂</span> };
      default: return { title: 'Encontrou o que procurava?', icon: <span className="text-2xl leading-none">🙂</span> };
    }
  };

  const { title, icon } = getTitleAndIcon();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-card border-border text-foreground">
        <DialogHeader>
          <DialogTitle className="text-xl text-foreground flex items-center gap-2">
            {icon}
            {title}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {feedbackType === 'problem'
              ? "Descreva o problema encontrado para que possamos corrigi-lo."
              : "Sua opinião ajuda a melhorar a experiência de todo mundo."
            }
          </DialogDescription>
        </DialogHeader>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-4 space-y-4">
          {feedbackType === 'rating' && (
            <div className="flex justify-center gap-2">
              {FACES.map((face) => (
                <button
                  key={face.value}
                  type="button"
                  onClick={() => setRating(face.value)}
                  aria-label={`Nota ${face.value}`}
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-lg border transition-colors ${rating === face.value ? 'bg-primary/20 border-primary' : 'bg-popover border-border hover:border-primary/50'}`}
                >
                  {face.emoji}
                </button>
              ))}
            </div>
          )}

          <div>
            <Label htmlFor="feedbackText" className="block text-sm font-medium mb-2 text-muted-foreground">
              {feedbackType === 'problem' ? 'Descrição do Problema *' : 'Conte mais (opcional)'}
            </Label>
            <Textarea
              id="feedbackText"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={
                feedbackType === 'problem' ? "Detalhe o problema, incluindo passos para reproduzi-lo, se possível." 
                : "O que você mais gostou ou o que podemos melhorar?"
              }
              className="bg-input border-border min-h-[100px]"
              rows={4}
            />
          </div>

          {feedbackType === 'problem' && (
             <div>
              <Label htmlFor="contactInfo" className="block text-sm font-medium mb-2 text-muted-foreground">
                Seu Email ou Telefone (Opcional, para entrarmos em contato)
              </Label>
              <Input
                id="contactInfo"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="seu@email.com ou (XX) XXXXX-XXXX"
                className="bg-input border-border"
              />
            </div>
          )}
        </motion.div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} className="border-muted-foreground/50 text-muted-foreground hover:border-primary hover:text-primary">
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button onClick={handleSubmit} className="gradient-bg hover:opacity-90 text-primary-foreground">
            <Send className="h-4 w-4 mr-2" />
            Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FeedbackModal;
