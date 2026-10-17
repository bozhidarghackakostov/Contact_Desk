export type EntityStatus = 'active' | 'archived';

export interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  display_name: string;
  nickname: string | null;
  job_title: string | null;
  primary_email: string | null;
  primary_phone: string | null;
  website: string | null;
  address: string | null;
  birthday: string | null;
  notes: string;
  is_favorite: number; // 0 | 1
  status: EntityStatus;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  deleted_at: string | null;

  // Joined / populated fields
  organizations?: Array<{
    id: string;
    organization_id: string;
    organization_name: string;
    job_title: string | null;
    department: string | null;
    is_primary: number;
    start_date: string | null;
    end_date: string | null;
  }>;
  tags?: Tag[];
  last_interaction_at?: string | null;
  next_task_at?: string | null;
}

export type ContactMethodType = 'email' | 'phone' | 'website' | 'social' | 'other';

export interface ContactMethod {
  id: string;
  contact_id: string;
  method_type: ContactMethodType;
  value: string;
  label: string | null;
  is_primary: number;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  name: string;
  organization_type: string | null;
  industry: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  description: string | null;
  notes: string;
  status: EntityStatus;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  deleted_at: string | null;

  // Joined / populated fields
  contacts_count?: number;
  contacts?: Array<{
    id: string;
    contact_id: string;
    first_name: string;
    last_name: string;
    display_name: string;
    job_title: string | null;
    department: string | null;
    is_primary: number;
  }>;
}

export interface ContactOrganization {
  id: string;
  contact_id: string;
  organization_id: string;
  job_title: string | null;
  department: string | null;
  role_description: string | null;
  is_primary: number;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export type InteractionType =
  | 'meeting'
  | 'phone_call'
  | 'email'
  | 'message'
  | 'in_person'
  | 'note'
  | 'other';

export interface Interaction {
  id: string;
  interaction_type: InteractionType;
  title: string;
  summary: string | null;
  details: string;
  location: string | null;
  occurred_at: string;
  contact_id: string | null;
  organization_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;

  // Joined fields
  contact_name?: string | null;
  organization_name?: string | null;
}

export type TaskPriority = 'low' | 'normal' | 'high';
export type TaskStatus = 'open' | 'in_progress' | 'completed' | 'cancelled';

export interface Task {
  id: string;
  title: string;
  description: string;
  due_date: string; // YYYY-MM-DD
  due_time: string | null; // HH:MM
  priority: TaskPriority;
  status: TaskStatus;
  contact_id: string | null;
  organization_id: string | null;
  interaction_id: string | null;
  reminder_at: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  archived_at: string | null;
  deleted_at: string | null;

  // Joined fields
  contact_name?: string | null;
  organization_name?: string | null;
  is_overdue?: boolean;
}

export interface Tag {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  contacts_count?: number;
}

export interface DashboardStats {
  activeContactsCount: number;
  activeOrganizationsCount: number;
  tasksDueTodayCount: number;
  tasksOverdueCount: number;
  tasksUpcomingCount: number;
  contactsWithoutInteractionsCount: number;
  recentInteractions: Interaction[];
  recentContacts: Contact[];
  overdueTasks: Task[];
  todayTasks: Task[];
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface SearchResultItem {
  id: string;
  type: 'contact' | 'organization' | 'interaction' | 'task';
  title: string;
  subtitle?: string;
  matchSnippet?: string;
  status?: string;
  url?: string;
  archived?: boolean;
}

export interface GlobalSearchResult {
  contacts: SearchResultItem[];
  organizations: SearchResultItem[];
  interactions: SearchResultItem[];
  tasks: SearchResultItem[];
  total: number;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Array<{ field?: string; message: string }>;
}

export type ApiResponse<T> =
  | { success: true; data: T; meta?: PaginationMeta }
  | { success: false; error: ApiError };
