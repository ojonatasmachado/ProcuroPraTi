import React, { useCallback, useEffect, useState } from 'react';
import { Copy, Eye, EyeOff, KeyRound, Loader2, LogOut, Plus, RefreshCw, ShieldCheck, UserMinus, Users, X } from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';
import ThemeToggle from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import dataService from '@/lib/dataService';
import { generateCompanyPin, getCompanyDeviceId, getCompanyDeviceName } from '@/lib/companyAccess';

const emptyOperator = () => ({ id: null, name: '', username: '', contactEmail: '', pin: generateCompanyPin() });
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
  return <div className="relative"><Input key={visible ? 'pin-visible' : 'pin-hidden'} type={visible ? 'text' : 'password'} style={{ WebkitTextSecurity: visible ? 'none' : 'disc' }} inputMode="numeric" maxLength={6} value={value} onChange={(event) => onChange(event.target.value.replace(/\D/g, '').slice(0, 6))} className="pr-12 tracking-[0.3em]" /><Button type="button" variant="ghost" size="icon" className="touch-manipulation absolute right-1 top-1/2 z-10 -translate-y-1/2" onClick={() => setVisible(current => !current)} aria-label={visible ? 'Ocultar PIN' : 'Mostrar PIN'} aria-pressed={visible}>{visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button></div>;
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
    if (!/^[A-Za-z0-9._-]{3,24}$/.test(form.username.trim())) return setError('O usuário deve ter entre 3 e 24 caracteres, sem espaços.');
    if (!/^\d{6}$/.test(form.pin)) return setError('O PIN deve ter 6 números.');
    setSaving(true);
    try {
      const saved = await dataService.saveCompanyOperator(form);
      toast({ title: form.id ? 'Acesso atualizado' : 'Pessoa adicionada', description: saved.emailSent ? `Os dados de acesso foram enviados para ${form.contactEmail.trim()}.` : `Acesso salvo. Copie os dados e entregue o PIN ${form.pin} para ${form.name.trim()}.` });
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

  return <div className="min-h-screen bg-background text-foreground">
    <header className="safe-header sticky top-0 z-50 border-b border-border bg-card px-3 py-3 shadow-sm"><div className="container mx-auto flex items-center justify-between gap-3"><BrandLogo compactOnMobile iconClassName="h-10 w-10" textClassName="text-xl sm:text-2xl" /><div className="flex gap-2"><ThemeToggle /><Button variant="outline" size="icon" onClick={onClose} aria-label="Fechar"><X className="h-5 w-5" /></Button></div></div></header>
    <main className="container mx-auto max-w-4xl space-y-5 px-3 py-6 sm:px-4">
      <div><h2 className="flex items-center gap-2 text-2xl font-extrabold"><Users className="h-7 w-7 text-primary" /> Equipe e acessos</h2><p className="mt-1 text-muted-foreground">Cada pessoa entra por “Sou colaborador” usando CNPJ, usuário e PIN. A senha principal da empresa permanece privada.</p></div>
      {!access?.enabled ? <Card><CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="text-primary" /> Ativar controle de acessos</CardTitle><CardDescription>Crie primeiro o PIN privado do responsável. Somente ele poderá editar o perfil da empresa, excluir a conta e acessar a futura área financeira.</CardDescription></CardHeader><CardContent><form onSubmit={enable} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>PIN do responsável</Label><PinField value={ownerPin} onChange={setOwnerPin} /></div><div className="space-y-2"><Label>Confirmar PIN</Label><PinField value={ownerPinConfirmation} onChange={setOwnerPinConfirmation} /></div></div>{error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}<Button disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}Ativar e continuar</Button></form></CardContent></Card> : <>
        <Card><CardHeader className="flex-row items-start justify-between gap-3"><div><CardTitle>Pessoas da equipe</CardTitle><CardDescription>{operators.filter(item => item.active).length} acesso(s) ativo(s)</CardDescription></div><Button onClick={() => { setError(''); setForm(emptyOperator()); }}><Plus className="mr-2 h-4 w-4" />Adicionar</Button></CardHeader><CardContent className="space-y-3">{loading ? <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" /> : operators.length === 0 ? <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">Nenhuma pessoa cadastrada. Adicione quem trabalha na empresa.</p> : operators.map(operator => <div key={operator.id} className="flex flex-col justify-between gap-3 rounded-xl border border-border p-4 sm:flex-row sm:items-center"><div><p className="font-bold">{operator.name}</p><p className="text-sm text-muted-foreground">Usuário: {operator.username} {operator.active ? '' : '· Desativado'}</p><p className="text-xs text-muted-foreground">{operator.contactEmail}</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => copyAccess(operator)}><Copy className="mr-1 h-4 w-4" />Copiar</Button><Button variant="outline" size="sm" onClick={() => { setError(''); setForm({ ...operator, contactEmail: operator.contactEmail || '', pin: generateCompanyPin() }); }}><RefreshCw className="mr-1 h-4 w-4" />{operator.active ? 'Novo PIN' : 'Reativar'}</Button>{operator.active && <Button variant="outline" size="sm" onClick={() => disable(operator)} className="text-destructive"><UserMinus className="mr-1 h-4 w-4" />Desativar</Button>}</div></div>)}</CardContent></Card>
        <Card><CardHeader><CardTitle>Acessos em uso</CardTitle><CardDescription>{sessions.length} de {access?.maxConcurrentAccesses || 1} acesso(s) simultâneo(s) contratado(s). Os acessos inativos são liberados automaticamente.</CardDescription></CardHeader><CardContent className="space-y-3">{sessions.map(session => <div key={session.id} className="flex items-center justify-between gap-3 rounded-xl border border-border p-4"><div><p className="font-bold">{session.accessRole === 'owner' ? 'Responsável' : session.operatorName}</p><p className="text-sm text-muted-foreground">{session.deviceName}{session.currentSession ? ' · Este dispositivo' : ''}</p></div>{!session.currentSession && <Button variant="outline" size="sm" onClick={() => revoke(session)}><LogOut className="mr-1 h-4 w-4" />Encerrar</Button>}</div>)}</CardContent></Card>
      </>}
      {form && <Card className="border-primary/40"><CardHeader><CardTitle>{form.id ? 'Definir novo PIN' : 'Adicionar pessoa'}</CardTitle><CardDescription>O usuário é sugerido pelo sistema. Os dados serão enviados ao email informado e o PIN não poderá ser consultado depois.</CardDescription></CardHeader><CardContent><form onSubmit={saveOperator} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>Nome completo</Label><Input value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value, ...(!current.id ? { username: suggestUsername(event.target.value, operators) } : {}) }))} /></div><div className="space-y-2"><Label>Email para receber o acesso</Label><Input type="email" value={form.contactEmail} onChange={event => setForm(current => ({ ...current, contactEmail: event.target.value }))} /></div></div><div className="space-y-2"><Label>Nome de usuário</Label><Input autoCapitalize="none" value={form.username} onChange={event => setForm(current => ({ ...current, username: event.target.value.toLowerCase().replace(/\s/g, '') }))} /></div><div className="space-y-2"><Label>PIN de 6 números</Label><div className="flex gap-2"><div className="flex-1"><PinField value={form.pin} onChange={pin => setForm(current => ({ ...current, pin }))} /></div><Button type="button" variant="outline" onClick={() => setForm(current => ({ ...current, pin: generateCompanyPin() }))}>Gerar</Button></div></div>{error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}<div className="flex gap-2"><Button disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar e enviar</Button><Button type="button" variant="ghost" onClick={() => setForm(null)}>Cancelar</Button></div></form></CardContent></Card>}
    </main>
  </div>;
};

export default CompanyTeamManagement;
