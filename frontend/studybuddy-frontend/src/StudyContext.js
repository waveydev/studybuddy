import { createContext, useContext } from 'react';

/**
 * Shared app state for the views:
 *   data    - tasks, courses, sessions and their actions (useStudyData)
 *   timer   - the focus timer (useFocusTimer)
 *   now     - current time in ms, refreshed every minute
 *   ui      - openTask(id), openCreate(defaults), startFocus(taskId), setView(name)
 */
const StudyContext = createContext(null);

export const useStudy = () => useContext(StudyContext);

export default StudyContext;
