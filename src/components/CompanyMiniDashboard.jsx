
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BarChart3, MessageSquare, CheckCircle, XCircle, TrendingUp, Percent } from 'lucide-react';
import BrandMark from '@/components/BrandMark';
import { motion } from 'framer-motion';

const CompanyMiniDashboard = ({ currentUser, procuras, onClose }) => {
  const companyId = currentUser?.id;

  const companyProcuras = useMemo(() => {
    if (!currentUser || !procuras) return [];
    return procuras.filter(p => 
      (((p.locations || []).some(loc => (currentUser.servesLocations || []).includes(loc.value))) &&
        (currentUser.vehicleTypes || ['car', 'motorcycle', 'truck', 'bus']).includes(p.vehicleType || 'car')) ||
      (p.responses || []).some(r => r.companyId === companyId)
    );
  }, [procuras, companyId, currentUser]);

  const myResponses = useMemo(() => {
    if (!currentUser || !companyProcuras) return [];
    const responses = [];
    companyProcuras.forEach(p => {
      const myRes = (p.responses || []).find(r => r.companyId === companyId);
      if (myRes) {
        responses.push({ ...myRes, procuraPartName: p.partName });
      }
    });
    return responses;
  }, [companyProcuras, companyId, currentUser]);

  const totalProcurasParaMim = companyProcuras.length;
  const totalRespostasEnviadas = myResponses.length;
  const respostasDisponiveis = myResponses.filter(r => r.status === 'available').length;
  const respostasIndisponiveis = myResponses.filter(r => r.status === 'unavailable').length;
  const taxaResposta = totalProcurasParaMim > 0 ? ((totalRespostasEnviadas / totalProcurasParaMim) * 100).toFixed(0) : 0;
  const taxaDisponibilidade = totalRespostasEnviadas > 0 ? ((respostasDisponiveis / totalRespostasEnviadas) * 100).toFixed(0) : 0;

  const stats = [
    { title: "Procuras Recebidas", value: totalProcurasParaMim, icon: <BrandMark className="h-6 w-6" /> },
    { title: "Respostas Enviadas", value: totalRespostasEnviadas, icon: <MessageSquare className="h-6 w-6 text-primary" /> },
    { title: "Peças Disponíveis", value: respostasDisponiveis, icon: <CheckCircle className="h-6 w-6 text-success" /> },
    { title: "Peças Indisponíveis", value: respostasIndisponiveis, icon: <XCircle className="h-6 w-6 text-danger" /> },
    { title: "Taxa de Resposta", value: `${taxaResposta}%`, icon: <TrendingUp className="h-6 w-6 text-warning" /> },
    { title: "Taxa de Disponibilidade", value: `${taxaDisponibilidade}%`, icon: <Percent className="h-6 w-6 text-accent-agile" /> },
  ];

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.07, duration: 0.4 }
    })
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[calc(100dvh-1rem)] max-w-2xl overflow-y-auto border-border bg-card text-foreground">
        <DialogHeader className="pr-10 text-left">
          <DialogTitle className="flex items-center gap-2 text-xl sm:text-2xl">
            <BarChart3 className="h-6 w-6 text-primary" />
            Meu Desempenho
          </DialogTitle>
          <DialogDescription>Resumo das suas interações e respostas na plataforma.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.title}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              custom={i}
            >
              <Card className="glass-effect border-border/50 hover:border-primary/70 transition-colors h-full">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 px-3 pt-3 sm:px-4 sm:pt-4">
                  <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                  {stat.icon}
                </CardHeader>
                <CardContent className="px-3 pb-3 sm:px-4 sm:pb-4">
                  <div className="text-lg sm:text-2xl font-bold text-foreground">{stat.value}</div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-4 sm:mt-6 text-center">
          Estas são estatísticas baseadas nas suas interações na plataforma.
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default CompanyMiniDashboard;
