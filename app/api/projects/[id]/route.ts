import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";
import pool from "@/lib/db";
import { requireAuth, requireWrite, formatDate } from "@/lib/api-helpers";

async function fetchProject(projectId: number) {
  const [projectRows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM projects WHERE id = ?",
    [projectId]
  );
  if (projectRows.length === 0) return null;

  const p = projectRows[0];

  const [stageRows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM stages WHERE project_id = ? ORDER BY priority, id",
    [projectId]
  );
  const [taskRows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM project_tasks WHERE project_id = ? ORDER BY id",
    [projectId]
  );

  const tasksByStage = new Map<number, any[]>();
  for (const t of taskRows) {
    const task: Record<string, unknown> = {
      id: t.id,
      name: t.name,
      description: t.description,
      assignee: t.assignee,
      deadline: formatDate(t.deadline),
      status: t.status,
      stageId: t.stage_id,
      projectId: t.project_id,
      cancelled: !!t.cancelled,
    };
    if (t.start_date) task.startDate = formatDate(t.start_date);
    if (t.due_time) task.dueTime = t.due_time;
    if (t.duration != null) task.duration = t.duration;
    if (!tasksByStage.has(t.stage_id)) tasksByStage.set(t.stage_id, []);
    tasksByStage.get(t.stage_id)!.push(task);
  }

  const stages = stageRows.map((s) => {
    const stage: Record<string, unknown> = {
      id: s.id,
      name: s.name,
      result: s.result,
      description: s.description,
      deadline: formatDate(s.deadline),
      projectId: s.project_id,
      cancelled: !!s.cancelled,
      tasks: tasksByStage.get(s.id) || [],
    };
    if (s.start_date) stage.startDate = formatDate(s.start_date);
    return stage;
  });

  return {
    id: p.id,
    name: p.name,
    goal: p.goal,
    description: p.description,
    startDate: formatDate(p.start_date),
    deadline: formatDate(p.deadline),
    priority: p.priority,
    responsible: p.responsible,
    planItemId: p.plan_item_id ?? null,
    cancelled: !!p.cancelled,
    stages,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const projectId = parseInt(id, 10);

  const project = await fetchProject(projectId);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json(project);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const writeError = requireWrite(session!.role, "projects");
  if (writeError) return writeError;

  const { id } = await params;
  const projectId = parseInt(id, 10);
  const body = await request.json();

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // 1. Update the project itself
    await conn.execute(
      "UPDATE projects SET name=?, goal=?, description=?, start_date=?, deadline=?, priority=?, responsible=?, plan_item_id=?, cancelled=? WHERE id=?",
      [body.name, body.goal, body.description, body.startDate || null, body.deadline, body.priority, body.responsible || null, body.planItemId ?? null, body.cancelled ? 1 : 0, projectId]
    );

    // 2. Get existing stage IDs for THIS project
    const [existingStageRows] = await conn.execute<RowDataPacket[]>(
      "SELECT id FROM stages WHERE project_id = ?",
      [projectId]
    );
    const existingStageIds = new Set(existingStageRows.map((r) => r.id));
    const incomingStageIds = new Set(
      (body.stages || []).filter((s: any) => s.id).map((s: any) => s.id)
    );

    // 3. Delete stages no longer present (CASCADE deletes their tasks)
    for (const existingId of existingStageIds) {
      if (!incomingStageIds.has(existingId)) {
        await conn.execute("DELETE FROM stages WHERE id = ? AND project_id = ?", [existingId, projectId]);
      }
    }

    // 4. Insert or update each stage
    for (let idx = 0; idx < (body.stages || []).length; idx++) {
      const stage = body.stages[idx];
      const stagePriority = stage.priority ?? idx;
      let stageId: number;

      if (stage.id && existingStageIds.has(stage.id)) {
        // Update existing stage (already belongs to this project)
        await conn.execute(
          "UPDATE stages SET name=?, result=?, description=?, start_date=?, deadline=?, priority=?, cancelled=? WHERE id=? AND project_id=?",
          [stage.name, stage.result, stage.description, stage.startDate || null, stage.deadline, stagePriority, stage.cancelled ? 1 : 0, stage.id, projectId]
        );
        stageId = stage.id;
      } else if (stage.id) {
        // Check if stage exists in another project (cross-project move)
        const [globalCheck] = await conn.execute<RowDataPacket[]>(
          "SELECT id, project_id FROM stages WHERE id = ?",
          [stage.id]
        );
        if (globalCheck.length > 0) {
          // Move stage from another project to this one
          await conn.execute(
            "UPDATE stages SET project_id=?, name=?, result=?, description=?, start_date=?, deadline=?, priority=?, cancelled=? WHERE id=?",
            [projectId, stage.name, stage.result, stage.description, stage.startDate || null, stage.deadline, stagePriority, stage.cancelled ? 1 : 0, stage.id]
          );
          // Also update all tasks' project_id
          await conn.execute(
            "UPDATE project_tasks SET project_id=? WHERE stage_id=?",
            [projectId, stage.id]
          );
          stageId = stage.id;
        } else {
          // Insert new stage with client-provided id
          await conn.execute(
            "INSERT INTO stages (id, name, result, description, start_date, deadline, project_id, priority, cancelled) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [stage.id, stage.name, stage.result, stage.description, stage.startDate || null, stage.deadline, projectId, stagePriority, stage.cancelled ? 1 : 0]
          );
          stageId = stage.id;
        }
      } else {
        // Insert new stage with auto-increment
        const [result] = await conn.execute(
          "INSERT INTO stages (name, result, description, start_date, deadline, project_id, priority, cancelled) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          [stage.name, stage.result, stage.description, stage.startDate || null, stage.deadline, projectId, stagePriority, stage.cancelled ? 1 : 0]
        );
        stageId = (result as any).insertId;
      }

      // 5. Handle tasks for this stage
      const [existingTaskRows] = await conn.execute<RowDataPacket[]>(
        "SELECT id FROM project_tasks WHERE stage_id = ?",
        [stageId]
      );
      const existingTaskIds = new Set(existingTaskRows.map((r) => r.id));
      const incomingTaskIds = new Set(
        (stage.tasks || []).filter((t: any) => t.id).map((t: any) => t.id)
      );

      // Delete removed tasks
      for (const existingTaskId of existingTaskIds) {
        if (!incomingTaskIds.has(existingTaskId)) {
          await conn.execute("DELETE FROM project_tasks WHERE id = ?", [existingTaskId]);
        }
      }

      // Insert or update tasks
      for (const task of stage.tasks || []) {
        if (task.id && existingTaskIds.has(task.id)) {
          await conn.execute(
            "UPDATE project_tasks SET name=?, description=?, assignee=?, start_date=?, deadline=?, due_time=?, duration=?, status=?, project_id=?, cancelled=? WHERE id=?",
            [task.name, task.description, task.assignee, task.startDate || null, task.deadline, task.dueTime ?? null, task.duration ?? null, task.status, projectId, task.cancelled ? 1 : 0, task.id]
          );
        } else if (task.id) {
          // Check if task exists globally (moved with stage)
          const [taskCheck] = await conn.execute<RowDataPacket[]>(
            "SELECT id FROM project_tasks WHERE id = ?",
            [task.id]
          );
          if (taskCheck.length > 0) {
            await conn.execute(
              "UPDATE project_tasks SET name=?, description=?, assignee=?, start_date=?, deadline=?, due_time=?, duration=?, status=?, stage_id=?, project_id=?, cancelled=? WHERE id=?",
              [task.name, task.description, task.assignee, task.startDate || null, task.deadline, task.dueTime ?? null, task.duration ?? null, task.status, stageId, projectId, task.cancelled ? 1 : 0, task.id]
            );
          } else {
            await conn.execute(
              "INSERT INTO project_tasks (id, name, description, assignee, start_date, deadline, due_time, duration, status, stage_id, project_id, cancelled) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
              [task.id, task.name, task.description, task.assignee, task.startDate || null, task.deadline, task.dueTime ?? null, task.duration ?? null, task.status, stageId, projectId, task.cancelled ? 1 : 0]
            );
          }
        } else {
          // Insert new task with auto-increment
          await conn.execute(
            "INSERT INTO project_tasks (name, description, assignee, start_date, deadline, due_time, duration, status, stage_id, project_id, cancelled) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [task.name, task.description, task.assignee, task.startDate || null, task.deadline, task.dueTime ?? null, task.duration ?? null, task.status, stageId, projectId, task.cancelled ? 1 : 0]
          );
        }
      }
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error("PUT /api/projects/[id] error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  conn.release();
  const updated = await fetchProject(projectId);
  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const writeError = requireWrite(session!.role, "projects");
  if (writeError) return writeError;

  const { id } = await params;
  const projectId = parseInt(id, 10);

  await pool.query("DELETE FROM projects WHERE id = ?", [projectId]);

  return NextResponse.json({ ok: true });
}
