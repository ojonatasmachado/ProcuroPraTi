import React, { useCallback, useEffect, useState } from 'react';
import { Copy, Eye, EyeOff, KeyRound, Loader2, LogOut, Mail, Phone, Plus, RefreshCw, ShieldCheck, UserMinus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import dataService from '@/lib/dataService';
import { generateCompanyPin, getCompanyDeviceId, getCompanyDeviceName } from '@/lib/companyAccess';

const emptyOperator = () => ({ id: null, name: '', username: '', contactEmail: '', contactPhone: '', pin: generateCompanyPin() });
const suggestUsername = (name, operators, currentId = null) => {
  const words = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(word => word && !['de', 'da', 'do', 'das', 'dos', 'e'].includes(word));
  if (words.length === 0) return '';
  const first = words[0];
  const second = words[1] || words.at(-1) || '';
  const last = words.at(-1) || '';
  const candidates = [...new Set([`${first}_${second || last}`, `${last}_${first}`].filter(value => value.length >= 3))];
  const used = new Set(operators.filter(item => item.id !== currentId).map(item => item.username.toLowerCase()));
  const available = candidates.find(candidate => !used.has(candidate));
  if (available) return available.slice(0, 24);
  const base = candidates[0] || first;
  let suffix = 2;
  while (used.has(`${base}${suffix}`)) suffix += 1;
  return `${base}${suffix}`.slice(0, 24);
};

const PinField = ({ value, onChange }) => {
  const [visible, setVisible] = useState(true);
  return <div className="relative min-w-0 overflow-hidden rounded-[10px]"><Input type={visible ? 'text' : 'password'} style={{ WebkitTextSecurity: visible ? 'none' : 'disc' }} inputMode="numeric" maxLength={6} value={value} onChange={(event) => onChange(event.target.value.replace(/\D/g, '').slice(0, 6))} className="pr-12 tracking-[0.3em]" /><button type="button" className="touch-manipulation absolute right-1 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" onClick={() => setVisible(current => !current)} aria-label={visible ? 'Ocultar PIN' : 'Mostrar PIN'} aria-pressed={visible}>{visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>;
};

const CompanyTeamManagement = ({ company, access, onEnabled, onClose }) => {
  const [operators, setOperators] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [ownerPin, setOwnerPin] = useState(generateCompanyPin());
  const [ownerPinConfirmation, setOwnerPinConfirmation] = useState('');
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(Boolean(access?.enabled));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [nextOperators, nextSessions] = await Promise.all([dataService.getCompanyOperators(), dataService.getCompanyAccessSessions()]);
      setOperators(nextOperators);
      setSessions(nextSessions);
      if (nextOperators.length === 0) setForm(current => current || emptyOperator());
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (access?.enabled) void load(); }, [access?.enabled, load]);

  const enable = async (event) => {
    event.preventDefault();
    setError('');
    if (!/^\d{6}$/.test(ownerPin)) return setError('Crie um PIN de 6 números para o responsável.');
    if (ownerPin !== ownerPinConfirmation) return setError('A confirmação do PIN está diferente.');
    setSaving(true);
    try {
      await dataService.enableCompanyTeamAccess(ownerPin, getCompanyDeviceId(), getCompanyDeviceName());
      toast({ title: 'Acesso da equipe ativado', description: 'Este dispositivo ficou identificado como responsável.' });
      await onEnabled();
      setForm(emptyOperator());
    } catch (enableError) {
      setError(enableError.message);
    } finally {
      setSaving(false);
    }
  };

  const saveOperator = async (event) => {
    event.preventDefault();
    setError('');
    if (form.name.trim().length < 2) return setError('Informe o nome da pessoa.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail.trim())) return setError('Informe um email válido para enviar os dados de acesso.');
    if (form.contactPhone.replace(/\D/g, '').length < 10) return setError('Informe um telefone válido com DDD.');
    if (!/^[A-Za-z0-9._-]{3,24}$/.test(form.username.trim())) return setError('O usuário deve ter entre 3 e 24 caracteres, sem espaços.');
    if (!/^\d{6}$/.test(form.pin)) return setError('O PIN deve ter 6 números.');
    setSaving(true);
    try {
      const saved = await dataService.saveCompanyOperator(form);
      toast({
        title: saved.emailSent ? (form.id ? 'Acesso atualizado e enviado' : 'Colaborador adicionado') : 'Acesso salvo, mas o email não foi enviado',
        description: saved.emailSent
          ? `Os dados de acesso foram enviados para ${form.contactEmail.trim()}.`
          : `Os dados foram salvos. Gere um novo PIN para tentar o envio novamente. ${saved.emailError || ''}`.trim(),
        variant: saved.emailSent ? undefined : 'destructive',
      });
      setForm(null);
      await load();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  const copyAccess = async (operator) => {
    await navigator.clipboard.writeText(`Procuro Pra Ti\nEmpresa: ${company.name}\nCNPJ: ${company.cnpj}\nUsuário: ${operator.username}\nUse o PIN entregue pelo responsável.`);
    toast({ title: 'Dados copiados', description: 'O PIN não é armazenado de forma visível. Envie-o separadamente.' });
  };

  const disable = async (operator) => {
    if (!window.confirm(`Desativar o acesso de ${operator.name}?`)) return;
    try { await dataService.disableCompanyOperator(operator.id); await load(); toast({ title: 'Acesso desativado' }); }
    catch (disableError) { setError(disableError.message); }
  };

  const revoke = async (session) => {
    if (session.currentSession || !window.confirm(`Encerrar o acesso em ${session.deviceName}?`)) return;
    try { await dataService.revokeCompanyAccessSession(session.id); await load(); toast({ title: 'Acesso encerrado' }); }
    catch (revokeError) { setError(revokeError.message); }
  };

  return <section className="mx-auto max-w-4xl space-y-5">
      <div><h2 className="flex items-center gap-2 text-2xl font-extrabold"><Users className="h-7 w-7 text-primary" /> Equipe e acessos</h2><p className="mt-1 text-muted-foreground">Cada pessoa entra por “Sou colaborador” usando CNPJ, usuário e PIN. A senha principal da empresa permanece privada.</p></div>
      {!access?.enabled ? <Card><CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="text-primary" /> Ativar controle de acessos</CardTitle><CardDescription>Crie primeiro o PIN privado do responsável. Somente ele poderá editar o perfil da empresa, excluir a conta e acessar a futura área financeira.</CardDescription></CardHeader><CardContent><form onSubmit={enable} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>PIN do responsável</Label><PinField value={ownerPin} onChange={setOwnerPin} /></div><div className="space-y-2"><Label>Confirmar PIN</Label><PinField value={ownerPinConfirmation} onChange={setOwnerPinConfirmation} /></div></div>{error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}<Button disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}Ativar e continuar</Button></form></CardContent></Card> : <>
        <Card><CardHeader className="flex-col items-stretch gap-3 sm:flex-row sm:items-start sm:justify-between"><div><CardTitle>Pessoas da equipe</CardTitle><CardDescription>{operators.filter(item => item.active).length} acesso(s) ativo(s)</CardDescription></div><Button onClick={() => { setError(''); setForm(emptyOperator()); }} className="w-full sm:w-auto"><Plus className="mr-2 h-4 w-4" />Adicionar colaborador</Button></CardHeader><CardContent className="space-y-3">{loading ? <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" /> : operators.length === 0 ? <div className="rounded-xl border border-dashed border-border bg-muted/50 p-4 text-center"><p className="text-sm font-semibold text-foreground">Nenhum colaborador cadastrado</p><p className="mt-1 text-xs text-muted-foreground">Use o botão acima para informar nome, email e telefone.</p></div> : operators.map(operator => <div key={operator.id} className="flex flex-col justify-between gap-3 rounded-xl border border-border p-4 sm:flex-row sm:items-center"><div className="min-w-0"><p className="font-bold">{operator.name}</p><p className="text-sm text-muted-foreground">Usuário: {operator.username} {operator.active ? '' : '· Desativado'}</p><p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Mail className="h-3 w-3" />{operator.contactEmail}</p>{operator.contactPhone && <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Phone className="h-3 w-3" />{operator.contactPhone}</p>}</div><div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => copyAccess(operator)}><Copy className="mr-1 h-4 w-4" />Copiar</Button><Button variant="outline" size="sm" onClick={() => { setError(''); setForm({ ...operator, contactEmail: operator.contactEmail || '', contactPhone: operator.contactPhone || '', pin: generateCompanyPin() }); }}><RefreshCw className="mr-1 h-4 w-4" />{operator.active ? 'Novo PIN e reenviar' : 'Reativar'}</Button>{operator.active && <Button variant="outline" size="sm" onClick={() => disable(operator)} className="text-destructive"><UserMinus className="mr-1 h-4 w-4" />Desativar</Button>}</div></div>)}</CardContent></Card>
        <Card><CardHeader><CardTitle>Acessos em uso</CardTitle><CardDescription>{sessions.length} de {access?.maxConcurrentAccesses || 1} acesso(s) simultâneo(s) contratado(s). Os acessos inativos são liberados automaticamente.</CardDescription></CardHeader><CardContent className="space-y-3">{sessions.map(session => <div key={session.id} className="flex items-center justify-between gap-3 rounded-xl border border-border p-4"><div><p className="font-bold">{session.accessRole === 'owner' ? 'Responsável' : session.operatorName}</p><p className="text-sm text-muted-foreground">{session.deviceName}{session.currentSession ? ' · Este dispositivo' : ''}</p></div>{!session.currentSession && <Button variant="outline" size="sm" onClick={() => revoke(session)}><LogOut className="mr-1 h-4 w-4" />Encerrar</Button>}</div>)}</CardContent></Card>
      </>}
      {form && <Card className="border-primary/40"><CardHeader><CardTitle>{form.id ? 'Atualizar acesso do colaborador' : 'Adicionar colaborador'}</CardTitle><CardDescription>Preencha os dados abaixo. O colaborador receberá no email o CNPJ, o nome de usuário, o PIN e as instruções para entrar.</CardDescription></CardHeader><CardContent><form onSubmit={saveOperator} className="space-y-4" noValidate><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="operator-name">Nome completo *</Label><Input id="operator-name" autoComplete="name" value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value, ...(!current.id ? { username: suggestUsername(event.target.value, operators) } : {}) }))} /></div><div className="space-y-2"><Label htmlFor="operator-email">Email para receber o acesso *</Label><Input id="operator-email" type="email" autoComplete="email" value={form.contactEmail} onChange={event => setForm(current => ({ ...current, contactEmail: event.target.value }))} /></div><div className="space-y-2"><Label htmlFor="operator-phone">Telefone com DDD *</Label><Input id="operator-phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="(51) 99999-9999" value={form.contactPhone} onChange={event => setForm(current => ({ ...current, contactPhone: event.target.value }))} /></div><div className="space-y-2"><Label htmlFor="operator-username">Nome de usuário *</Label><Input id="operator-username" autoCapitalize="none" autoComplete="username" value={form.username} onChange={event => setForm(current => ({ ...current, username: event.target.value.toLowerCase().replace(/\s/g, '') }))} /></div></div><div className="space-y-2"><Label>PIN de 6 números *</Label><div className="flex min-w-0 gap-2"><div className="min-w-0 flex-1"><PinField value={form.pin} onChange={pin => setForm(current => ({ ...current, pin }))} /></div><Button type="button" variant="outline" onClick={() => setForm(current => ({ ...current, pin: generateCompanyPin() }))} className="shrink-0">Gerar</Button></div><p className="text-xs text-muted-foreground">O PIN será enviado somente neste email e não ficará visível depois.</p></div>{error && <p role="alert" className="rounded-lg border border-danger/30 bg-destructive/10 p-3 text-sm font-medium text-danger">{error}</p>}<div className="flex flex-col gap-2 sm:flex-row"><Button disabled={saving} className="min-h-11 sm:flex-1">{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}Salvar e enviar por email</Button><Button type="button" variant="outline" onClick={() => setForm(null)} className="min-h-11">Cancelar</Button></div></form></CardContent></Card>}
  </section>;
};

export default CompanyTeamManagement;
