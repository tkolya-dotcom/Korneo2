export type UserRole = 'worker' | 'engineer' | 'manager' | 'deputy_head' | 'admin';

export type TaskStatus =
  | 'new'
  | 'in_progress'
  | 'on_hold'
  | 'completed'
  | 'archived';

export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';

export const USER_ROLES: UserRole[] = ['worker', 'engineer', 'manager', 'deputy_head', 'admin'];

export const TASK_STATUSES: TaskStatus[] = [
  'new',
  'in_progress',
  'on_hold',
  'completed',
  'archived',
];

export const TASK_PRIORITIES: TaskPriority[] = ['low', 'normal', 'high', 'urgent'];

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
}

export interface TaskListItem {
  id: string;
  shortId: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  assigneeId: string | null;
  projectName: string | null;
}
