
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PackageSearch, Clock, CheckCircle } from 'lucide-react';

const FirstProcuraInfoModal = ({ isOpen, onClose }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-card border-border text-foreground">
        <DialogHeader>
          <DialogTitle className="text-xl text-primary flex items-center gap-2">
            <PackageSearch className="h-6 w-6" />
            Sua Procura Foi Criada!
          </DialogTitle>
          <DialogDescription className="text-muted-foreground mt-2">
            Excelente! Sua primeira procura de peça já está ativa na plataforma.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-3 text-sm text-foreground">
          <p className="flex items-start gap-2">
            <Clock className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <span>Agora, nossa equipe e os CDVs parceiros nas regiões que você indicou começarão a verificar a disponibilidade da peça.</span>
          </p>
          <p className="flex items-start gap-2">
            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
            <span>Assim que um CDV encontrar sua peça e responder, você será notificado aqui na plataforma e poderá ver os detalhes da oferta.</span>
          </p>
          <p className="text-xs text-muted-foreground mt-4">
            Fique de olho nas notificações (ícone de sino no topo)! Boa sorte em sua busca!
          </p>
        </div>
        <DialogFooter>
          <Button onClick={onClose} className="gradient-bg hover:opacity-90 text-primary-foreground w-full">
            Entendido!
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FirstProcuraInfoModal;
