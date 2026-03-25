import type { Metadata } from 'next';
import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  UserButton,
} from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server';
import './globals.css';

export const metadata: Metadata = {
  title: 'Coach Journal',
  description: 'Basketball coaching workspace for training, games, and reflection',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { userId } = await auth();

  return (
    <html lang="en">
      <body>
        <ClerkProvider>
          <header className="site-header">
            <div>
              <p className="brand-mark">Coach Journal</p>
              <p className="brand-subtitle">Basketball coaching HQ</p>
            </div>
            <div className="header-actions">
              {!userId ? (
                <>
                  <SignInButton>
                    <button className="secondary-button">Sign in</button>
                  </SignInButton>
                  <SignUpButton>
                    <button className="primary-button">Start now</button>
                  </SignUpButton>
                </>
              ) : (
                <UserButton />
              )}
            </div>
          </header>
          <div className="page-shell">{children}</div>
        </ClerkProvider>
      </body>
    </html>
  );
}
