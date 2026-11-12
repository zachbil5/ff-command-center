// Invite list for the owner's page (DESIGN §6.1). Not a server action module: reads stay off the
// public action surface, and the owner check happens here as well as on the page.
import { getDatabase, listInvites } from '@ffc/db';
import { requireOwner } from '../auth';

export async function loadInvites() {
  await requireOwner();
  const { db } = await getDatabase();
  return listInvites(db);
}
