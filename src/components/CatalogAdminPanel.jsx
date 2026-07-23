import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Edit3, Link2, Loader2, PackagePlus, RefreshCw, Search, Slash, Tags } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';

const CATEGORIES = ['Motor', 'Transmissão', 'Freios', 'Suspensão', 'Direção', 'Elétrica', 'Iluminação', 'Carroceria', 'Arrefecimento', 'Escape', 'Pneus', 'Rodas e calotas', 'Acessórios', 'Áudio', 'Segurança', 'Personalização', 'Outros'];
const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const splitList = value => value.split(',').map(item => item.trim()).filter(Boolean);

const emptyEditor = { id: null, submissionId: null, name: '', aliasesText: '', primaryCategory: 'Outros', secondaryText: '', vehicleTypes: ['car'], isHighValue: false, active: true, adminNotes: '' };

const CatalogAdminPanel = () => {
  const [submissions, setSubmissions] = useState([]);
  const [parts, setParts] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editor, setEditor] = useState(null);
  const [linking, setLinking] = useState(null);
  const [linkSearch, setLinkSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin-catalog?status=${encodeURIComponent(status)}&search=${encodeURIComponent(search)}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Não foi possível carregar o catálogo.');
      setSubmissions(payload.submissions || []);
      setParts(payload.parts || []);
    } catch (error) {
      toast({ title: 'Falha ao carregar o catálogo', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    const timer = window.setTimeout(load, 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  const request = async body => {
    setSaving(true);
    try {
      const response = await fetch('/api/admin-catalog', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Não foi possível salvar.');
      toast({ title: 'Catálogo atualizado', description: 'A alteração vale para as próximas procuras.' });
      setEditor(null);
      setLinking(null);
      await load();
    } catch (error) {
      toast({ title: 'Não foi possível atualizar', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const openSubmission = submission => setEditor({
    ...emptyEditor,
    submissionId: submission.id,
    name: submission.latest_term,
    aliasesText: (submission.sample_terms || []).filter(term => term !== submission.latest_term).join(', '),
    primaryCategory: submission.suggested_category || 'Outros',
    vehicleTypes: submission.vehicle_types?.length ? submission.vehicle_types : ['car'],
  });

  const openPart = part => setEditor({
    id: part.id,
    submissionId: null,
    name: part.name,
    aliasesText: (part.aliases || []).join(', '),
    primaryCategory: part.primary_category || part.category_name || 'Outros',
    secondaryText: (part.secondary_categories || []).join(', '),
    vehicleTypes: part.vehicle_types || ['car'],
    isHighValue: Boolean(part.is_high_value),
    active: Boolean(part.active),
    adminNotes: part.admin_notes || '',
  });

  const similarParts = useMemo(() => {
    if (!linking) return [];
    const term = normalize(linkSearch || linking.latest_term);
    const words = term.split(' ').filter(Boolean);
    return parts.filter(part => {
      const searchable = normalize(`${part.name} ${(part.aliases || []).join(' ')}`);
      return words.some(word => word.length > 2 && searchable.includes(word));
    }).slice(0, 12);
  }, [linking, linkSearch, parts]);

  const saveEditor = () => {
    const common = {
      name: editor.name.trim(),
      normalizedName: normalize(editor.name),
      aliases: splitList(editor.aliasesText),
      primaryCategory: editor.primaryCategory,
      secondaryCategories: splitList(editor.secondaryText),
      vehicleTypes: editor.vehicleTypes,
      isHighValue: editor.isHighValue,
      active: editor.active,
      adminNotes: editor.adminNotes.trim() || null,
    };
    request(editor.id
      ? { action: 'update', partId: editor.id, ...common }
      : { action: editor.submissionId ? 'approve_new' : 'add', submissionId: editor.submissionId, ...common });
  };

  return (
    <div className="space-y-4">
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div><CardTitle className="flex items-center gap-2 text-xl"><Tags className="h-5 w-5 text-primary" />Catálogo de peças</CardTitle><p className="mt-1 text-sm text-muted-foreground">Revise nomes digitados, sinônimos, categorias e itens de alto valor.</p></div>
            <Button type="button" onClick={() => setEditor(emptyEditor)}><PackagePlus className="mr-2 h-4 w-4" />Adicionar item</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-[1fr_180px_auto]">
            <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar nome, similar ou sinônimo" className="pl-9" /></div>
            <Select value={status} onValueChange={setStatus}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pending">Pendentes</SelectItem><SelectItem value="approved">Aprovados</SelectItem><SelectItem value="linked">Vinculados</SelectItem><SelectItem value="ignored">Ignorados</SelectItem><SelectItem value="all">Todos</SelectItem></SelectContent></Select>
            <Button type="button" variant="outline" onClick={load} disabled={loading}><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></Button>
          </div>
        </CardContent>
      </Card>

      {loading ? <div className="flex justify-center py-12"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div> : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="border-border bg-card"><CardHeader><CardTitle className="text-base">Fila de revisão <Badge variant="secondary">{submissions.length}</Badge></CardTitle></CardHeader><CardContent className="space-y-2">
            {submissions.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Nenhum item neste estado.</p>}
            {submissions.map(item => <div key={item.id} className="rounded-xl border border-border p-3"><div className="flex items-start justify-between gap-2"><div><p className="font-extrabold">{item.latest_term}</p><p className="text-xs text-muted-foreground">{item.occurrences} ocorrência(s) · {(item.vehicle_types || []).join(', ')}</p></div><Badge variant="outline">{item.status}</Badge></div><div className="mt-3 grid grid-cols-3 gap-2"><Button size="sm" onClick={() => openSubmission(item)}><Check className="mr-1 h-4 w-4" />Novo</Button><Button size="sm" variant="outline" onClick={() => { setLinking(item); setLinkSearch(item.latest_term); }}><Link2 className="mr-1 h-4 w-4" />Similar</Button><Button size="sm" variant="ghost" onClick={() => request({ action: 'ignore', submissionId: item.id })}><Slash className="mr-1 h-4 w-4" />Ignorar</Button></div></div>)}
          </CardContent></Card>

          <Card className="border-border bg-card"><CardHeader><CardTitle className="text-base">Itens cadastrados <Badge variant="secondary">{parts.length}</Badge></CardTitle></CardHeader><CardContent className="space-y-2">
            {parts.map(part => <button key={part.id} type="button" onClick={() => openPart(part)} className="flex w-full items-start justify-between gap-3 rounded-xl border border-border p-3 text-left transition-colors hover:border-primary/50 hover:bg-primary/5"><div><p className="font-bold">{part.name}</p><p className="mt-1 text-xs text-muted-foreground">{part.primary_category || part.category_name} · {(part.vehicle_types || []).join(', ')}</p>{part.aliases?.length > 0 && <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">Também: {part.aliases.join(', ')}</p>}</div><div className="flex shrink-0 gap-1">{part.admin_locked && <Badge variant="outline">Manual</Badge>}{!part.active && <Badge variant="secondary">Inativo</Badge>}<Edit3 className="h-4 w-4 text-primary" /></div></button>)}
          </CardContent></Card>
        </div>
      )}

      <Dialog open={Boolean(editor)} onOpenChange={open => { if (!open) setEditor(null); }}>
        <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto bg-card text-foreground">
          <DialogHeader><DialogTitle>{editor?.id ? 'Editar item do catálogo' : editor?.submissionId ? 'Aprovar como novo item' : 'Adicionar item'}</DialogTitle></DialogHeader>
          {editor && <div className="grid gap-4">
            <div><Label>Nome principal *</Label><Input value={editor.name} onChange={event => setEditor({ ...editor, name: event.target.value })} /></div>
            <div><Label>Sinônimos separados por vírgula</Label><Input value={editor.aliasesText} onChange={event => setEditor({ ...editor, aliasesText: event.target.value })} placeholder="Ex: farol auxiliar, luz de neblina" /></div>
            <div><Label>Categoria principal</Label><Select value={editor.primaryCategory} onValueChange={value => setEditor({ ...editor, primaryCategory: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CATEGORIES.map(category => <SelectItem key={category} value={category}>{category}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Categorias secundárias separadas por vírgula</Label><Input value={editor.secondaryText} onChange={event => setEditor({ ...editor, secondaryText: event.target.value })} /></div>
            <div><Label>Tipos de veículo</Label><div className="mt-2 grid grid-cols-2 gap-2">{[['car', 'Carro'], ['motorcycle', 'Moto'], ['truck', 'Caminhão'], ['bus', 'Ônibus']].map(([value, label]) => <label key={value} className="flex items-center gap-2 rounded-lg border border-border p-2 text-sm"><Checkbox checked={editor.vehicleTypes.includes(value)} onCheckedChange={checked => setEditor({ ...editor, vehicleTypes: checked ? [...new Set([...editor.vehicleTypes, value])] : editor.vehicleTypes.filter(item => item !== value) })} />{label}</label>)}</div></div>
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={editor.isHighValue} onCheckedChange={isHighValue => setEditor({ ...editor, isHighValue: Boolean(isHighValue) })} />Item de alto valor</label>
            {editor.id && <label className="flex items-center gap-2 text-sm"><Checkbox checked={editor.active} onCheckedChange={active => setEditor({ ...editor, active: Boolean(active) })} />Ativo nas próximas procuras</label>}
            <div><Label>Observação administrativa</Label><Textarea value={editor.adminNotes} onChange={event => setEditor({ ...editor, adminNotes: event.target.value })} /></div>
          </div>}
          <DialogFooter><Button variant="outline" onClick={() => setEditor(null)}>Cancelar</Button><Button disabled={saving || !editor?.name.trim()} onClick={saveEditor}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(linking)} onOpenChange={open => { if (!open) setLinking(null); }}>
        <DialogContent className="max-w-lg bg-card text-foreground">
          <DialogHeader><DialogTitle>Vincular “{linking?.latest_term}” a um item</DialogTitle></DialogHeader>
          <Input value={linkSearch} onChange={event => setLinkSearch(event.target.value)} placeholder="Buscar item similar" />
          <div className="max-h-72 space-y-2 overflow-y-auto">{similarParts.map(part => <button key={part.id} type="button" onClick={() => request({ action: 'link', submissionId: linking.id, partId: part.id })} disabled={saving} className="flex w-full items-center justify-between rounded-lg border border-border p-3 text-left hover:border-primary"><span><strong className="block">{part.name}</strong><small className="text-muted-foreground">{(part.aliases || []).join(', ')}</small></span><Link2 className="h-4 w-4 text-primary" /></button>)}{similarParts.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Nenhum similar encontrado. Aprove como novo item.</p>}</div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CatalogAdminPanel;
