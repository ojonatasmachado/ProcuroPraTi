
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Search, Clock, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const HowItWorksSection = () => {
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

  const steps = [
    {
      icon: <Users className="h-8 w-8" />,
      title: "Cadastro Simples",
      description: "Registre-se gratuitamente em menos de 2 minutos e acesse nossa rede nacional de CDVs especializados."
    },
    {
      icon: <Search className="h-8 w-8" />,
      title: "Busca Inteligente",
      description: "Descreva a peça que precisa com detalhes. Nossa tecnologia conecta você aos CDVs mais próximos com o item disponível."
    },
    {
      icon: <Clock className="h-8 w-8" />,
      title: "Respostas Rápidas",
      description: "Receba propostas de CDVs qualificados em até 24 horas, com preços competitivos e informações detalhadas."
    },
    {
      icon: <CheckCircle className="h-8 w-8" />,
      title: "Compra Segura",
      description: "Compare opções, negocie diretamente com o CDV e finalize sua compra com total segurança e garantia."
    }
  ];

  return (
    <section id="como-funciona" className="py-16 sm:py-24 px-4 bg-card/30">
      <div className="container mx-auto">
        <motion.div
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="text-center mb-16"
        >
          <motion.h2 variants={fadeInUp} className="text-3xl sm:text-5xl font-bold mb-6 text-primary">
            Como Funciona?
          </motion.h2>
          <motion.p variants={fadeInUp} className="text-lg sm:text-xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">
            O "Procuro Pra Ti" revoluciona a forma como você encontra peças automotivas. Nossa plataforma conecta você diretamente aos melhores Centros de Demolição Veicular (CDVs) do Brasil, garantindo agilidade, qualidade e os melhores preços do mercado.
          </motion.p>
        </motion.div>

        <motion.div
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
        >
          {steps.map((step, index) => (
            <motion.div key={index} variants={fadeInUp}>
              <Card className="glass-effect border-border/30 hover:border-primary/50 transition-all duration-300 h-full text-center">
                <CardHeader className="pb-4">
                  <div className="mx-auto p-4 rounded-full gradient-bg w-fit mb-4">
                    <div className="text-primary-foreground">
                      {step.icon}
                    </div>
                  </div>
                  <CardTitle className="text-xl text-primary">{step.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{step.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
