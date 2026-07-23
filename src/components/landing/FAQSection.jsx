
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';

const FAQSection = () => {
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

  const faqs = [
    {
      question: "Como posso buscar peças na plataforma?",
      answer: "Cadastre-se, informe o veículo e descreva a peça que precisa. Sua procura fica disponível pelo período que você definir para que empresas possam responder."
    },
    {
      question: "O Procuro Pra Ti é realmente gratuito?",
      answer: "O cadastro e a publicação de procuras são gratuitos para quem procura. Qualquer negociação da peça acontece diretamente com a empresa escolhida."
    },
    {
      question: "Como funciona o pagamento das peças?",
      answer: "O pagamento é combinado diretamente com a empresa selecionada, de acordo com as formas de pagamento e condições de entrega oferecidas por ela."
    },
    {
      question: "Que tipos de veículos são atendidos?",
      answer: "Atendemos todos os tipos: carros nacionais e importados, motocicletas, caminhões, ônibus e veículos comerciais de todas as marcas e modelos."
    },
    {
      question: "Como uma empresa pode vender pela plataforma?",
      answer: "A empresa cria seu cadastro, acompanha procuras compatíveis e responde informando se possui a peça, o preço e as condições. O comprador decide se deseja iniciar o chat."
    },
    {
      question: "A resposta tem um prazo fixo?",
      answer: "Não. A duração da procura é definida por quem a criou. As empresas podem responder enquanto ela estiver ativa, tornando o processo rápido sem prometer um prazo único para todos."
    }
  ];

  return (
    <section id="faq" className="py-16 sm:py-24 px-4 bg-card/30">
      <div className="container mx-auto">
        <motion.div
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="text-center mb-16"
        >
          <motion.h2 variants={fadeInUp} className="text-3xl sm:text-5xl font-bold mb-6 text-foreground">
            Perguntas Frequentes
          </motion.h2>
        </motion.div>

        <motion.div
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="max-w-3xl mx-auto space-y-6"
        >
          {faqs.map((faq, index) => (
            <motion.div key={index} variants={fadeInUp}>
              <Card className="glass-effect border-border/30">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-3">{faq.question}</h3>
                  <p className="text-muted-foreground">{faq.answer}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default FAQSection;
