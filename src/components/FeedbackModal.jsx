
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Star, AlertOctagon, Send, X } from 'lucide-react';
import { motion } from 'framer-motion';

const FeedbackModal = ({ isOpen, onClose, onSubmit, feedbackType }) => {
  const [text, setText] = useState('');
  const [rating, setRating] = useState(0); 
  const [contact, setContact] = useState('');

  const handleSubmit = () => {
    if (feedbackType === 'rating' && rating === 0) {
      alert("Por favor, selecione uma avaliação.");
      return;
    }
    if (text.trim() === '') {
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
      case 'rating': return { title: 'Avaliar Plataforma', icon: <Star className="h-6 w-6 text-yellow-500" /> };
      default: return { title: 'Avaliar Plataforma', icon: <Star className="h-6 w-6 text-yellow-500" /> };
    }
  };

  const { title, icon } = getTitleAndIcon();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-card border-border text-foreground">
        <DialogHeader>
          <DialogTitle className="text-xl text-primary flex items-center gap-2">
            {icon}
            {title}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {feedbackType === 'problem' 
              ? "Descreva o problema encontrado para que possamos corrigi-lo."
              : "Sua opinião é muito importante para nós!"
            }
          </DialogDescription>
        </DialogHeader>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-4 space-y-4">
          {feedbackType === 'rating' && (
            <div>
              <Label className="block text-sm font-medium mb-2 text-muted-foreground">Sua Avaliação (de 1 a 5 estrelas)</Label>
              <div className="flex justify-center space-x-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-8 w-8 cursor-pointer transition-colors ${star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground hover:text-yellow-300'}`}
                    onClick={() => setRating(star)}
                  />
                ))}
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="feedbackText" className="block text-sm font-medium mb-2 text-muted-foreground">
              {feedbackType === 'problem' ? 'Descrição do Problema *' : 'Seu Comentário (Opcional)'}
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
