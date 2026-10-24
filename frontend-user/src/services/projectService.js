import api from './api';

export const projectService = {
  // Projects
  list: () => api.get('/projects'),
  create: (data) => api.post('/projects', data),
  get: (id) => api.get(`/projects/${id}`),
  update: (id, data) => api.put(`/projects/${id}`, data),
  remove: (id) => api.delete(`/projects/${id}`),

  // Members
  lookupUser: (id, email) => api.get(`/projects/${id}/lookup-user`, { params: { email } }),
  addMember: (id, data) => api.post(`/projects/${id}/members`, data),
  updateMemberRole: (id, userId, role) => api.put(`/projects/${id}/members/${userId}`, { role }),
  removeMember: (id, userId) => api.delete(`/projects/${id}/members/${userId}`),

  // Tasks in project
  getTasks: (id, params) => api.get(`/projects/${id}/tasks`, { params }),

  // Activity
  getActivity: (id) => api.get(`/projects/${id}/activity`),

  // Sprints
  listSprints: (id) => api.get(`/projects/${id}/sprints`),
  createSprint: (id, data) => api.post(`/projects/${id}/sprints`, data),
  updateSprint: (id, sprintId, data) => api.put(`/projects/${id}/sprints/${sprintId}`, data),
};

export const commentService = {
  list: (taskId) => api.get(`/tasks/${taskId}/comments`),
  create: (taskId, content) => api.post(`/tasks/${taskId}/comments`, { content }),
  update: (taskId, commentId, content) => api.put(`/tasks/${taskId}/comments/${commentId}`, { content }),
  remove: (taskId, commentId) => api.delete(`/tasks/${taskId}/comments/${commentId}`),
  getActivity: (taskId) => api.get(`/tasks/${taskId}/activity`),
};
