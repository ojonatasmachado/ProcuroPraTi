
import React, { useState } from 'react';
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Lightbulb, Send } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from '@/components/ui/use-toast';

const SuggestionPopup = ({ isOpen, onClose, onSubmit }) => {
  const [suggestionText, setSuggestionText] = useState('');

  const handleSubmit = () => {
    if (suggestionText.trim() === '') {
      toast({ title: 'Escreva sua sugestão', description: 'Conte sua ideia antes de enviar.', variant: 'destructive' });
      return;
    }
    onSubmit(suggestionText);
    setSuggestionText('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-card border-border text-foreground">
        <DialogHeader>
          <DialogTitle className="text-xl text-foreground flex items-center gap-2">
            <Lightbulb className="h-6 w-6 text-warning" />
            Queremos Ouvir Você!
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Ajude-nos a melhorar a plataforma. Tem alguma sugestão ou ideia para tornar a experiência ainda melhor?
          </DialogDescription>
        </DialogHeader>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-4">
          <div>
            <Label htmlFor="suggestionText" className="block text-sm font-medium mb-2 text-muted-foreground">
              Sua Sugestão:
            </Label>
            <Textarea
              id="suggestionText"
              value={suggestionText}
              onChange={(e) => setSuggestionText(e.target.value)}
              placeholder="Ex: Adicionar um filtro por cor da peça, melhorar a busca por modelo específico, etc."
              className="bg-input border-border min-h-[100px]"
              rows={4}
            />
          </div>
        </motion.div>

        <DialogFooter className="gap-2 sm:gap-0">
          <DialogClose asChild>
            <Button type="button" variant="outline" className="border-muted-foreground/50 text-muted-foreground hover:border-primary hover:text-primary">
              Agora Não
            </Button>
          </DialogClose>
          <Button onClick={handleSubmit} className="gradient-bg hover:opacity-90 text-primary-foreground">
            <Send className="h-4 w-4 mr-2" />
            Enviar Sugestão
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SuggestionPopup;
