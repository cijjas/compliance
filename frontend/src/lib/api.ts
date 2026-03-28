import type {
  AuthResponse,
  Business,
  PaginatedResponse,
  RiskScoreResponse,
  Document,
} from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002/api";

class ApiClient {
  private token: string | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      this.token = localStorage.getItem("token");
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== "undefined") {
      if (token) localStorage.setItem("token", token);
      else localStorage.removeItem("token");
    }
  }

  getToken() {
    if (!this.token && typeof window !== "undefined") {
      this.token = localStorage.getItem("token");
    }
    return this.token;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: Record<string, string> = {};
    const token = this.getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (
      options.body &&
      !(options.body instanceof FormData)
    ) {
      headers["Content-Type"] = "application/json";
    }

    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: { ...headers, ...options.headers },
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(error.message || `Request failed: ${res.status}`);
    }

    return res.json();
  }

  // Auth
  async login(email: string, password: string): Promise<AuthResponse> {
    const data = await this.request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.accessToken);
    return data;
  }

  async register(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    role?: string
  ) {
    return this.request("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, firstName, lastName, role }),
    });
  }

  logout() {
    this.setToken(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("user");
    }
  }

  // Businesses
  async getBusinesses(params?: {
    page?: number;
    limit?: number;
    status?: string;
    country?: string;
    search?: string;
  }): Promise<PaginatedResponse<Business>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.status) searchParams.set("status", params.status);
    if (params?.country) searchParams.set("country", params.country);
    if (params?.search) searchParams.set("search", params.search);
    const qs = searchParams.toString();
    return this.request(`/businesses${qs ? `?${qs}` : ""}`);
  }

  async getBusiness(id: string): Promise<Business> {
    return this.request(`/businesses/${id}`);
  }

  async createBusiness(data: {
    name: string;
    taxIdentifier: string;
    country: string;
    industry: string;
  }): Promise<Business> {
    return this.request("/businesses", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateBusinessStatus(
    id: string,
    status: string,
    reason?: string
  ): Promise<Business> {
    return this.request(`/businesses/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, reason }),
    });
  }

  async getRiskScore(id: string): Promise<RiskScoreResponse> {
    return this.request(`/businesses/${id}/risk-score`);
  }

  // Documents
  async getDocuments(businessId: string): Promise<Document[]> {
    return this.request(`/businesses/${businessId}/documents`);
  }

  async uploadDocument(
    businessId: string,
    file: File,
    type: string
  ): Promise<Document> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);
    return this.request(`/businesses/${businessId}/documents`, {
      method: "POST",
      body: formData,
    });
  }
}

export const api = new ApiClient();
