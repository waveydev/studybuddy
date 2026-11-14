export const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

export const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };

export const CATEGORIES = [
  { value: 'assignment', label: 'Assignment' },
  { value: 'exam', label: 'Exam' },
  { value: 'project', label: 'Project' },
  { value: 'reading', label: 'Reading' },
  { value: 'other', label: 'Other' },
];

export const STATUSES = [
  { value: 'pending', label: 'To do' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Done' },
];

export const COURSE_COLORS = [
  '#e5484d', '#f76b15', '#d99a00', '#30a46c',
  '#0d9aa8', '#3e63dd', '#8e4ec6', '#d6409f',
];

export const labelOf = (list, value) =>
  (list.find((x) => x.value === value) || {}).label || value;
