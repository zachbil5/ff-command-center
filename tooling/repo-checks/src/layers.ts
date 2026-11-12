// The one home for which workspace package may depend on which (DESIGN §4).
// Read by layers.test.ts; changing a row here is a design change, so update DESIGN §4 too.

export const ALLOWED_INTERNAL_DEPS: Readonly<Record<string, readonly string[]>> = {
  '@ffc/domain': [],
  '@ffc/analysis': ['@ffc/domain'],
  '@ffc/config': ['@ffc/domain'],
  '@ffc/providers': ['@ffc/domain', '@ffc/config'],
  '@ffc/web': ['@ffc/domain', '@ffc/analysis', '@ffc/config', '@ffc/providers'],
  '@ffc/tsconfig': [],
  '@ffc/repo-checks': [],
};

/** Packages that must stay pure: no Node built-ins, no network, no framework imports. */
export const PURE_PACKAGES: readonly string[] = ['@ffc/domain', '@ffc/analysis'];

/** The only package allowed to read process.env (DESIGN §9). */
export const ENV_READER = '@ffc/config';
