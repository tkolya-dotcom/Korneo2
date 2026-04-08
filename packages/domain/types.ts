export const USER_ROLES = ['worker', 'engineer', 'manager', 'deputy_head', 'admin'] as const;
export type UserRole = typeof USER_ROLES[number];

export const TASK_STATUSES = ['new', 'planned', 'in_progress', 'waiting_materials', 'done', 'postponed'] as const;
export type TaskStatus = typeof TASK_STATUSES[number];

export const INSTALLATION_STATUSES = ['new', 'planned', 'in_progress', 'waiting_materials', 'done', 'postponed'] as const;
export type InstallationStatus = typeof INSTALLATION_STATUSES[number];

export const PURCHASE_REQUEST_STATUSES = [
  'draft',
  'approved',
  'rejected',
  'in_order',
  'ready_for_receipt',
  'received',
  'done',
  'postponed',
] as const;
export type PurchaseRequestStatus = typeof PURCHASE_REQUEST_STATUSES[number];

export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isOnline?: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  projectId?: string;
  assigneeId?: string;
  status: TaskStatus;
  dueDate?: string | null;
}

export interface Installation {
  id: string;
  title: string;
  projectId?: string;
  assigneeId?: string;
  status: InstallationStatus;
  scheduledAt?: string | null;
}

export interface PurchaseRequest {
  id: string;
  taskId?: string;
  installationId?: string;
  createdBy: string;
  status: PurchaseRequestStatus;
  comment?: string | null;
}
