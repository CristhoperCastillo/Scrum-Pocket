import { AuthProvider } from '../lib/auth-context';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es"><body><AuthProvider>{children}</AuthProvider></body></html>
  );
}
