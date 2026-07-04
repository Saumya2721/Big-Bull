import axios from "axios";

const api = axios.create({
    // Vite syntax with fallback to localhost
    baseURL: import.meta.env.VITE_SERVER_URL || "http://localhost:5000/api",
    withCredentials: true,                                      // Crucial for capturing and sending Passport session cookies
});

export default api;