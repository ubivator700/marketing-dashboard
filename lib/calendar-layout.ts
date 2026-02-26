/**
 * Calendar overlap layout algorithm.
 * Given a set of items with start/end times, assigns columns
 * so overlapping items sit side-by-side instead of stacking.
 */

export interface LayoutItem {
  id: string;
  startMin: number; // start minute of day (e.g. 600 = 10:00)
  endMin: number;   // end minute of day (e.g. 660 = 11:00)
}

export interface LayoutResult {
  column: number;       // 0-based column index within group
  totalColumns: number; // total columns in the overlap group
}

/**
 * Compute non-overlapping column positions for items.
 * Returns a Map from item id to { column, totalColumns }.
 *
 * Algorithm:
 * 1. Sort items by start time (then by end time for ties)
 * 2. Group overlapping items into clusters
 * 3. Assign columns within each cluster using greedy approach
 */
export function layoutOverlappingItems(items: LayoutItem[]): Map<string, LayoutResult> {
  if (items.length === 0) return new Map();

  // Sort by start, then by end (shorter first)
  const sorted = [...items].sort((a, b) => {
    if (a.startMin !== b.startMin) return a.startMin - b.startMin;
    return a.endMin - b.endMin;
  });

  const result = new Map<string, LayoutResult>();

  // Find overlap groups using sweep-line
  const groups: LayoutItem[][] = [];
  let currentGroup: LayoutItem[] = [sorted[0]];
  let groupEnd = sorted[0].endMin;

  for (let i = 1; i < sorted.length; i++) {
    const item = sorted[i];
    if (item.startMin < groupEnd) {
      // Overlaps with current group
      currentGroup.push(item);
      groupEnd = Math.max(groupEnd, item.endMin);
    } else {
      // Start a new group
      groups.push(currentGroup);
      currentGroup = [item];
      groupEnd = item.endMin;
    }
  }
  groups.push(currentGroup);

  // For each group, assign columns
  for (const group of groups) {
    // Greedy column assignment: for each item, find the first column
    // where it doesn't overlap with any already-assigned item
    const columns: LayoutItem[][] = []; // columns[col] = items assigned to that column

    for (const item of group) {
      let assigned = false;
      for (let col = 0; col < columns.length; col++) {
        // Check if item fits in this column (no overlap with last item in column)
        const lastInCol = columns[col][columns[col].length - 1];
        if (item.startMin >= lastInCol.endMin) {
          columns[col].push(item);
          result.set(item.id, { column: col, totalColumns: 0 }); // totalColumns set later
          assigned = true;
          break;
        }
      }
      if (!assigned) {
        // Need a new column
        const col = columns.length;
        columns.push([item]);
        result.set(item.id, { column: col, totalColumns: 0 });
      }
    }

    // Update totalColumns for all items in this group
    const totalColumns = columns.length;
    for (const item of group) {
      const r = result.get(item.id)!;
      r.totalColumns = totalColumns;
    }
  }

  return result;
}
