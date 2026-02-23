import type { Channel, ChannelTask } from "@/types/dashboard";

// ─── Channel CRUD ────────────────────────────────────────────────

export function addChannel(channels: Channel[], channel: Channel): Channel[] {
  return [...channels, channel];
}

export function updateChannel(
  channels: Channel[],
  channelId: number,
  updates: Partial<Omit<Channel, "id">>
): Channel[] {
  return channels.map((c) =>
    c.id !== channelId ? c : { ...c, ...updates }
  );
}

export function deleteChannel(channels: Channel[], channelId: number): Channel[] {
  return channels.filter((c) => c.id !== channelId);
}

// ─── ChannelTask CRUD ────────────────────────────────────────────

export function addChannelTask(
  channels: Channel[],
  channelId: number,
  task: ChannelTask
): Channel[] {
  return channels.map((c) =>
    c.id !== channelId ? c : { ...c, tasks: [...c.tasks, task] }
  );
}

export function updateChannelTask(
  channels: Channel[],
  channelId: number,
  taskId: number,
  updates: Partial<Omit<ChannelTask, "id">>
): Channel[] {
  return channels.map((c) =>
    c.id !== channelId
      ? c
      : {
          ...c,
          tasks: c.tasks.map((t) =>
            t.id !== taskId ? t : { ...t, ...updates }
          ),
        }
  );
}

export function toggleChannelTask(
  channels: Channel[],
  channelId: number,
  taskId: number
): Channel[] {
  return channels.map((c) =>
    c.id !== channelId
      ? c
      : {
          ...c,
          tasks: c.tasks.map((t) =>
            t.id !== taskId ? t : { ...t, done: !t.done }
          ),
        }
  );
}

export function deleteChannelTask(
  channels: Channel[],
  channelId: number,
  taskId: number
): Channel[] {
  return channels.map((c) =>
    c.id !== channelId
      ? c
      : { ...c, tasks: c.tasks.filter((t) => t.id !== taskId) }
  );
}
