
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Star } from 'lucide-react';
import { motion } from 'framer-motion';

const TestimonialsSection = () => {
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

  const testimonials = [
    {
      name: "Sabrina",
      text: "Incrível! O Procuro Pra Ti me conectou com 3 CDVs diferentes em menos de 6 horas. Encontrei exatamente a peça que precisava com um preço 40% menor que nas lojas. Recomendo para todos!",
      rating: 5
    },
    {
      name: "Tatiane",
      text: "Estava há semanas procurando uma peça específica para minha moto. Em poucas horas na plataforma, recebi 2 propostas excelentes. O processo foi super simples e transparente!",
      rating: 5
    }
  ];

  return (
    <section id="depoimentos" className="py-16 sm:py-24 px-4 bg-card/30">
      <div className="container mx-auto">
        <motion.div
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="text-center mb-16"
        >
          <motion.h2 variants={fadeInUp} className="text-3xl sm:text-5xl font-bold mb-6 text-foreground">
            O Que Nossos Usuários Dizem
          </motion.h2>
        </motion.div>

        <motion.div
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto"
        >
          {testimonials.map((testimonial, index) => (
            <motion.div key={index} variants={fadeInUp}>
              <Card className="glass-effect border-border/30 hover:border-primary/50 transition-all duration-300 h-full">
                <CardContent className="p-6">
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-4 italic">"{testimonial.text}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full gradient-bg flex items-center justify-center">
                      <span className="text-primary-foreground font-semibold">
                        {testimonial.name.charAt(0)}
                      </span>
                    </div>
                    <span className="font-semibold text-foreground">– {testimonial.name}</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
