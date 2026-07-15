
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
      answer: "Simples! Cadastre-se gratuitamente, descreva a peça que precisa com detalhes do seu veículo e aguarde as propostas dos CDVs. Todo o processo é digital e transparente."
    },
    {
      question: "O Procuro Pra Ti é realmente gratuito?",
      answer: "Sim! O cadastro, busca e conexão com CDVs são 100% gratuitos. Você paga apenas pela peça diretamente ao CDV escolhido."
    },
    {
      question: "Como funciona o pagamento das peças?",
      answer: "O pagamento é feito diretamente com o CDV selecionado, oferecendo flexibilidade total nas formas de pagamento e condições de entrega."
    },
    {
      question: "Que tipos de veículos são atendidos?",
      answer: "Atendemos todos os tipos: carros nacionais e importados, motocicletas, caminhões, ônibus e veículos comerciais de todas as marcas e modelos."
    },
    {
      question: "Como garantir a qualidade das peças?",
      answer: "Trabalhamos apenas com CDVs licenciados e verificados. Além disso, você pode solicitar fotos detalhadas e negociar garantias diretamente com o fornecedor."
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
