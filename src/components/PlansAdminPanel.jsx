import React, { useMemo, useState } from 'react';
import { CalendarPlus, Gift, Loader2, Search, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { SUBSCRIPTION_PLANS } from '@/lib/subscriptionPlans';

const PlansAdminPanel = ({ companies = [] }) => {
  const [search, setSearch] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [action, setAction] = useState('extend_trial');
  const [planCode, setPlanCode] = useState('multiregional');
  const [durationDays, setDurationDays] = useState('30');
  const [indefinite, setIndefinite] = useState(false);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => companies.filter(company => {
    const term = search.toLowerCase();
    return !term || company.name?.toLowerCase().includes(term) || company.cnpj?.includes(search) || company.email?.toLowerCase().includes(term);
  }).slice(0, 30), [companies, search]);
  const selected = companies.find(company => company.id === companyId);

  const submit = async () => {
    if (!companyId || !reason.trim()) {
      toast({ title: 'Complete os campos', description: 'Selecione a empresa e informe a justificativa.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const response = await fetch('/api/admin-entitlements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, action, planCode, durationDays, indefinite, reason }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Não foi possível registrar o benefício.');
      toast({ title: 'Benefício aplicado', description: 'A empresa foi atualizada e o histórico administrativo foi registrado.' });
      setReason('');
    } catch (error) {
      toast({ title: 'Não foi possível aplicar', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
      <Card className="border-border bg-card">
        <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Search className="h-5 w-5 text-primary" />Selecionar empresa</CardTitle></CardHeader>
        <CardContent>
          <Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar por nome, CNPJ ou email" />
          <div className="mt-3 max-h-[520px] space-y-2 overflow-y-auto">
            {filtered.map(company => <button key={company.id} type="button" onClick={() => setCompanyId(company.id)} className={`w-full rounded-xl border p-3 text-left transition-colors ${companyId === company.id ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/40'}`}><strong className="block">{company.name}</strong><span className="text-xs text-muted-foreground">{company.cnpj || 'CNPJ não informado'} · {company.email}</span></button>)}
          </div>
        </CardContent>
      </Card>

      <Card className="h-fit border-border bg-card">
        <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Gift className="h-5 w-5 text-accent-agile" />Benefício administrativo</CardTitle>{selected && <p className="text-sm font-semibold text-primary">{selected.name}</p>}</CardHeader>
        <CardContent className="space-y-4">
          <div><Label>Tipo de ajuste</Label><Select value={action} onValueChange={setAction}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="extend_trial">Prorrogar trial</SelectItem><SelectItem value="grant_plan">Conceder plano sem cobrança</SelectItem><SelectItem value="billing_pause">Presente, abono ou promoção</SelectItem></SelectContent></Select></div>
          {action === 'grant_plan' && <div><Label>Plano</Label><Select value={planCode} onValueChange={setPlanCode}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{SUBSCRIPTION_PLANS.map(plan => <SelectItem key={plan.code} value={plan.code}>{plan.name}</SelectItem>)}</SelectContent></Select></div>}
          {!indefinite && <div><Label>Duração em dias</Label><Input type="number" min="1" value={durationDays} onChange={event => setDurationDays(event.target.value)} /></div>}
          {action === 'grant_plan' && <label className="flex items-center gap-2 text-sm"><Checkbox checked={indefinite} onCheckedChange={value => setIndefinite(Boolean(value))} />Concessão sem data de término</label>}
          <div><Label>Justificativa obrigatória</Label><Textarea value={reason} onChange={event => setReason(event.target.value)} placeholder="Ex: parceria de lançamento, abono comercial..." /></div>
          <Button onClick={submit} disabled={saving || !companyId} className="w-full">{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : action === 'extend_trial' ? <CalendarPlus className="mr-2 h-4 w-4" /> : <ShieldCheck className="mr-2 h-4 w-4" />}Aplicar e registrar</Button>
          <p className="text-xs leading-5 text-muted-foreground">Todo ajuste é gravado com empresa, período, motivo e origem administrativa.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlansAdminPanel;
