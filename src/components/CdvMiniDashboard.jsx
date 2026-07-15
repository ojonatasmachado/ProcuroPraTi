
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, PackageSearch, MessageSquare, CheckCircle, XCircle, TrendingUp, Percent, X } from 'lucide-react';
import { motion } from 'framer-motion';

const CdvMiniDashboard = ({ currentUser, procuras, onClose }) => {
  const cdvId = currentUser?.id;

  const cdvProcuras = useMemo(() => {
    if (!currentUser || !procuras) return [];
    return procuras.filter(p => 
      (p.locations || []).some(loc => (currentUser.servesLocations || []).includes(loc.value)) || 
      p.responses.some(r => r.cdvId === cdvId)
    );
  }, [procuras, cdvId, currentUser]);

  const myResponses = useMemo(() => {
    if (!currentUser || !cdvProcuras) return [];
    const responses = [];
    cdvProcuras.forEach(p => {
      const myRes = p.responses.find(r => r.cdvId === cdvId);
      if (myRes) {
        responses.push({ ...myRes, procuraPartName: p.partName });
      }
    });
    return responses;
  }, [cdvProcuras, cdvId, currentUser]);

  const totalProcurasParaMim = cdvProcuras.length;
  const totalRespostasEnviadas = myResponses.length;
  const respostasDisponiveis = myResponses.filter(r => r.status === 'available').length;
  const respostasIndisponiveis = myResponses.filter(r => r.status === 'unavailable').length;
  const taxaResposta = totalProcurasParaMim > 0 ? ((totalRespostasEnviadas / totalProcurasParaMim) * 100).toFixed(0) : 0;
  const taxaDisponibilidade = totalRespostasEnviadas > 0 ? ((respostasDisponiveis / totalRespostasEnviadas) * 100).toFixed(0) : 0;

  const stats = [
    { title: "Procuras Recebidas", value: totalProcurasParaMim, icon: <PackageSearch className="h-6 w-6 text-primary" /> },
    { title: "Respostas Enviadas", value: totalRespostasEnviadas, icon: <MessageSquare className="h-6 w-6 text-blue-500" /> },
    { title: "Peças Disponíveis", value: respostasDisponiveis, icon: <CheckCircle className="h-6 w-6 text-green-500" /> },
    { title: "Peças Indisponíveis", value: respostasIndisponiveis, icon: <XCircle className="h-6 w-6 text-red-500" /> },
    { title: "Taxa de Resposta", value: `${taxaResposta}%`, icon: <TrendingUp className="h-6 w-6 text-yellow-500" /> },
    { title: "Taxa de Disponibilidade", value: `${taxaDisponibilidade}%`, icon: <Percent className="h-6 w-6 text-indigo-500" /> },
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
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex justify-center items-center p-4 z-[100]">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-2xl bg-card p-4 sm:p-6 rounded-xl shadow-2xl border border-border"
      >
        <div className="flex justify-between items-center mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Meu Desempenho
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-muted-foreground hover:text-primary">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          {stats.map((stat, i) => (
            <motion.custom
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
            </motion.custom>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-4 sm:mt-6 text-center">
          Estas são estatísticas baseadas nas suas interações na plataforma.
        </p>
      </motion.div>
    </div>
  );
};

export default CdvMiniDashboard;
