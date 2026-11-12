// Facade for @ffc/db: the only import path other packages may use (DESIGN §4).
export { getDatabase, type Database, type DatabaseKind, type Schema } from './client';
export * as schema from './schema';
export { markCelebrated, unseenWins, type LeagueWeekKey } from './repos/celebrations';
export {
  addInvite,
  canSignUp,
  listInvites,
  normalizeEmail,
  removeInvite,
  type AddInviteResult,
} from './repos/invites';
export {
  getLinkedAccount,
  removeLinkedAccount,
  saveLinkedAccount,
  type LinkedAccount,
} from './repos/linked-accounts';
