import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";
import pool from "@/lib/db";
import { requireAuth, requireWrite, formatDate } from "@/lib/api-helpers";

export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;

  const [projectRows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM projects ORDER BY priority"
  );
  const [stageRows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM stages ORDER BY id"
  );
  const [taskRows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM project_tasks ORDER BY id"
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
    };
    if (t.due_time) task.dueTime = t.due_time;
    if (t.duration != null) task.duration = t.duration;
    if (!tasksByStage.has(t.stage_id)) tasksByStage.set(t.stage_id, []);
    tasksByStage.get(t.stage_id)!.push(task);
  }

  const stagesByProject = new Map<number, any[]>();
  for (const s of stageRows) {
    const stage = {
      id: s.id,
      name: s.name,
      result: s.result,
      description: s.description,
      deadline: formatDate(s.deadline),
      projectId: s.project_id,
      tasks: tasksByStage.get(s.id) || [],
    };
    if (!stagesByProject.has(s.project_id)) stagesByProject.set(s.project_id, []);
    stagesByProject.get(s.project_id)!.push(stage);
  }

  const projects = projectRows.map((p) => ({
    id: p.id,
    name: p.name,
    goal: p.goal,
    description: p.description,
    deadline: formatDate(p.deadline),
    priority: p.priority,
    responsible: p.responsible,
    stages: stagesByProject.get(p.id) || [],
  }));

  return NextResponse.json(projects);
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const writeError = requireWrite(session!.role, "projects");
  if (writeError) return writeError;

  const body = await request.json();
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // Use client-provided id if present, otherwise let AUTO_INCREMENT generate
    let projectId: number;
    if (body.id) {
      await conn.execute(
        "INSERT INTO projects (id, name, goal, description, deadline, priority, responsible) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [body.id, body.name, body.goal, body.description, body.deadline, body.priority, body.responsible || null]
      );
      projectId = body.id;
    } else {
      const [projectResult] = await conn.execute(
        "INSERT INTO projects (name, goal, description, deadline, priority, responsible) VALUES (?, ?, ?, ?, ?, ?)",
        [body.name, body.goal, body.description, body.deadline, body.priority, body.responsible || null]
      );
      projectId = (projectResult as any).insertId;
    }

    const stages: any[] = [];

    for (const stage of body.stages || []) {
      let stageId: number;
      if (stage.id) {
        await conn.execute(
          "INSERT INTO stages (id, name, result, description, deadline, project_id) VALUES (?, ?, ?, ?, ?, ?)",
          [stage.id, stage.name, stage.result, stage.description, stage.deadline, projectId]
        );
        stageId = stage.id;
      } else {
        const [stageResult] = await conn.execute(
          "INSERT INTO stages (name, result, description, deadline, project_id) VALUES (?, ?, ?, ?, ?)",
          [stage.name, stage.result, stage.description, stage.deadline, projectId]
        );
        stageId = (stageResult as any).insertId;
      }

      const tasks: any[] = [];

      for (const task of stage.tasks || []) {
        let taskId: number;
        if (task.id) {
          await conn.execute(
            "INSERT INTO project_tasks (id, name, description, assignee, deadline, due_time, duration, status, stage_id, project_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [task.id, task.name, task.description, task.assignee, task.deadline, task.dueTime ?? null, task.duration ?? null, task.status, stageId, projectId]
          );
          taskId = task.id;
        } else {
          const [taskResult] = await conn.execute(
            "INSERT INTO project_tasks (name, description, assignee, deadline, due_time, duration, status, stage_id, project_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [task.name, task.description, task.assignee, task.deadline, task.dueTime ?? null, task.duration ?? null, task.status, stageId, projectId]
          );
          taskId = (taskResult as any).insertId;
        }

        const taskObj: Record<string, unknown> = {
          id: taskId,
          name: task.name,
          description: task.description,
          assignee: task.assignee,
          deadline: task.deadline,
          status: task.status,
          stageId: stageId,
          projectId: projectId,
        };
        if (task.dueTime) taskObj.dueTime = task.dueTime;
        if (task.duration != null) taskObj.duration = task.duration;
        tasks.push(taskObj);
      }

      stages.push({
        id: stageId,
        name: stage.name,
        result: stage.result,
        description: stage.description,
        deadline: stage.deadline,
        projectId: projectId,
        tasks,
      });
    }

    await conn.commit();

    const project = {
      id: projectId,
      name: body.name,
      goal: body.goal,
      description: body.description,
      deadline: body.deadline,
      priority: body.priority,
      responsible: body.responsible || null,
      stages,
    };

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}
