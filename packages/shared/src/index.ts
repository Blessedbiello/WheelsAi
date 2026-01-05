// WheelsAI Shared Utilities

// ============================================
// Constants
// ============================================

export const GPU_TIER_ORDER = ["3060", "4070", "4090", "a100", "h100"] as const;

export const PRICING_TIERS = {
  small: {
    inputPer1k: 0.00015,
    outputPer1k: 0.0006,
  },
  medium: {
    inputPer1k: 0.0003,
    outputPer1k: 0.0012,
  },
  large: {
    inputPer1k: 0.0009,
    outputPer1k: 0.0036,
  },
} as const;

export const DEPLOYMENT_STATUS_LABELS = {
  pending: "Pending",
  provisioning: "Provisioning",
  running: "Running",
  degraded: "Degraded",
  stopped: "Stopped",
  failed: "Failed",
} as const;

// ============================================
// Formatting Utilities
// ============================================

export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

export function formatCurrencyCompact(cents: number): string {
  if (cents >= 100_00) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(cents / 100);
  }
  return formatCurrency(cents);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat("en-US").format(num);
}

export function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000_000) {
    return `${(tokens / 1_000_000_000).toFixed(1)}B`;
  }
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`;
  }
  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}K`;
  }
  return tokens.toString();
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1_000_000_000) {
    return `${(bytes / 1_000_000_000).toFixed(1)} GB`;
  }
  if (bytes >= 1_000_000) {
    return `${(bytes / 1_000_000).toFixed(1)} MB`;
  }
  if (bytes >= 1_000) {
    return `${(bytes / 1_000).toFixed(1)} KB`;
  }
  return `${bytes} B`;
}

export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  if (ms < 60_000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }
  if (ms < 3600_000) {
    return `${Math.floor(ms / 60_000)}m ${Math.floor((ms % 60_000) / 1000)}s`;
  }
  return `${Math.floor(ms / 3600_000)}h ${Math.floor((ms % 3600_000) / 60_000)}m`;
}

export function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const then = typeof date === "string" ? new Date(date) : date;
  const diffMs = now.getTime() - then.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return then.toLocaleDateString();
}

// ============================================
// Wallet Utilities
// ============================================

export function truncateAddress(address: string, chars = 4): string {
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export function isValidSolanaAddress(address: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}

// ============================================
// Slug Utilities
// ============================================

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}

export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug) && slug.length >= 3;
}

// ============================================
// Cost Calculation
// ============================================

export function calculateTokenCost(
  inputTokens: number,
  outputTokens: number,
  pricingTier: keyof typeof PRICING_TIERS
): number {
  const pricing = PRICING_TIERS[pricingTier];
  const inputCost = (inputTokens / 1000) * pricing.inputPer1k;
  const outputCost = (outputTokens / 1000) * pricing.outputPer1k;
  return Math.ceil((inputCost + outputCost) * 100); // Return cents
}

// ============================================
// GPU Tier Utilities
// ============================================

export function isGpuTierCompatible(
  requiredTier: string,
  availableTier: string
): boolean {
  const requiredIndex = GPU_TIER_ORDER.indexOf(requiredTier as any);
  const availableIndex = GPU_TIER_ORDER.indexOf(availableTier as any);
  if (requiredIndex === -1 || availableIndex === -1) return false;
  return availableIndex >= requiredIndex;
}

export function getCompatibleGpuTiers(minTier: string): string[] {
  const minIndex = GPU_TIER_ORDER.indexOf(minTier as any);
  if (minIndex === -1) return [];
  return GPU_TIER_ORDER.slice(minIndex) as unknown as string[];
}

// ============================================
// Async Utilities
// ============================================

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    delayMs?: number;
    backoff?: boolean;
  } = {}
): Promise<T> {
  const { maxAttempts = 3, delayMs = 1000, backoff = true } = options;

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxAttempts) {
        const delay = backoff ? delayMs * Math.pow(2, attempt - 1) : delayMs;
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

// ============================================
// ID Generation
// ============================================

export function generateId(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${timestamp}${random}`;
}

// ============================================
// API Key Utilities
// ============================================

export function generateApiKeyPrefix(key: string): string {
  return key.slice(0, 8);
}

export function maskApiKey(key: string): string {
  if (key.length <= 12) return key;
  return `${key.slice(0, 8)}${"*".repeat(key.length - 12)}${key.slice(-4)}`;
}

// ============================================
// Health Status
// ============================================

export type HealthStatus = "healthy" | "degraded" | "unhealthy" | "unknown";

export function aggregateHealthStatus(statuses: HealthStatus[]): HealthStatus {
  if (statuses.length === 0) return "unknown";

  const healthy = statuses.filter((s) => s === "healthy").length;
  const unhealthy = statuses.filter((s) => s === "unhealthy").length;

  if (unhealthy === statuses.length) return "unhealthy";
  if (healthy === statuses.length) return "healthy";
  if (healthy > 0) return "degraded";
  return "unknown";
}
