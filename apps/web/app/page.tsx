'use client';
import Link from 'next/link';
import { useAuth } from '../lib/auth-context';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Spade } from '../components/brand';

const FAN = ['3', '5', '8', '13', '?'];

export default function Home() {
  const { user, loading } = useAuth();

  return (
    <main className="relative mx-auto flex min-h-dvh max-w-6xl flex-col px-6">
      <header className="flex items-center justify-between py-7">
        <div className="flex items-center gap-2.5 font-display text-lg">
          <Spade className="size-6 text-[--color-gold]" />
          <span className="tracking-tight">Scrum Poker</span>
        </div>
        {!loading && !user && (
          <Link href="/login" className="text-sm text-[--color-muted] transition-colors hover:text-[--color-fg]">
            Iniciar sesión
          </Link>
        )}
      </header>

      <section className="grid flex-1 items-center gap-12 py-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="animate-rise">
          <Badge tone="felt" className="mb-6">
            <span className="size-1.5 rounded-full bg-[--color-felt] animate-pulse-ring" />
            Estimación en tiempo real
          </Badge>
          <h1 className="font-display text-5xl leading-[0.95] sm:text-6xl md:text-7xl">
            Planifica.
            <br />
            <span className="italic text-gold-gradient">Vota.</span> Estima.
          </h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-[--color-muted]">
            Planning poker sin fricción para equipos ágiles. Crea una sala, invita a tu
            equipo y llega a un consenso en segundos.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            {loading ? (
              <div className="h-11 w-40 animate-pulse rounded-[--radius] bg-[--color-surface]" />
            ) : user ? (
              <Link href="/dashboard">
                <Button size="lg">Ir al dashboard →</Button>
              </Link>
            ) : (
              <>
                <Link href="/register">
                  <Button size="lg">Crear cuenta gratis</Button>
                </Link>
                <Link href="/login">
                  <Button size="lg" variant="outline">
                    Ya tengo cuenta
                  </Button>
                </Link>
              </>
            )}
          </div>
          <div className="mt-10 flex items-center gap-6 text-xs uppercase tracking-[0.18em] text-[--color-faint]">
            <span>Fibonacci</span>
            <span className="h-3 w-px bg-[--color-border-hi]" />
            <span>Tiempo real</span>
            <span className="h-3 w-px bg-[--color-border-hi]" />
            <span>Sin instalación</span>
          </div>
        </div>

        {/* Fanned deck */}
        <div className="relative hidden h-80 items-center justify-center lg:flex">
          <div className="absolute size-72 rounded-full bg-[--color-felt]/15 blur-3xl" />
          {FAN.map((v, i) => {
            const mid = (FAN.length - 1) / 2;
            const rot = (i - mid) * 11;
            const y = Math.abs(i - mid) * 14;
            return (
              <div
                key={v}
                className="animate-flip absolute grid h-44 w-32 place-items-center rounded-2xl border border-[--color-border-hi] bg-gradient-to-b from-[--color-surface-hi] to-[--color-surface] shadow-[var(--shadow-card)]"
                style={{
                  transform: `rotate(${rot}deg) translateY(${y}px)`,
                  animationDelay: `${i * 90}ms`,
                }}
              >
                <span className="absolute left-3 top-2 font-mono text-xs text-[--color-faint]">{v}</span>
                <span className="font-display text-4xl text-gold-gradient">{v}</span>
                <Spade className="absolute bottom-2 right-3 size-3.5 text-[--color-felt]" />
              </div>
            );
          })}
        </div>
      </section>

      <footer className="py-8 text-center text-xs text-[--color-faint]">
        Hecho para equipos que odian las reuniones largas.
      </footer>
    </main>
  );
}
