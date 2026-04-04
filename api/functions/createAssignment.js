// api/functions/createAssignment.js
// Teacher pushes an assignment to all students in a classroom.
// Requires SUPABASE_SERVICE_ROLE_KEY to bypass RLS and write on behalf of each student.

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY is not configured' });
  }

  // Authenticate the teacher
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/, '');

  const anonClient = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY,
  );

  const { data: { user }, error: userError } = await anonClient.auth.getUser(token);
  if (userError || !user?.email) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { classroom_id, title, description, due_date, due_time, type, estimated_time, notes, category } = req.body || {};

  if (!classroom_id || !title) {
    return res.status(400).json({ error: 'classroom_id and title are required' });
  }

  // Use service-role client to bypass RLS
  const adminClient = createClient(
    process.env.VITE_SUPABASE_URL,
    serviceRoleKey,
  );

  // Fetch the classroom to verify teacher owns it and get student list
  const { data: classroom, error: classroomError } = await adminClient
    .from('classrooms')
    .select('teacher_email, student_emails')
    .eq('id', classroom_id)
    .single();

  if (classroomError || !classroom) {
    return res.status(404).json({ error: 'Classroom not found' });
  }

  if (classroom.teacher_email !== user.email) {
    return res.status(403).json({ error: 'Only the classroom teacher can push assignments' });
  }

  const studentEmails = classroom.student_emails || [];
  if (studentEmails.length === 0) {
    return res.json({ data: { created: 0, message: 'No students in classroom' } });
  }

  // Also insert a classroom_assignment record for history
  await adminClient.from('classroom_assignments').insert({
    classroom_id,
    title,
    description,
    due_date,
    due_time,
    type: type || 'homework',
    estimated_time,
    created_by: user.email,
  });

  // Insert one assignment row per student
  const rows = studentEmails.map(email => ({
    title,
    description,
    due_date,
    due_time,
    type: type || 'homework',
    estimated_time,
    notes,
    category,
    source: 'classroom',
    created_by: email,
  }));

  const { error: insertError } = await adminClient.from('assignments').insert(rows);

  if (insertError) {
    console.error('createAssignment insert error:', insertError);
    return res.status(500).json({ error: insertError.message });
  }

  return res.json({ data: { created: rows.length } });
}
