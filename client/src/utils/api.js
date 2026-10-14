/**
 * Centralized API Base URL for BotBounty Client
 * Reads VITE_API_URL in production or defaults to empty string (using Vite proxy) in local development.
 */
export const API_BASE = import.meta.env.VITE_API_URL || '';
