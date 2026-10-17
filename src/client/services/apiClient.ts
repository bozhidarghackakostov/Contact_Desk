import type {
  Contact,
  Organization,
  ContactOrganization,
  Interaction,
  InteractionType,
  Task,
  TaskPriority,
  TaskStatus,
  DashboardStats,
  ApiResponse,
  ApiError,
  Tag,
  GlobalSearchResult,
  EntityStatus,
} from '../../shared/types/index.ts';

class ApiClientError extends Error {
  public code: string;
  public details?: Array<{ field?: string; message: string }>;

  constructor(error: ApiError) {
    super(error.message);
    this.name = 'ApiClientError';
    this.code = error.code;
    this.details = error.details;
  }
}

export async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ data: T; meta?: any }> {
  const url = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const json: ApiResponse<T> = await response.json();

  if (!json.success) {
    throw new ApiClientError(json.error);
  }

  return { data: json.data, meta: (json as any).meta };
}

export const apiClient = {
  get: <T>(endpoint: string) => request<T>(endpoint, { method: 'GET' }),
  post: <T>(endpoint: string, body?: any) =>
    request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),
  patch: <T>(endpoint: string, body?: any) =>
    request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),
  delete: <T>(endpoint: string) =>
    request<T>(endpoint, { method: 'DELETE' }),

  // Health
  checkHealth: () =>
    request<{ status: string; version: string; dbConnected: boolean }>('/api/health'),

  // Dashboard
  getDashboard: () => request<DashboardStats>('/api/dashboard'),

  // Contacts
  listContacts: (params: {
    search?: string;
    status?: EntityStatus | 'all';
    organizationId?: string;
    tagId?: string;
    isFavorite?: boolean;
    hasNoInteractions?: boolean;
    sort?: string;
    order?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  } = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.status) query.set('status', params.status);
    if (params.organizationId) query.set('organizationId', params.organizationId);
    if (params.tagId) query.set('tagId', params.tagId);
    if (params.isFavorite !== undefined) query.set('isFavorite', params.isFavorite ? '1' : '0');
    if (params.hasNoInteractions) query.set('hasNoInteractions', '1');
    if (params.sort) query.set('sort', params.sort);
    if (params.order) query.set('order', params.order);
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    return request<Contact[]>(`/api/contacts?${query.toString()}`);
  },

  getContact: (id: string) => request<Contact>(`/api/contacts/${id}`),

  createContact: (data: Partial<Contact> & { organizationLink?: any }) =>
    request<Contact>('/api/contacts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateContact: (id: string, data: Partial<Contact>) =>
    request<Contact>(`/api/contacts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  archiveContact: (id: string) =>
    request<Contact>(`/api/contacts/${id}/archive`, { method: 'POST' }),

  restoreContact: (id: string) =>
    request<Contact>(`/api/contacts/${id}/restore`, { method: 'POST' }),

  deleteContact: (id: string) =>
    request<{ deleted: boolean }>(`/api/contacts/${id}?confirm=true`, { method: 'DELETE' }),

  checkDuplicates: (firstName?: string, lastName?: string, email?: string) => {
    const query = new URLSearchParams();
    if (firstName) query.set('firstName', firstName);
    if (lastName) query.set('lastName', lastName);
    if (email) query.set('email', email);
    return request<Contact[]>(`/api/contacts/check-duplicate?${query.toString()}`);
  },

  linkOrganization: (contactId: string, data: any) =>
    request<ContactOrganization>(`/api/contacts/${contactId}/organizations`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Organizations
  listOrganizations: (params: {
    search?: string;
    status?: EntityStatus | 'all';
    sort?: string;
    order?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  } = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.status) query.set('status', params.status);
    if (params.sort) query.set('sort', params.sort);
    if (params.order) query.set('order', params.order);
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    return request<Organization[]>(`/api/organizations?${query.toString()}`);
  },

  getOrganization: (id: string) => request<Organization>(`/api/organizations/${id}`),

  createOrganization: (data: Partial<Organization>) =>
    request<Organization>('/api/organizations', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateOrganization: (id: string, data: Partial<Organization>) =>
    request<Organization>(`/api/organizations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  archiveOrganization: (id: string) =>
    request<Organization>(`/api/organizations/${id}/archive`, { method: 'POST' }),

  restoreOrganization: (id: string) =>
    request<Organization>(`/api/organizations/${id}/restore`, { method: 'POST' }),

  deleteOrganization: (id: string) =>
    request<{ deleted: boolean }>(`/api/organizations/${id}?confirm=true`, { method: 'DELETE' }),

  unlinkRelationship: (relationshipId: string) =>
    request<{ unlinked: boolean }>(`/api/relationships/${relationshipId}`, {
      method: 'DELETE',
    }),

  // Interactions
  listInteractions: (params: {
    contactId?: string;
    organizationId?: string;
    type?: InteractionType | 'all';
    startDate?: string;
    endDate?: string;
    search?: string;
    sort?: string;
    order?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  } = {}) => {
    const query = new URLSearchParams();
    if (params.contactId) query.set('contactId', params.contactId);
    if (params.organizationId) query.set('organizationId', params.organizationId);
    if (params.type) query.set('type', params.type);
    if (params.startDate) query.set('startDate', params.startDate);
    if (params.endDate) query.set('endDate', params.endDate);
    if (params.search) query.set('search', params.search);
    if (params.sort) query.set('sort', params.sort);
    if (params.order) query.set('order', params.order);
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    return request<Interaction[]>(`/api/interactions?${query.toString()}`);
  },

  getInteraction: (id: string) => request<Interaction>(`/api/interactions/${id}`),

  createInteraction: (data: Partial<Interaction>) =>
    request<Interaction>('/api/interactions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateInteraction: (id: string, data: Partial<Interaction>) =>
    request<Interaction>(`/api/interactions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteInteraction: (id: string) =>
    request<{ deleted: boolean }>(`/api/interactions/${id}`, { method: 'DELETE' }),

  // Tasks / Follow-ups
  listTasks: (params: {
    view?: 'today' | 'upcoming' | 'overdue' | 'open' | 'completed' | 'all';
    contactId?: string;
    organizationId?: string;
    priority?: TaskPriority;
    status?: TaskStatus;
    sort?: string;
    order?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  } = {}) => {
    const query = new URLSearchParams();
    if (params.view) query.set('view', params.view);
    if (params.contactId) query.set('contactId', params.contactId);
    if (params.organizationId) query.set('organizationId', params.organizationId);
    if (params.priority) query.set('priority', params.priority);
    if (params.status) query.set('status', params.status);
    if (params.sort) query.set('sort', params.sort);
    if (params.order) query.set('order', params.order);
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    return request<Task[]>(`/api/tasks?${query.toString()}`);
  },

  getTask: (id: string) => request<Task>(`/api/tasks/${id}`),

  createTask: (data: Partial<Task>) =>
    request<Task>('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateTask: (id: string, data: Partial<Task>) =>
    request<Task>(`/api/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  completeTask: (id: string) =>
    request<Task>(`/api/tasks/${id}/complete`, { method: 'POST' }),

  reopenTask: (id: string) =>
    request<Task>(`/api/tasks/${id}/reopen`, { method: 'POST' }),

  deleteTask: (id: string) =>
    request<{ deleted: boolean }>(`/api/tasks/${id}`, { method: 'DELETE' }),

  // Tags
  listTags: () => request<Tag[]>('/api/tags'),
  createTag: (name: string) =>
    request<Tag>('/api/tags', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
  updateTag: (id: string, name: string) =>
    request<Tag>(`/api/tags/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    }),
  deleteTag: (id: string) =>
    request<{ deleted: boolean }>(`/api/tags/${id}`, { method: 'DELETE' }),
  getContactTags: (contactId: string) =>
    request<Tag[]>(`/api/contacts/${contactId}/tags`),
  setContactTags: (contactId: string, tags: string[]) =>
    request<Tag[]>(`/api/contacts/${contactId}/tags`, {
      method: 'POST',
      body: JSON.stringify({ tags }),
    }),

  // Search
  globalSearch: (query: string, includeArchived?: boolean, limit?: number) => {
    const q = new URLSearchParams();
    q.set('q', query);
    if (includeArchived) q.set('includeArchived', 'true');
    if (limit) q.set('limit', String(limit));
    return request<GlobalSearchResult>(`/api/search?${q.toString()}`);
  },

  // Imports
  previewImport: (csvText: string) =>
    request<any>('/api/imports/contacts/preview', {
      method: 'POST',
      body: JSON.stringify({ csvText }),
    }),

  commitImport: (data: {
    csvText: string;
    columnMapping?: Record<string, string>;
    duplicateStrategy?: 'skip' | 'update' | 'import_anyway';
    tagAsImported?: boolean;
    customTag?: string;
  }) =>
    request<{
      totalProcessed: number;
      importedCount: number;
      updatedCount: number;
      skippedCount: number;
    }>('/api/imports/contacts/commit', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Backups
  listBackups: () =>
    request<
      Array<{
        filename: string;
        sizeBytes: number;
        createdAt: string;
        isIntegrityOk: boolean;
      }>
    >('/api/backups'),

  createBackup: (label?: string) =>
    request<{
      filename: string;
      sizeBytes: number;
      createdAt: string;
      isIntegrityOk: boolean;
    }>('/api/backups', {
      method: 'POST',
      body: JSON.stringify({ label }),
    }),

  restoreBackup: (filename: string) =>
    request<{
      success: boolean;
      restoredFilename: string;
      safetyBackupFilename: string;
      restoredAt: string;
    }>('/api/backups/restore', {
      method: 'POST',
      body: JSON.stringify({ filename }),
    }),
};
