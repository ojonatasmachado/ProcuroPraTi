
import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { FileText, X, Building2, Users, CheckCircle } from 'lucide-react';

const TermsModal = ({ isOpen, onClose, onAccept, onReject, userType, termsAcceptedDate }) => {
  const isCDV = userType === 'company';
  const requiresAcceptance = !termsAcceptedDate && typeof onAccept === 'function';
  const [confirmedReading, setConfirmedReading] = useState(false);

  useEffect(() => {
    if (isOpen && requiresAcceptance) setConfirmedReading(false);
  }, [isOpen, requiresAcceptance]);

  const formatDate = (dateString) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('pt-BR', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };
  
  const termsContentUser = (
    <div className="space-y-6 text-sm leading-relaxed">
      <p className="text-muted-foreground">
        Estes termos de uso ("Termos") regem o uso do aplicativo "PROCURO PRA TI" ("Aplicativo"). Ao utilizar o Aplicativo, você concorda em cumprir e aceitar os seguintes termos e condições:
      </p>
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-2">1. Cadastro e Acesso</h3>
          <div className="space-y-2 text-muted-foreground">
            <p><strong>1.1.</strong> Para utilizar o Aplicativo, você deve criar uma conta fornecendo informações precisas e atualizadas, incluindo seu endereço de e-mail e senha.</p>
            <p><strong>1.2.</strong> Você é responsável por manter a confidencialidade de suas credenciais de login e não deve compartilhá-las com terceiros.</p>
          </div>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-2">2. Funcionalidade do Aplicativo</h3>
          <div className="space-y-2 text-muted-foreground">
            <p><strong>2.1.</strong> O PROCURO PRA TI é uma ferramenta que permite aos usuários buscar peças automotivas novas ou usadas.</p>
            <p><strong>2.2.</strong> A duração de cada procura é definida pelo usuário no momento da criação. As empresas podem responder enquanto a procura estiver ativa, sem garantia de prazo mínimo ou máximo para o recebimento de respostas.</p>
            <p><strong>2.3.</strong> O PROCURO PRA TI não é responsável pela disponibilidade, qualidade ou preço das peças automotivas encontradas. A responsabilidade de escolher e adquirir uma peça é do usuário.</p>
          </div>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-2">3. Responsabilidades do Usuário</h3>
          <div className="space-y-2 text-muted-foreground">
            <p><strong>3.1.</strong> Você concorda em utilizar o Aplicativo de forma legal e ética, respeitando todas as leis e regulamentos aplicáveis.</p>
            <p><strong>3.2.</strong> É de sua responsabilidade verificar a disponibilidade, qualidade e preço das peças de automóveis usadas encontradas através do Aplicativo.</p>
            <p><strong>3.3.</strong> Você é responsável por qualquer ação tomada com base nas informações fornecidas pelo Aplicativo.</p>
          </div>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-2">4. Privacidade</h3>
          <div className="space-y-2 text-muted-foreground">
            <p><strong>4.1.</strong> Nós valorizamos sua privacidade e tratamos suas informações de acordo com nossa Política de Privacidade. Ao usar o Aplicativo, você concorda com a coleta e uso de seus dados pessoais de acordo com nossa Política de Privacidade.</p>
          </div>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-2">5. Alterações nos Termos</h3>
          <div className="space-y-2 text-muted-foreground">
            <p><strong>5.1.</strong> Reservamo-nos o direito de modificar ou atualizar estes Termos a qualquer momento. Quaisquer alterações serão comunicadas através do Aplicativo ou por e-mail.</p>
          </div>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-2">6. Encerramento de Conta</h3>
          <div className="space-y-2 text-muted-foreground">
            <p><strong>6.1.</strong> Reservamo-nos o direito de encerrar sua conta ou restringir seu acesso ao Aplicativo, a nosso critério, se você violar estes Termos ou qualquer lei aplicável.</p>
          </div>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-2">7. Contato</h3>
          <div className="space-y-2 text-muted-foreground">
            <p><strong>7.1.</strong> Para entrar em contato conosco em relação a estes Termos ou ao Aplicativo "PROCURO PRA TI", você pode utilizar os meios de contato fornecidos no Aplicativo.</p>
          </div>
        </div>
      </div>
      <div className="border-t border-border pt-4 mt-6">
        <p className="text-muted-foreground font-medium">
          Ao utilizar o Aplicativo "PROCURO PRA TI", você concorda com estes Termos de Uso. Certifique-se de lê-los com atenção e só utilize o Aplicativo se estiver de acordo com eles. Obrigado por escolher o PROCURO PRA TI.
        </p>
      </div>
    </div>
  );

  const termsContentCDV = (
    <div className="space-y-6 text-sm leading-relaxed">
      <p className="text-muted-foreground">
        Estes Termos de Uso estabelecem as condições para que empresas vendedoras utilizem o aplicativo "PROCURO PRA TI", plataforma desenvolvida para conectar consumidores com fornecedores de peças automotivas. Ao cadastrar sua empresa como fornecedora no aplicativo, você concorda com os termos abaixo:
      </p>
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-2">1. Cadastro e Participação</h3>
          <div className="space-y-2 text-muted-foreground">
            <p><strong>1.1.</strong> Para participar da plataforma, a empresa vendedora deverá realizar cadastro completo e atualizado com dados reais e verificáveis, incluindo CNPJ, endereço, contatos e outras informações solicitadas.</p>
            <p><strong>1.2.</strong> O acesso ao painel da empresa poderá ser concedido mediante aprovação e validação pela equipe do PROCURO PRA TI.</p>
          </div>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-2">2. Compromisso com Respostas e Qualidade das Informações</h3>
          <div className="space-y-2 text-muted-foreground">
            <p><strong>2.1.</strong> A empresa vendedora compromete-se a responder às solicitações disponíveis no menor tempo possível, enquanto cada procura estiver ativa. O prazo de validade é definido pelo usuário que criou a procura.</p>
            <p><strong>2.2.</strong> Toda resposta enviada deve conter informações claras e verdadeiras, incluindo:</p>
            <ul className="ml-4 space-y-1 list-disc">
              <li>Descrição detalhada da peça disponível</li>
              <li>Condição da peça (usada, recondicionada, original, etc.)</li>
              <li>Tipo da peça (Original ou Paralela)</li>
              <li>Valor cobrado de forma transparente</li>
              <li>Cor da peça (quando aplicável)</li>
              <li>Localização exata para retirada (baseada no endereço de cadastro da empresa)</li>
            </ul>
            <p><strong>2.3.</strong> A empresa é inteiramente responsável pelas informações fornecidas. Dados incorretos, incompletos ou enganosos podem acarretar na suspensão ou exclusão da plataforma.</p>
          </div>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-2">3. Relacionamento com o Usuário Final</h3>
          <div className="space-y-2 text-muted-foreground">
            <p><strong>3.1.</strong> Após a resposta ser enviada e visualizada pelo usuário, o contato e a negociação direta entre empresa e consumidor são de responsabilidade exclusiva de ambas as partes.</p>
            <p><strong>3.2.</strong> O PROCURO PRA TI não intermedia, recebe valores ou assume qualquer responsabilidade sobre a conclusão da negociação, retirada da peça ou eventual insatisfação do consumidor.</p>
          </div>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-2">4. Conduta e Reputação</h3>
          <div className="space-y-2 text-muted-foreground">
            <p><strong>4.1.</strong> Espera-se das empresas cadastradas uma conduta profissional e respeitosa com todos os usuários da plataforma.</p>
            <p><strong>4.2.</strong> Reclamações recorrentes, ausência de resposta ou conduta inadequada poderão acarretar a exclusão da empresa da base ativa da plataforma, a critério do PROCURO PRA TI.</p>
          </div>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-2">5. Atualização de Dados</h3>
          <div className="space-y-2 text-muted-foreground">
            <p><strong>5.1.</strong> É responsabilidade da empresa manter suas informações de contato e endereço de cadastro atualizadas, pois este será utilizado como base para as localidades atendidas.</p>
          </div>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-2">6. Alterações e Cancelamento</h3>
          <div className="space-y-2 text-muted-foreground">
            <p><strong>6.1.</strong> O PROCURO PRA TI poderá atualizar estes Termos a qualquer momento. Toda mudança será comunicada via e-mail ou dentro do painel da empresa.</p>
            <p><strong>6.2.</strong> A empresa poderá solicitar o cancelamento de sua participação na plataforma a qualquer momento, mediante aviso prévio.</p>
          </div>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-2">7. Disposições Gerais</h3>
          <div className="space-y-2 text-muted-foreground">
            <p><strong>7.1.</strong> Ao utilizar a plataforma, a empresa concorda em respeitar estes Termos e colaborar para que a experiência dos usuários seja transparente, segura e eficaz.</p>
          </div>
        </div>
      </div>
      <div className="border-t border-border pt-4 mt-6">
        <p className="text-muted-foreground font-medium">
          Ao utilizar a plataforma "PROCURO PRA TI" como empresa vendedora, você concorda com estes Termos de Uso específicos. Certifique-se de lê-los com atenção e só utilize a plataforma se estiver de acordo com eles. Obrigado por fazer parte da nossa rede de parceiros!
        </p>
      </div>
    </div>
  );


  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open && !requiresAcceptance) onClose?.();
    }}>
      <DialogContent showClose={!requiresAcceptance} className="max-h-[calc(100dvh-1rem)] max-w-4xl flex flex-col bg-card border-border text-foreground">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-2xl text-foreground mb-2 flex items-center gap-2">
            <FileText className="h-6 w-6" />
            {isCDV ? (
              <>
                <Building2 className="h-5 w-5" />
                Termos de Uso - Empresas Vendedoras no Aplicativo PROCURO PRA TI
              </>
            ) : (
              <>
                <Users className="h-5 w-5" />
                Termos de Uso - Aplicativo PROCURO PRA TI
              </>
            )}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {isCDV 
              ? "Leia atentamente os termos específicos para empresas vendedoras antes de utilizar a plataforma."
              : "Leia atentamente nossos termos de uso antes de utilizar a plataforma."
            }
            {termsAcceptedDate && (
              <span className="block text-xs text-success mt-1">
                Você aceitou estes termos em: {formatDate(termsAcceptedDate)}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-grow px-6 py-4">
          {isCDV ? termsContentCDV : termsContentUser}
        </ScrollArea>

        <div className="px-6 pb-6 border-t border-border pt-4">
          {termsAcceptedDate ? (
            <div className="flex justify-end">
              <Button onClick={onClose} className="w-full sm:w-auto gradient-bg hover:opacity-90 text-primary-foreground">
                <X className="h-4 w-4 mr-2" />
                Fechar
              </Button>
            </div>
          ) : requiresAcceptance ? (
            <>
              <label className="mb-4 flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-muted/40 p-4 text-sm text-foreground">
                <Checkbox
                  checked={confirmedReading}
                  onCheckedChange={(checked) => setConfirmedReading(checked === true)}
                  aria-label="Confirmar leitura e aceite dos termos"
                  className="mt-0.5"
                />
                <span>
                  Declaro que li e aceito integralmente estes Termos de Uso. Meu aceite será registrado eletronicamente com minha conta, data e horário.
                </span>
              </label>
              <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row">
                <Button variant="outline" onClick={onReject} className="w-full sm:w-auto border-danger text-danger hover:bg-destructive/20">
                  <X className="h-4 w-4 mr-2" />
                  Voltar ao site
                </Button>
                <Button disabled={!confirmedReading} onClick={onAccept} className="w-full sm:w-auto gradient-bg hover:opacity-90 text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Assinar e Continuar
                </Button>
              </div>
            </>
          ) : (
            <div className="flex justify-end">
              <Button onClick={onClose} className="w-full sm:w-auto gradient-bg hover:opacity-90 text-primary-foreground">
                <X className="h-4 w-4 mr-2" />
                Fechar
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TermsModal;
