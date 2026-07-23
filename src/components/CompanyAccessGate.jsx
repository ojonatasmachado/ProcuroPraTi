import React, { useState } from 'react';
import { Building2, Eye, EyeOff, Loader2, LogOut, ShieldCheck, User } from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';
import ThemeToggle from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const CompanyAccessGate = ({ company, access, onClaim, onLogout }) => {
  const [mode, setMode] = useState('operator');
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (mode === 'operator') {
      if (username.trim().length < 3) {
        setError('Informe o usuário que o responsável da empresa criou para você.');
        return;
      }
      if (!/^\d{6}$/.test(pin)) {
        setError('Informe o PIN de 6 números.');
        return;
      }
    }
    setSubmitting(true);
    try {
      await onClaim({ mode, username: username.trim(), pin });
    } catch (claimError) {
      setError(claimError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="safe-header sticky top-0 z-50 border-b border-border bg-card px-3 py-3 shadow-sm">
        <div className="container mx-auto flex items-center justify-between gap-3">
          <BrandLogo compactOnMobile iconClassName="h-10 w-10" textClassName="text-xl sm:text-2xl" />
          <ThemeToggle />
        </div>
      </header>
      <main className="container mx-auto flex min-h-[calc(100vh-76px)] max-w-lg items-center px-4 py-8">
        <Card className="w-full border-border shadow-lg">
          <CardHeader className="space-y-3 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <CardTitle className="text-2xl">Quem está acessando?</CardTitle>
            <CardDescription className="text-base">
              Você entrou na conta de <strong className="text-foreground">{company?.name}</strong>. Agora use seu acesso individual.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-5 grid grid-cols-2 rounded-xl border border-border bg-muted p-1">
              <Button type="button" variant={mode === 'operator' ? 'default' : 'ghost'} onClick={() => { setMode('operator'); setError(''); }} className="gap-2">
                <User className="h-4 w-4" /> Equipe
              </Button>
              <Button type="button" variant={mode === 'owner' ? 'default' : 'ghost'} onClick={() => { setMode('owner'); setError(''); }} className="gap-2">
                <Building2 className="h-4 w-4" /> Responsável
              </Button>
            </div>
            <form onSubmit={submit} className="space-y-4" noValidate>
              {mode === 'operator' ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="team-username">Seu usuário</Label>
                    <Input id="team-username" autoCapitalize="none" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Ex: JOAO" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="team-pin">PIN de acesso</Label>
                    <div className="relative min-w-0 overflow-hidden rounded-[10px]">
                      <Input id="team-pin" type={showPin ? 'text' : 'password'} style={{ WebkitTextSecurity: showPin ? 'none' : 'disc' }} inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6 números" className="pr-12 tracking-[0.3em]" />
                      <button type="button" onClick={() => setShowPin(value => !value)} className="touch-manipulation absolute right-1 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-label={showPin ? 'Ocultar PIN' : 'Mostrar PIN'} aria-pressed={showPin}>
                        {showPin ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Você já está identificado pelo login da empresa. Não precisa de PIN — é só continuar.
                </p>
              )}
              {error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Liberando acesso...</> : 'Entrar'}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                {access?.activeAccesses || 0} de {access?.maxConcurrentAccesses || 1} acesso(s) do plano em uso.
              </p>
            </form>
            <Button type="button" variant="ghost" onClick={onLogout} className="mt-4 w-full gap-2 text-muted-foreground">
              <LogOut className="h-4 w-4" /> Usar outro email
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default CompanyAccessGate;
