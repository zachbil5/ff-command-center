'use client';
// "Continue with Google": asks Better Auth for the Google URL, then navigates there.
// Better Auth adds OAuth state and PKCE; errors come back to /sign-in?error=… (DESIGN R6).
import { createAuthClient } from 'better-auth/react';
import { useState } from 'react';

const authClient = createAuthClient();

export function GoogleSignInButton({ callbackPath }: { callbackPath: string }) {
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        setPending(true);
        void authClient.signIn
          .social({ provider: 'google', callbackURL: callbackPath, errorCallbackURL: '/sign-in' })
          .finally(() => {
            setPending(false);
          });
      }}
      className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 py-2.5 font-medium hover:border-accent disabled:opacity-60"
    >
      <span aria-hidden className="font-bold">
        G
      </span>
      {pending ? 'Opening Google…' : 'Continue with Google'}
    </button>
  );
}
