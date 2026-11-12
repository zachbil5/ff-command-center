// Sleeper username search. A plain GET form: works without JavaScript, validated server-side
// by the /sleeper route handler.
export function UsernameForm({
  action,
  defaultValue = '',
}: {
  action: string;
  defaultValue?: string;
}) {
  return (
    <form action={action} method="get" className="flex flex-col gap-2 sm:flex-row">
      <label htmlFor="username" className="sr-only">
        Sleeper username
      </label>
      <input
        id="username"
        name="username"
        defaultValue={defaultValue}
        placeholder="Your Sleeper username"
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        required
        minLength={2}
        maxLength={40}
        pattern="[A-Za-z0-9_]+"
        title="Letters, numbers and underscores"
        className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2 outline-none focus:border-accent"
      />
      <button
        type="submit"
        className="rounded-lg bg-accent px-4 py-2 font-medium text-white hover:opacity-90"
      >
        Find my leagues
      </button>
    </form>
  );
}
