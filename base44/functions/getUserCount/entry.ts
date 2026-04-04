import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const users = await base44.asServiceRole.entities.User.list();
  return Response.json({ count: users.length });
});