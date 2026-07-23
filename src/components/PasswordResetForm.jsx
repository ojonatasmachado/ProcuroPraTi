import React, { useMemo, useState } from 'react';
import { CheckCircle2, Eye, EyeOff, Loader2, LockKeyhole, XCircle } from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';
import ThemeToggle from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const PasswordResetForm = ({ onSubmit, onCancel }) => {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const rules = useMemo(() => [
    { label: 'Pelo menos 8 caracteres', valid: password.length >= 8 },
    { label: 'Uma letra maiúscula e uma minúscula', valid: /[A-Z]/.test(password) && /[a-z]/.test(password) },
    { label: 'Pelo menos um número', valid: /\d/.test(password) },
    { label: 'Pelo menos um caractere especial', valid: /[^A-Za-z0-9]/.test(password) },
  ], [password]);
  const validPassword = rules.every(rule => rule.valid);
  const passwordsMatch = confirmation.length > 0 && password === confirmation;

  const submit = async (event) => {
    event.preventDefault();
    if (!validPassword) {
      setError('A nova senha ainda não atende a todos os requisitos.');
      document.getElementById('newPassword')?.focus();
      return;
    }
    if (!passwordsMatch) {
      setError('As senhas não coincidem.');
      document.getElementById('newPasswordConfirmation')?.focus();
      return;
    }
    setError('');
    setIsSubmitting(true);
    const saved = await onSubmit(password);
    if (!saved) setIsSubmitting(false);
  };

  return <div className="flex min-h-screen min-h-[100dvh] flex-col bg-background p-3 text-foreground sm:p-4">
    <header className="safe-header sticky top-0 z-50 mx-auto flex w-full max-w-2xl items-center justify-between border-b border-border bg-background/95 py-3 backdrop-blur">
      <BrandLogo as="h1" iconClassName="h-10 w-10" textClassName="text-xl sm:text-2xl" />
      <ThemeToggle />
    </header>
    <main className="mx-auto flex w-full max-w-md flex-1 items-center py-6">
      <Card className="w-full border-border bg-card shadow-lg">
        <CardHeader className="text-center">
          <span className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10"><LockKeyhole className="h-6 w-6 text-primary" /></span>
          <CardTitle className="text-2xl">Crie sua nova senha</CardTitle>
          <CardDescription>Escolha uma senha segura para voltar a acessar sua conta.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4" noValidate>
            {error && <p role="alert" className="rounded-lg border border-danger/30 bg-destructive/10 p-3 text-sm font-medium text-danger">{error}</p>}
            <div>
              <Label htmlFor="newPassword" className="mb-1.5 block text-sm text-muted-foreground">Nova senha *</Label>
              <div className="relative min-w-0 overflow-hidden rounded-[10px]">
                <Input id="newPassword" type={showPassword ? 'text' : 'password'} style={{ WebkitTextSecurity: showPassword ? 'none' : 'disc' }} value={password} onChange={(event) => { setPassword(event.target.value); setError(''); }} autoComplete="new-password" className="h-11 pr-12" autoFocus />
                <button type="button" onClick={() => setShowPassword(value => !value)} className="touch-manipulation absolute right-1 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={showPassword}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
              </div>
              <div className="mt-2 grid gap-1.5 rounded-lg border border-border bg-input/40 p-3">
                {rules.map(rule => <p key={rule.label} className={`flex items-center gap-2 text-xs ${rule.valid ? 'text-accent-agile' : 'text-muted-foreground'}`}>{rule.valid ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}{rule.label}</p>)}
              </div>
            </div>
            <div>
              <Label htmlFor="newPasswordConfirmation" className="mb-1.5 block text-sm text-muted-foreground">Confirmar nova senha *</Label>
              <div className="relative min-w-0 overflow-hidden rounded-[10px]">
                <Input id="newPasswordConfirmation" type={showConfirmation ? 'text' : 'password'} style={{ WebkitTextSecurity: showConfirmation ? 'none' : 'disc' }} value={confirmation} onChange={(event) => { setConfirmation(event.target.value); setError(''); }} autoComplete="new-password" className="h-11 pr-12" />
                <button type="button" onClick={() => setShowConfirmation(value => !value)} className="touch-manipulation absolute right-1 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-label={showConfirmation ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={showConfirmation}>{showConfirmation ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
              </div>
              {confirmation && <p className={`mt-1.5 text-xs font-medium ${passwordsMatch ? 'text-accent-agile' : 'text-danger'}`}>{passwordsMatch ? 'As senhas são iguais.' : 'As senhas não são iguais.'}</p>}
            </div>
            <Button type="submit" disabled={isSubmitting} className="h-11 w-full bg-primary font-semibold text-primary-foreground hover:bg-primary/90">{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar nova senha</Button>
            <Button type="button" variant="outline" disabled={isSubmitting} onClick={onCancel} className="h-11 w-full">Cancelar</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  </div>;
};

export default PasswordResetForm;
