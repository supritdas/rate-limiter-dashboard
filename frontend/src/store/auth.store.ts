import { create } from "zustand";
import { api } from "../lib/api";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem("token"),
  loading: false,

  login: async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    const { token, user } = data.data;
    localStorage.setItem("token", token);
    set({ token, user });
  },

  register: async (email, password, name) => {
    const { data } = await api.post("/auth/register", { email, password, name });
    const { token, user } = data.data;
    localStorage.setItem("token", token);
    set({ token, user });
  },

  logout: () => {
    localStorage.removeItem("token");
    set({ user: null, token: null });
  },

  fetchMe: async () => {
    try {
      set({ loading: true });
      const { data } = await api.get("/auth/me");
      set({ user: data.data });
    } catch {
      localStorage.removeItem("token");
      set({ user: null, token: null });
    } finally {
      set({ loading: false });
    }
  },
}));
