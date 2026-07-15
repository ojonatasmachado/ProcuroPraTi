
import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Building2, LogIn, UserPlus, ShieldCheck, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from '@/components/ui/use-toast';
import TermsModal from '@/components/TermsModal.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const UserRegistration = ({ onRegister, onLogin, allStatesAndCities, initialUserType }) => {
  const [isLogin, setIsLogin] = useState(false);
  const [userType, setUserType] = useState(initialUserType === 'company' ? 'company' : 'user');
  const [showTerms, setShowTerms] = useState(false);

  const [formData, setFormData] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    phone: '', 
    addressStreet: '', addressCity: '', addressState: '', // For CDV address
    cnpj: ''
  });
  const [availableCities, setAvailableCities] = useState([]);

  useEffect(() => {
    if (formData.addressState) {
      const stateData = allStatesAndCities.find(s => s.value === formData.addressState);
      setAvailableCities(stateData ? stateData.cities.sort((a,b) => a.label.localeCompare(b.label)) : []);
    } else {
      setAvailableCities([]);
    }
    setFormData(prev => ({ ...prev, addressCity: '' }));
  }, [formData.addressState, allStatesAndCities]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSelectChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value, ...(field === 'addressState' && { addressCity: '' }) }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isLogin) {
      if (!formData.email || !formData.password) {
        toast({ title: "Erro", description: "Email e senha são obrigatórios.", variant: "destructive" });
        return;
      }
      onLogin(formData.email, formData.password, userType);
    } else { 
      if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
        toast({ title: "Erro", description: "Nome, email, senha e confirmação de senha são obrigatórios.", variant: "destructive" });
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        toast({ title: "Erro", description: "As senhas não coincidem.", variant: "destructive" });
        return;
      }
      
      let fullAddress = '';
      if (userType === 'company') {
        if (!formData.cnpj || !formData.addressStreet || !formData.addressCity || !formData.addressState) {
          toast({ title: "Erro", description: "CNPJ e Endereço completo (Rua, Cidade, Estado) são obrigatórios para CDV.", variant: "destructive" });
          return;
        }
        fullAddress = `${formData.addressStreet}, ${formData.addressCity}, ${formData.addressState}`;
      } else if (userType === 'user' && (formData.addressStreet || formData.addressCity || formData.addressState)) {
         if (!formData.addressStreet || !formData.addressCity || !formData.addressState) {
          toast({ title: "Endereço Incompleto", description: "Para salvar o endereço, por favor preencha Rua, Cidade e Estado.", variant: "destructive" });
          return;
        }
        fullAddress = `${formData.addressStreet}, ${formData.addressCity}, ${formData.addressState}`;
      }

      onRegister({ 
        name: formData.name, email: formData.email, password: formData.password, 
        phone: formData.phone, 
        location: fullAddress, // For user, this is their general location
        cnpj: userType === 'company' ? formData.cnpj : undefined,
        address: userType === 'company' ? fullAddress : undefined, // Specific for CDV
      }, userType);
    }
  };

  const cardTitle = isLogin ? "Acesse sua Conta" : "Crie sua Conta";
  const buttonText = isLogin ? "Entrar na Plataforma" : (userType === 'company' ? "Cadastrar Empresa" : "Criar Minha Conta");
  const switchText = isLogin ? "Não tem uma conta? Cadastre-se gratuitamente" : "Já tem uma conta? Faça login";

  const sortedStates = useMemo(() => [...allStatesAndCities].sort((a,b) => a.label.localeCompare(b.label)), [allStatesAndCities]);

  const isCompanyIntent = !isLogin && userType === 'company';

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-heading font-extrabold tracking-tight lowercase mb-3">
          <span className="text-foreground">procuro</span>{' '}
          <span className="text-primary">pra ti</span>
        </h1>
        <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">Conectamos você às melhores peças automotivas de CDVs especializados em todo o Brasil.</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
        <Card className="w-full max-w-md bg-card border border-border">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl sm:text-2xl font-heading font-bold text-foreground">
              {userType === 'user' && <Users className="inline-block h-5 w-5 sm:h-6 sm:w-6 mr-2 text-primary" />}
              {userType === 'company' && <Building2 className="inline-block h-5 w-5 sm:h-6 sm:w-6 mr-2 text-accent-agile" />}
              {userType === 'admin' && <ShieldCheck className="inline-block h-5 w-5 sm:h-6 sm:w-6 mr-2 text-primary" />}
              {cardTitle}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {isLogin ? 'Entre para acessar todas as funcionalidades da plataforma.' : `Junte-se à maior rede de ${userType === 'user' ? 'busca de peças' : 'CDVs especializados'} do Brasil.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Tabs value={userType} onValueChange={(type) => { setUserType(type); setFormData({ name: '', email: '', password: '', confirmPassword: '', phone: '', addressStreet: '', addressCity: '', addressState: '', cnpj: '' }); }} className="mb-4">
              <TabsList className="grid w-full grid-cols-3 bg-popover border border-border">
                <TabsTrigger value="user" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary text-xs sm:text-sm">Vou procurar</TabsTrigger>
                <TabsTrigger value="company" className="data-[state=active]:bg-accent-agile/20 data-[state=active]:text-accent-agile text-xs sm:text-sm">Vou vender</TabsTrigger>
                <TabsTrigger value="admin" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400 text-xs sm:text-sm">Admin</TabsTrigger>
              </TabsList>
            </Tabs>

            <form onSubmit={handleSubmit} className="space-y-3">
              {!isLogin && (
                <div>
                  <Label htmlFor="name" className="text-muted-foreground text-xs font-medium mb-1 block">Nome Completo / Razão Social</Label>
                  <Input id="name" name="name" type="text" placeholder="Seu nome ou nome da empresa" required={!isLogin} value={formData.name} onChange={handleInputChange} className="bg-popover border-border text-sm h-9" />
                </div>
              )}

              <div>
                <Label htmlFor="email" className="text-muted-foreground text-xs font-medium mb-1 block">Email</Label>
                <Input id="email" name="email" type="email" placeholder="seu@email.com" required value={formData.email} onChange={handleInputChange} className="bg-popover border-border text-sm h-9" />
              </div>

              <div>
                <Label htmlFor="password" className="text-muted-foreground text-xs font-medium mb-1 block">Senha</Label>
                <Input id="password" name="password" type="password" placeholder="Sua senha" required value={formData.password} onChange={handleInputChange} className="bg-popover border-border text-sm h-9" />
              </div>

              {!isLogin && (
                <div>
                  <Label htmlFor="confirmPassword" className="text-muted-foreground text-xs font-medium mb-1 block">Confirmar Senha</Label>
                  <Input id="confirmPassword" name="confirmPassword" type="password" placeholder="Confirme sua senha" required={!isLogin} value={formData.confirmPassword} onChange={handleInputChange} className="bg-popover border-border text-sm h-9" />
                </div>
              )}

              {!isLogin && userType === 'company' && (
                <>
                  <div>
                    <Label htmlFor="cnpj" className="text-muted-foreground text-xs font-medium mb-1 block">CNPJ *</Label>
                    <Input id="cnpj" name="cnpj" type="text" placeholder="XX.XXX.XXX/0001-XX" required value={formData.cnpj} onChange={handleInputChange} className="bg-popover border-border text-sm h-9" />
                  </div>
                  <div>
                    <Label htmlFor="addressStreet" className="text-muted-foreground text-xs font-medium mb-1 block">Endereço (Rua, Nº, Bairro) *</Label>
                    <Input id="addressStreet" name="addressStreet" type="text" placeholder="Ex: Rua Principal, 123, Centro" value={formData.addressStreet} onChange={handleInputChange} className="bg-popover border-border text-sm h-9"/>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="addressState" className="text-muted-foreground text-xs font-medium mb-1 block">Estado *</Label>
                      <Select value={formData.addressState} onValueChange={(value) => handleSelectChange('addressState', value)}>
                        <SelectTrigger id="addressState" className="bg-popover border-border w-full text-sm h-9"><SelectValue placeholder="UF" /></SelectTrigger>
                        <SelectContent className="bg-popover border-border text-popover-foreground max-h-48">{sortedStates.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="addressCity" className="text-muted-foreground text-xs font-medium mb-1 block">Cidade *</Label>
                      <Select value={formData.addressCity} onValueChange={(value) => handleSelectChange('addressCity', value)} disabled={!formData.addressState || availableCities.length === 0}>
                        <SelectTrigger id="addressCity" className="bg-popover border-border w-full text-sm h-9"><SelectValue placeholder="Cidade" /></SelectTrigger>
                        <SelectContent className="bg-popover border-border text-popover-foreground max-h-48">{availableCities.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                </>
              )}

              {!isLogin && userType !== 'admin' && (
                <div>
                  <Label htmlFor="phone" className="text-muted-foreground text-xs font-medium mb-1 block">Telefone (Opcional)</Label>
                  <Input id="phone" name="phone" type="tel" placeholder="(XX) XXXXX-XXXX" value={formData.phone} onChange={handleInputChange} className="bg-popover border-border text-sm h-9" />
                </div>
              )}
              { userType === 'user' && !isLogin && (
                <>
                  <p className="text-xs text-muted-foreground pt-1">Endereço (Opcional para Usuários):</p>
                  <div>
                    <Label htmlFor="addressStreetUser" className="text-muted-foreground text-xs font-medium mb-1 block">Rua, Nº, Bairro</Label>
                    <Input id="addressStreetUser" name="addressStreet" type="text" placeholder="Ex: Rua das Flores, 10" value={formData.addressStreet} onChange={handleInputChange} className="bg-popover border-border text-sm h-9"/>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="addressStateUser" className="text-muted-foreground text-xs font-medium mb-1 block">Estado</Label>
                      <Select value={formData.addressState} onValueChange={(value) => handleSelectChange('addressState', value)}>
                        <SelectTrigger id="addressStateUser" className="bg-popover border-border w-full text-sm h-9"><SelectValue placeholder="UF" /></SelectTrigger>
                        <SelectContent className="bg-popover border-border text-popover-foreground max-h-48">{sortedStates.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="addressCityUser" className="text-muted-foreground text-xs font-medium mb-1 block">Cidade</Label>
                      <Select value={formData.addressCity} onValueChange={(value) => handleSelectChange('addressCity', value)} disabled={!formData.addressState || availableCities.length === 0}>
                        <SelectTrigger id="addressCityUser" className="bg-popover border-border w-full text-sm h-9"><SelectValue placeholder="Cidade" /></SelectTrigger>
                        <SelectContent className="bg-popover border-border text-popover-foreground max-h-48">{availableCities.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                </>
              )}
              <Button
                type="submit"
                className={`w-full font-semibold py-2.5 text-sm h-10 ${isCompanyIntent ? 'bg-accent-agile hover:bg-accent-agile/90 text-accent-agile-foreground' : 'bg-primary hover:bg-primary/90 text-primary-foreground'}`}
              >
                {isLogin ? <LogIn className="h-4 w-4 mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
                {buttonText}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col gap-2 pt-3">
            <Button variant="link" onClick={() => setIsLogin(!isLogin)} className="text-xs text-primary hover:text-primary/80 h-auto py-1">{switchText}</Button>
            <Button variant="link" onClick={() => setShowTerms(true)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 h-auto py-1">
              <FileText className="h-3 w-3" />
              Termos de Uso
            </Button>
          </CardFooter>
        </Card>
      </motion.div>

      <TermsModal isOpen={showTerms} onClose={() => setShowTerms(false)} userType={userType} />
    </div>
  );
};

export default UserRegistration;
