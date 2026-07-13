
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Search, Shield, MapPin, DollarSign, Car } from 'lucide-react';
import { motion } from 'framer-motion';

const BenefitsSection = () => {
  const fadeInUp = {
    initial: { opacity: 0, y: 60 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 }
  };

  const staggerContainer = {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const benefits = [
    {
      icon: <Clock className="h-8 w-8" />,
      title: "Economia de Tempo",
      description: "Pare de perder horas visitando CDVs. Nossa plataforma traz as melhores opções diretamente para você em minutos."
    },
    {
      icon: <Search className="h-8 w-8" />,
      title: "Variedade Incomparável",
      description: "Acesse o maior catálogo de peças usadas do Brasil, com opções para todos os tipos de veículos e orçamentos."
    },
    {
      icon: <Shield className="h-8 w-8" />,
      title: "CDVs Verificados",
      description: "Trabalhamos exclusivamente com CDVs licenciados e verificados, garantindo procedência e qualidade das peças."
    },
    {
      icon: <MapPin className="h-8 w-8" />,
      title: "Cobertura Nacional",
      description: "Nossa rede abrange todo o território brasileiro, conectando você aos melhores CDVs da sua região e além."
    },
    {
      icon: <DollarSign className="h-8 w-8" />,
      title: "Melhores Preços",
      description: "Compare propostas de múltiplos CDVs e garanta sempre o melhor custo-benefício para suas necessidades."
    },
    {
      icon: <Car className="h-8 w-8" />,
      title: "Todos os Veículos",
      description: "Atendemos carros nacionais e importados, motocicletas, caminhões e veículos comerciais de todas as marcas."
    }
  ];

  return (
    <section id="beneficios" className="py-16 sm:py-24 px-4">
      <div className="container mx-auto">
        <motion.div
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="text-center mb-16"
        >
          <motion.h2 variants={fadeInUp} className="text-3xl sm:text-5xl font-bold mb-6 text-primary">
            Por Que Escolher a Procuro Pra Ti?
          </motion.h2>
        </motion.div>

        <motion.div
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {benefits.map((benefit, index) => (
            <motion.div key={index} variants={fadeInUp}>
              <Card className="glass-effect border-border/30 hover:border-primary/50 transition-all duration-300 h-full">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-primary/20 border border-primary/30">
                      <div className="text-primary">
                        {benefit.icon}
                      </div>
                    </div>
                    <CardTitle className="text-lg text-primary">{benefit.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{benefit.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default BenefitsSection;
