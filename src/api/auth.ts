import { apiClient } from "@/lib/api-client";
import type { AdminUser, AuthSession } from "@/types";

export async function loginAdmin(email: string, password: string): Promise<AuthSession> {
  return apiClient.post<AuthSession>("/api/auth/login", { email, password });
}

export interface MeResponse {
  user: AdminUser & {
    phone?: string | null;
    permissions?: string[];
    isActive?: boolean;
  };
  branch: {
    id: string;
    name: string;
  } | null;
}

export async function getMe(): Promise<MeResponse> {
  return apiClient.get<MeResponse>("/api/auth/me");
}
