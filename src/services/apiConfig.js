const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
export const API_URL = isLocal ? "http://localhost:5001" : "http://51.79.18.52:5001";

export const defaultHeaders = {
  "Content-Type": "application/json",
  "Accept": "application/json"
};