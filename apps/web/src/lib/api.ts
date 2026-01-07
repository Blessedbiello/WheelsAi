// API Client for WheelsAI backend

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface ApiOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
}

class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public data: unknown
  ) {
    super(`API Error: ${status} ${statusText}`);
    this.name = "ApiError";
  }
}

async function api<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { method = "GET", body, headers = {} } = options;

  const res = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
  });

  const data = await res.json();

  if (!res.ok) {
    throw new ApiError(res.status, res.statusText, data);
  }

  return data as T;
}

// ============================================
// Auth API
// ============================================

export interface User {
  id: string;
  email?: string;
  walletAddress?: string;
  createdAt: string;
}

export interface Organization {
  id: string;
  name: string;
}

export interface AuthResponse {
  user: User;
  organization: Organization;
  token: string;
}

export const authApi = {
  register: (email: string, password: string) =>
    api<AuthResponse>("/api/auth/register", {
      method: "POST",
      body: { email, password },
    }),

  login: (email: string, password: string) =>
    api<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: { email, password },
    }),

  logout: () =>
    api<{ message: string }>("/api/auth/logout", { method: "POST" }),

  me: () =>
    api<{ user: User; organization: Organization; authType: string }>(
      "/api/auth/me"
    ),

  walletNonce: (walletAddress: string) =>
    api<{ nonce: string; walletAddress: string }>("/api/auth/wallet/nonce", {
      method: "POST",
      body: { walletAddress },
    }),

  walletVerify: (walletAddress: string, signature: string, nonce: string) =>
    api<AuthResponse>("/api/auth/wallet/verify", {
      method: "POST",
      body: { walletAddress, signature, nonce },
    }),

  refresh: () => api<{ token: string }>("/api/auth/refresh", { method: "POST" }),
};

// ============================================
// Models API
// ============================================

export interface Model {
  id: string;
  hfId: string;
  ollamaModelId?: string | null;
  displayName: string;
  description: string;
  provider: string;
  parameters: number;
  minGpuTier: string;
  supportedEngines: string[];
  defaultEngine: string;
  contextLength: number;
  license: string;
  tags: string[];
  pricingTier: string;
  pricing?: {
    inputPer1k: number;
    outputPer1k: number;
  };
}

export interface GpuTier {
  id: string;
  name: string;
  vram: number;
  available: number;
  pricePerHour: number;
}

export const modelsApi = {
  list: (params?: { tag?: string; search?: string }) => {
    const query = new URLSearchParams(params as Record<string, string>);
    return api<{ models: Model[]; gpuTiers: GpuTier[] }>(
      `/api/models?${query}`
    );
  },

  get: (modelId: string) =>
    api<{ model: Model; compatibleGpuTiers: GpuTier[] }>(
      `/api/models/${modelId}`
    ),

  estimate: (
    modelId: string,
    gpuTier: string,
    replicas: number,
    hoursPerMonth: number
  ) =>
    api<{ estimate: { computePerMonth: number } }>(
      `/api/models/${modelId}/estimate`,
      {
        method: "POST",
        body: { gpuTier, replicas, hoursPerMonth },
      }
    ),
};

// ============================================
// Deployments API
// ============================================

export interface Deployment {
  id: string;
  name: string;
  slug: string;
  model: string;
  engine: string;
  gpuTier: string;
  replicas: number;
  status: "pending" | "provisioning" | "running" | "degraded" | "stopped" | "failed";
  endpoint: string | null;
  healthyNodes: number;
  totalNodes: number;
  createdAt: string;
  updatedAt: string;
}

export interface DeploymentDetail extends Deployment {
  config: {
    maxTokens: number;
    gpuMemoryUtilization: number;
  };
  nodes: Array<{
    id: string;
    healthStatus: string;
    latencyMs: number | null;
  }>;
}

export interface CreateDeploymentInput {
  name: string;
  modelId: string;
  gpuTier: string;
  engine?: "vllm" | "ollama";
  replicas?: number;
  config?: {
    maxTokens?: number;
    gpuMemoryUtilization?: number;
  };
}

export const deploymentsApi = {
  list: () =>
    api<{ deployments: Deployment[]; total: number }>("/api/deployments"),

  get: (id: string) =>
    api<{ deployment: DeploymentDetail }>(`/api/deployments/${id}`),

  create: (input: CreateDeploymentInput) =>
    api<{ deployment: Deployment; message: string }>("/api/deployments", {
      method: "POST",
      body: input,
    }),

  update: (id: string, updates: { replicas?: number }) =>
    api<{ deployment: Deployment }>(`/api/deployments/${id}`, {
      method: "PATCH",
      body: updates,
    }),

  delete: (id: string) =>
    api<{ message: string }>(`/api/deployments/${id}`, { method: "DELETE" }),

  restart: (id: string) =>
    api<{ message: string }>(`/api/deployments/${id}/restart`, {
      method: "POST",
    }),

  metrics: (id: string) =>
    api<{
      deploymentId: string;
      period: string;
      metrics: {
        requests: number;
        inputTokens: number;
        outputTokens: number;
        avgLatencyMs: number;
        errorRate: number;
      };
      byHour: Array<{
        period: string;
        requests: number;
        inputTokens: number;
        outputTokens: number;
      }>;
    }>(`/api/deployments/${id}/metrics`),
};

// ============================================
// API Keys
// ============================================

export interface ApiKey {
  id: string;
  keyPrefix: string;
  name: string;
  scopes: string[];
  status: "active" | "revoked";
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export const apiKeysApi = {
  list: () => api<{ apiKeys: ApiKey[] }>("/api/auth/keys"),

  create: (name: string, scopes?: string[]) =>
    api<{ apiKey: ApiKey; key: string }>("/api/auth/keys", {
      method: "POST",
      body: { name, scopes },
    }),

  revoke: (id: string) =>
    api<{ message: string }>(`/api/auth/keys/${id}`, { method: "DELETE" }),
};

// ============================================
// Billing API
// ============================================

export interface CreditBalance {
  available: number;
  pending: number;
  total: number;
}

export interface CreditTransaction {
  id: string;
  amount: number;
  type: "purchase" | "bonus" | "usage" | "refund";
  description: string;
  createdAt: string;
}

export interface UsageSummary {
  currentMonth: number;
  gpuHours: number;
  avgCostPerHour: number;
  computeCost: number;
  requests: number;
  requestsCost: number;
  inputTokens: number;
  outputTokens: number;
  tokensCost: number;
}

export const billingApi = {
  getBalance: () =>
    api<{ balance: CreditBalance }>("/api/billing/balance"),

  getTransactions: () =>
    api<{ transactions: CreditTransaction[] }>("/api/billing/transactions"),

  getUsage: () =>
    api<{ usage: UsageSummary }>("/api/billing/usage"),

  createCheckout: (amount: number) =>
    api<{ checkoutUrl: string }>("/api/billing/checkout", {
      method: "POST",
      body: { amount },
    }),
};

// ============================================
// Playground API
// ============================================

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionRequest {
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface ChatCompletionResponse {
  id: string;
  choices: Array<{
    index: number;
    message: ChatMessage;
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export const playgroundApi = {
  chat: (deploymentId: string, request: ChatCompletionRequest) =>
    api<ChatCompletionResponse>(`/api/deployments/${deploymentId}/chat`, {
      method: "POST",
      body: request,
    }),
};

// ============================================
// Settings API
// ============================================

export interface UserProfile {
  id: string;
  email: string;
  displayName: string | null;
  walletAddress: string | null;
  emailVerified: boolean;
  createdAt: string;
}

export interface UserSettings {
  notifications: {
    deploymentStatus: boolean;
    usageAlerts: boolean;
    billing: boolean;
    productUpdates: boolean;
  };
  preferences: {
    theme: "light" | "dark" | "system";
    timezone: string;
  };
}

export const settingsApi = {
  getProfile: () =>
    api<{ profile: UserProfile }>("/api/settings/profile"),

  updateProfile: (updates: { displayName?: string; email?: string }) =>
    api<{ profile: UserProfile }>("/api/settings/profile", {
      method: "PATCH",
      body: updates,
    }),

  getSettings: () =>
    api<{ settings: UserSettings }>("/api/settings"),

  updateSettings: (updates: Partial<UserSettings>) =>
    api<{ settings: UserSettings }>("/api/settings", {
      method: "PATCH",
      body: updates,
    }),

  changePassword: (currentPassword: string, newPassword: string) =>
    api<{ message: string }>("/api/settings/password", {
      method: "POST",
      body: { currentPassword, newPassword },
    }),
};

// ============================================
// Agents API
// ============================================

export interface Agent {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  framework: "mastra" | "langchain" | "autogen" | "custom";
  version: string;
  tags: string[];
  isPublic: boolean;
  latestDeployment: {
    id: string;
    status: string;
    endpoint: string | null;
    createdAt: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface AgentDetail extends Omit<Agent, "latestDeployment"> {
  systemPrompt: string | null;
  tools: any[];
  modelConfig: {
    modelId?: string;
    externalModel?: string;
    temperature: number;
    maxTokens: number;
  };
  sourceType: "inline" | "github" | "ipfs";
  sourceUrl: string | null;
  sourceCode: string | null;
  env: Record<string, string>;
  deployments: AgentDeployment[];
}

export interface AgentDeployment {
  id: string;
  agentId: string;
  status: "pending" | "building" | "deploying" | "running" | "stopped" | "failed";
  endpoint: string | null;
  gpuTier: string;
  replicas: number;
  buildLogs: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
  stoppedAt: string | null;
}

export interface CreateAgentInput {
  name: string;
  description?: string;
  framework: "mastra" | "langchain" | "autogen" | "custom";
  systemPrompt?: string;
  tools?: Array<{
    name: string;
    type: "function" | "api" | "mcp";
    description?: string;
    config?: Record<string, any>;
  }>;
  modelConfig: {
    modelId?: string;
    externalModel?: string;
    temperature?: number;
    maxTokens?: number;
  };
  sourceType: "inline" | "github" | "ipfs";
  sourceUrl?: string;
  sourceCode?: string;
  env?: Record<string, string>;
  tags?: string[];
  isPublic?: boolean;
}

export interface DeployAgentInput {
  gpuTier: string;
  replicas?: number;
  modelDeploymentId?: string;
  externalModelUrl?: string;
  enableWallet?: boolean;
  walletConfig?: {
    dailyLimitCents?: number;
    perTxLimitCents?: number;
    allowedDomains?: string[];
  };
}

export const agentsApi = {
  list: () => api<{ agents: Agent[]; total: number }>("/api/agents"),

  get: (id: string) => api<{ agent: AgentDetail }>(`/api/agents/${id}`),

  create: (input: CreateAgentInput) =>
    api<{ agent: { id: string; name: string; slug: string; framework: string }; message: string }>(
      "/api/agents",
      { method: "POST", body: input }
    ),

  update: (id: string, updates: Partial<CreateAgentInput>) =>
    api<{ agent: AgentDetail }>(`/api/agents/${id}`, {
      method: "PATCH",
      body: updates,
    }),

  delete: (id: string) =>
    api<{ message: string }>(`/api/agents/${id}`, { method: "DELETE" }),

  deploy: (agentId: string, input: DeployAgentInput) =>
    api<{ deployment: { id: string; status: string }; message: string }>(
      `/api/agents/${agentId}/deploy`,
      { method: "POST", body: input }
    ),

  getDeployment: (agentId: string, deploymentId: string) =>
    api<{ deployment: AgentDeployment }>(
      `/api/agents/${agentId}/deployments/${deploymentId}`
    ),

  stopDeployment: (agentId: string, deploymentId: string) =>
    api<{ message: string }>(
      `/api/agents/${agentId}/deployments/${deploymentId}/stop`,
      { method: "POST" }
    ),

  getLogs: (agentId: string, deploymentId: string) =>
    api<{ logs: string; error: string | null }>(
      `/api/agents/${agentId}/deployments/${deploymentId}/logs`
    ),
};

// ============================================
// Training Studio API
// ============================================

export interface Dataset {
  id: string;
  name: string;
  description: string | null;
  format: string;
  rowCount: number;
  sizeBytes: number;
  isValidated: boolean;
  createdAt: string;
}

export interface DatasetDetail extends Dataset {
  storageType: string;
  validationErrors: any[] | null;
  sampleRows: Record<string, any>[] | null;
  updatedAt: string;
}

export interface TrainingJob {
  id: string;
  name: string;
  baseModelId: string;
  datasetName: string;
  method: "lora" | "qlora" | "full";
  status: "pending" | "queued" | "running" | "completed" | "failed" | "cancelled";
  progress: number;
  gpuTier: string;
  gpuCount: number;
  estimatedCostCents: number | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface TrainingJobDetail extends Omit<TrainingJob, "datasetName"> {
  baseModelHfId: string;
  dataset: {
    id: string;
    name: string;
    rowCount: number;
  };
  config: {
    epochs: number;
    batchSize: number;
    learningRate: number;
    warmupSteps: number;
    gradientAccumulationSteps: number;
    loraR?: number;
    loraAlpha?: number;
    loraDropout?: number;
    targetModules?: string[];
  };
  currentEpoch: number | null;
  totalEpochs: number | null;
  trainingLoss: number | null;
  evalLoss: number | null;
  metrics: any | null;
  outputModelId: string | null;
  outputPath: string | null;
  actualCostCents: number | null;
  lastError: string | null;
}

export interface TrainableModel {
  id: string;
  hfId: string;
  displayName: string;
  parameters: number | null;
  supportedMethods: string[];
  recommendedGpuTier: string;
}

export interface CreateDatasetInput {
  name: string;
  description?: string;
  fileName: string;
  contentType?: string;
  format?: "jsonl" | "csv" | "parquet" | "alpaca" | "sharegpt";
}

export interface CreateTrainingJobInput {
  name: string;
  baseModelId: string;
  datasetId: string;
  method?: "lora" | "qlora" | "full";
  gpuTier?: string;
  gpuCount?: number;
  config?: {
    epochs?: number;
    batchSize?: number;
    learningRate?: number;
    warmupSteps?: number;
    gradientAccumulationSteps?: number;
    loraR?: number;
    loraAlpha?: number;
    loraDropout?: number;
    targetModules?: string[];
    quantizationBits?: "4" | "8";
  };
}

export const trainingApi = {
  // Datasets
  listDatasets: () =>
    api<{ datasets: Dataset[]; total: number }>("/api/training/datasets"),

  getDataset: (id: string) =>
    api<{ dataset: DatasetDetail }>(`/api/training/datasets/${id}`),

  createDataset: (input: CreateDatasetInput) =>
    api<{
      dataset: { id: string; name: string };
      upload: { url: string; expiresAt: string };
      message: string;
    }>("/api/training/datasets", {
      method: "POST",
      body: input,
    }),

  validateDataset: (id: string) =>
    api<{
      validation: {
        isValid: boolean;
        format: string;
        detectedFormat: string;
        rowCount: number;
        sizeBytes: number;
        errors: any[];
        warnings: any[];
      };
      stats: {
        totalTokens: number;
        avgTokensPerRow: number;
        minTokens: number;
        maxTokens: number;
        estimatedTrainingTime: string;
      };
      sampleRows: Record<string, any>[];
    }>(`/api/training/datasets/${id}/validate`, { method: "POST" }),

  deleteDataset: (id: string) =>
    api<{ message: string }>(`/api/training/datasets/${id}`, { method: "DELETE" }),

  // Training Jobs
  listJobs: (status?: string) =>
    api<{ jobs: TrainingJob[]; total: number }>(
      `/api/training/jobs${status ? `?status=${status}` : ""}`
    ),

  getJob: (id: string) =>
    api<{ job: TrainingJobDetail; liveProgress: any | null }>(`/api/training/jobs/${id}`),

  createJob: (input: CreateTrainingJobInput) =>
    api<{
      job: { id: string; name: string; status: string };
      estimate: { gpuHours: number; costCents: number; costUsd: string };
      message: string;
    }>("/api/training/jobs", {
      method: "POST",
      body: input,
    }),

  getJobLogs: (id: string, tail?: number) =>
    api<{ jobId: string; status: string; logs: string; totalLines: number }>(
      `/api/training/jobs/${id}/logs${tail ? `?tail=${tail}` : ""}`
    ),

  cancelJob: (id: string) =>
    api<{ message: string }>(`/api/training/jobs/${id}/cancel`, { method: "POST" }),

  // Estimation
  estimate: (input: {
    baseModelId: string;
    datasetId: string;
    method?: "lora" | "qlora" | "full";
    epochs?: number;
    gpuTier?: string;
  }) =>
    api<{
      estimate: {
        gpuTier: string;
        recommendedGpuTier: string;
        minVramGb: number;
        gpuHours: number;
        costPerHour: number;
        totalCostCents: number;
        totalCostUsd: string;
      };
      dataset: { rowCount: number; format: string };
    }>("/api/training/estimate", { method: "POST", body: input }),

  // Models
  listTrainableModels: () =>
    api<{ models: TrainableModel[] }>("/api/training/models"),
};

// ============================================
// Marketplace API
// ============================================

export interface MarketplaceListing {
  id: string;
  agentId: string;
  title: string;
  slug: string;
  shortDescription: string;
  longDescription: string | null;
  category: string;
  iconUrl: string | null;
  screenshots: string[];
  readme: string | null;
  pricingModel: "free" | "per_request" | "monthly";
  pricePerRequestCents: number | null;
  monthlyPriceCents: number | null;
  publisherId: string;
  publisherName: string;
  status: "draft" | "pending_review" | "published" | "archived";
  isFeatured: boolean;
  totalInstalls: number;
  activeInstalls: number;
  avgRating: number;
  reviewCount: number;
  totalRequests: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  agent?: {
    id: string;
    framework: string;
    tags: string[];
  };
}

export interface MarketplaceCategory {
  id: string;
  label: string;
  icon: string;
  count: number;
}

export interface MarketplaceReview {
  id: string;
  rating: number;
  title: string | null;
  content: string | null;
  isVerified: boolean;
  helpfulCount: number;
  reviewerName: string;
  createdAt: string;
}

export interface PublisherProfile {
  displayName: string;
  slug: string;
  bio: string | null;
  avatarUrl: string | null;
  website: string | null;
  twitter: string | null;
  github: string | null;
  isVerified: boolean;
  totalListings: number;
  totalInstalls: number;
  createdAt: string;
  listings: MarketplaceListing[];
}

export interface PaginatedResponse<T> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateListingInput {
  agentId: string;
  title: string;
  shortDescription: string;
  longDescription?: string;
  category: "customer-support" | "coding" | "research" | "automation" | "creative" | "other";
  iconUrl?: string;
  screenshots?: string[];
  readme?: string;
  pricingModel: "free" | "per_request" | "monthly";
  pricePerRequestCents?: number;
  monthlyPriceCents?: number;
}

export interface SearchListingsParams {
  query?: string;
  category?: string;
  pricingModel?: string;
  minRating?: number;
  sortBy?: "popular" | "rating" | "newest" | "price_low" | "price_high";
  page?: number;
  limit?: number;
}

export const marketplaceApi = {
  // Public Routes
  searchListings: (params: SearchListingsParams = {}) => {
    const searchParams = new URLSearchParams();
    if (params.query) searchParams.set("query", params.query);
    if (params.category) searchParams.set("category", params.category);
    if (params.pricingModel) searchParams.set("pricingModel", params.pricingModel);
    if (params.minRating) searchParams.set("minRating", params.minRating.toString());
    if (params.sortBy) searchParams.set("sortBy", params.sortBy);
    if (params.page) searchParams.set("page", params.page.toString());
    if (params.limit) searchParams.set("limit", params.limit.toString());

    const queryString = searchParams.toString();
    return api<{ listings: MarketplaceListing[] } & PaginatedResponse<MarketplaceListing>>(
      `/api/marketplace/listings${queryString ? `?${queryString}` : ""}`
    );
  },

  getListing: (slugOrId: string) =>
    api<{ listing: MarketplaceListing }>(`/api/marketplace/listings/${slugOrId}`),

  getListingReviews: (id: string, page = 1, limit = 10) =>
    api<{ reviews: MarketplaceReview[] } & PaginatedResponse<MarketplaceReview>>(
      `/api/marketplace/listings/${id}/reviews?page=${page}&limit=${limit}`
    ),

  getCategories: () =>
    api<{ categories: MarketplaceCategory[] }>("/api/marketplace/categories"),

  getFeatured: (limit = 6) =>
    api<{ listings: MarketplaceListing[] }>(`/api/marketplace/featured?limit=${limit}`),

  getPublisher: (slug: string) =>
    api<{ publisher: PublisherProfile }>(`/api/marketplace/publishers/${slug}`),

  getPricingModels: () =>
    api<{ pricingModels: Array<{ id: string; label: string }> }>("/api/marketplace/pricing-models"),

  // Protected Routes
  createListing: (input: CreateListingInput) =>
    api<{ listing: MarketplaceListing }>("/api/marketplace/listings", {
      method: "POST",
      body: input,
    }),

  updateListing: (id: string, updates: Partial<Omit<CreateListingInput, "agentId">>) =>
    api<{ listing: MarketplaceListing }>(`/api/marketplace/listings/${id}`, {
      method: "PATCH",
      body: updates,
    }),

  publishListing: (id: string) =>
    api<{ listing: MarketplaceListing; message: string }>(`/api/marketplace/listings/${id}/publish`, {
      method: "POST",
    }),

  archiveListing: (id: string) =>
    api<{ listing: MarketplaceListing; message: string }>(`/api/marketplace/listings/${id}/archive`, {
      method: "POST",
    }),

  getMyListings: () =>
    api<{ listings: MarketplaceListing[] }>("/api/marketplace/my-listings"),

  createReview: (listingId: string, data: { rating: number; title?: string; content?: string }) =>
    api<{ review: MarketplaceReview }>(`/api/marketplace/listings/${listingId}/reviews`, {
      method: "POST",
      body: data,
    }),

  // Install Routes
  installAgent: (listingId: string) =>
    api<{
      message: string;
      install: { id: string; status: string };
      clonedAgent: { id: string; name: string; slug: string };
    }>(`/api/marketplace/listings/${listingId}/install`, {
      method: "POST",
    }),

  uninstallAgent: (listingId: string) =>
    api<{ message: string }>(`/api/marketplace/listings/${listingId}/uninstall`, {
      method: "POST",
    }),

  checkInstallStatus: (listingId: string) =>
    api<{
      isInstalled: boolean;
      install: {
        id: string;
        status: string;
        clonedAgentId: string;
        installedAt: string;
      } | null;
    }>(`/api/marketplace/listings/${listingId}/install-status`),

  getMyInstalls: () =>
    api<{
      installs: Array<{
        id: string;
        listingId: string;
        clonedAgentId: string;
        status: string;
        totalRequests: number;
        totalSpentCents: number;
        installedAt: string;
        listing: MarketplaceListing;
      }>;
    }>("/api/marketplace/my-installs"),

  // Revenue Routes
  getRevenue: () =>
    api<{
      totalRevenueCents: number;
      pendingPayoutCents: number;
      totalListings: number;
      totalInstalls: number;
      revenueByListing: Array<{
        listingId: string;
        listing: { id: string; title: string; slug: string } | undefined;
        totalRevenueCents: number;
        totalRequests: number;
      }>;
      recentTransactions: Array<{
        id: string;
        type: string;
        grossAmountCents: number;
        platformFeeCents: number;
        creatorAmountCents: number;
        requestCount: number;
        status: string;
        createdAt: string;
      }>;
      pendingPayouts: Array<{
        id: string;
        amountCents: number;
        payoutMethod: string;
        status: string;
        requestedAt: string;
      }>;
    }>("/api/marketplace/revenue"),

  requestPayout: (payoutMethod: "credits" | "crypto_usdc" | "crypto_sol", payoutAddress?: string) =>
    api<{
      payout: {
        id: string;
        amountCents: number;
        payoutMethod: string;
        status: string;
        requestedAt: string;
      };
    }>("/api/marketplace/payouts", {
      method: "POST",
      body: { payoutMethod, payoutAddress },
    }),

  getPayoutHistory: () =>
    api<{
      payouts: Array<{
        id: string;
        amountCents: number;
        payoutMethod: string;
        payoutAddress: string | null;
        status: string;
        txSignature: string | null;
        grossRevenueCents: number;
        platformFeeCents: number;
        periodStart: string;
        periodEnd: string;
        requestedAt: string;
        processedAt: string | null;
        failureReason: string | null;
      }>;
    }>("/api/marketplace/payouts"),
};

export { ApiError };
