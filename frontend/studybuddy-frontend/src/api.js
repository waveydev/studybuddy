import axios from 'axios';

// Override with REACT_APP_API_URL in .env when the backend lives elsewhere.
export const API_BASE = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';

const api = axios.create({ baseURL: `${API_BASE}/api` });

export default api;
