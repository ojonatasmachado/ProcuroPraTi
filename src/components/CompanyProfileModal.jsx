import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Building2, BadgeCheck, Star, Zap, MapPin, Phone, Smartphone, Car, Bike, Truck, Bus, CalendarDays } from 'lucide-react';

const VEHICLE_TYPE_LABELS = { car: ['Carros', Car], motorcycle: ['Motos', Bike], truck: ['Caminhões', Truck], bus: ['Ônibus', Bus] };

const formatMemberSince = (createdAt) => {
  if (!createdAt) return null;
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return null;
  const formatted = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

const CompanyProfileModal = ({ company, onClose }) => {
  const memberSince = formatMemberSince(company?.createdAt);

  return (
    <Dialog open={Boolean(company)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[calc(100dvh-1rem)] max-w-lg overflow-y-auto border-border bg-card p-0 text-foreground">
        {company && <>
          <DialogHeader className="border-b border-border px-4 pb-4 pt-5 text-left sm:px-6">
            <div className="flex items-start gap-3 pr-8">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/10">
                {company.logoUrl ? <img src={company.logoUrl} alt={`Foto de ${company.name}`} className="h-full w-full object-cover" /> : <Building2 className="h-7 w-7 text-primary" />}
              </span>
              <div className="min-w-0">
                <DialogTitle className="text-left text-lg leading-tight">{company.name}</DialogTitle>
                <DialogDescription className="mt-1 text-left">Perfil da empresa</DialogDescription>
                {company.validationStatus === 'validated' && <span className="mt-1 flex items-center gap-1 text-xs font-semibold text-accent-agile"><BadgeCheck className="h-3.5 w-3.5" />Empresa verificada</span>}
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-4 px-4 py-4 sm:px-6">
            {(company.ratingCount > 0 || company.badgeFastResponder || company.badgeWellRated) && (
              <div className="flex flex-wrap gap-2 text-xs">
                {company.ratingCount > 0 && <span className="flex items-center gap-1 rounded-full bg-warning/10 px-2 py-1 font-semibold text-warning"><Star className="h-3.5 w-3.5 fill-current" />{company.avgRating} ({company.ratingCount})</span>}
                {company.badgeFastResponder && <span className="flex items-center gap-1 rounded-full bg-accent-agile/10 px-2 py-1 font-semibold text-accent-agile"><Zap className="h-3.5 w-3.5" />Responde rápido</span>}
                {company.badgeWellRated && <span className="flex items-center gap-1 rounded-full bg-accent-agile/10 px-2 py-1 font-semibold text-accent-agile"><Star className="h-3.5 w-3.5 fill-current" />Bem avaliada</span>}
              </div>
            )}
            {company.bio && <p className="rounded-xl border border-border bg-popover p-3 text-sm leading-relaxed text-foreground">{company.bio}</p>}
            <div className="grid gap-3 rounded-xl border border-border bg-popover p-4 text-sm">
              <div className="flex items-start gap-3"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><div><p className="text-xs text-muted-foreground">Endereço</p><p className="font-medium text-foreground">{company.address || 'Não informado'}</p></div></div>
              <div className="flex items-start gap-3"><Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><div><p className="text-xs text-muted-foreground">Telefone</p>{company.phone ? <a href={`tel:${company.phone}`} className="font-semibold text-primary underline-offset-2 hover:underline">{company.phone}</a> : <p className="font-medium text-foreground">Não informado</p>}</div></div>
              {company.whatsapp && <div className="flex items-start gap-3"><Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-accent-agile" /><div><p className="text-xs text-muted-foreground">WhatsApp</p><a href={`https://wa.me/55${company.whatsapp.replace(/\D/g, '').replace(/^55/, '')}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-accent-agile underline-offset-2 hover:underline">{company.whatsapp}</a></div></div>}
              {memberSince && <div className="flex items-start gap-3"><CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><div><p className="text-xs text-muted-foreground">Na plataforma desde</p><p className="font-medium text-foreground">{memberSince}</p></div></div>}
            </div>
            {Array.isArray(company.vehicleTypes) && company.vehicleTypes.length > 0 && (
              <div>
                <p className="mb-2 text-xs text-muted-foreground">Atende</p>
                <div className="flex flex-wrap gap-2">
                  {company.vehicleTypes.map(type => {
                    const entry = VEHICLE_TYPE_LABELS[type];
                    if (!entry) return null;
                    const [label, Icon] = entry;
                    return <span key={type} className="flex items-center gap-1 rounded-full bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground"><Icon className="h-3.5 w-3.5" />{label}</span>;
                  })}
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="border-t border-border px-4 py-4 sm:px-6">
            <Button type="button" variant="outline" onClick={onClose} className="w-full">Fechar</Button>
          </DialogFooter>
        </>}
      </DialogContent>
    </Dialog>
  );
};

export default CompanyProfileModal;
