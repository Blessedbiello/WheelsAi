import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { env } from "../config/env.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("nosana-service");

// ============================================
// Types
// ============================================

export interface NosanaJobDefinition {
  version: string;
  type: string;
  meta: {
    trigger: string;
  };
  ops: NosanaOperation[];
}

export interface NosanaOperation {
  type: string;
  id: string;
  args: {
    image: string;
    cmd?: string[];
    env?: Record<string, string>;
    gpu?: boolean;
    expose?: number[];
    work?: string;
    output?: string;
  };
}

export interface NosanaMarket {
  address: string;
  name: string;
  gpuModel: string;
  vram: number;
  pricePerSecond: number;
  nodeCount: number;
  queueLength: number;
}

export interface NosanaJob {
  id: string;
  market: string;
  status: "queued" | "running" | "completed" | "failed";
  nodeUrl?: string;
  startTime?: Date;
  endTime?: Date;
  cost?: number;
}

export interface NosanaDeployment {
  id: string;
  market: string;
  replicas: number;
  status: "active" | "stopped";
  nodes: Array<{
    id: string;
    url: string;
    status: string;
  }>;
}

// ============================================
// GPU Market Configuration
// ============================================

// Known Nosana market addresses (devnet/mainnet)
const MARKETS: Record<string, NosanaMarket> = {
  "3060": {
    address: "97G9NnvBDQ2WpKu6fasoMsAKmfj63C9rhysJnkeWodAf", // Example
    name: "RTX 3060",
    gpuModel: "RTX 3060",
    vram: 12,
    pricePerSecond: 0.0001,
    nodeCount: 150,
    queueLength: 0,
  },
  "4070": {
    address: "4070MarketAddressPlaceholder",
    name: "RTX 4070",
    gpuModel: "RTX 4070",
    vram: 12,
    pricePerSecond: 0.00015,
    nodeCount: 80,
    queueLength: 0,
  },
  "4090": {
    address: "4090MarketAddressPlaceholder",
    name: "RTX 4090",
    gpuModel: "RTX 4090",
    vram: 24,
    pricePerSecond: 0.00025,
    nodeCount: 45,
    queueLength: 0,
  },
  a100: {
    address: "A100MarketAddressPlaceholder",
    name: "A100 40GB",
    gpuModel: "A100",
    vram: 40,
    pricePerSecond: 0.0008,
    nodeCount: 20,
    queueLength: 0,
  },
  h100: {
    address: "H100MarketAddressPlaceholder",
    name: "H100 80GB",
    gpuModel: "H100",
    vram: 80,
    pricePerSecond: 0.0015,
    nodeCount: 5,
    queueLength: 0,
  },
};

// ============================================
// Nosana Client
// ============================================

export class NosanaClient {
  private connection: Connection;
  private wallet: Keypair | null = null;
  private isInitialized = false;

  constructor() {
    this.connection = new Connection(env.SOLANA_RPC_URL, "confirmed");
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Load wallet if private key is provided
    if (env.NOSANA_WALLET_PRIVATE_KEY) {
      try {
        const secretKey = Uint8Array.from(
          JSON.parse(env.NOSANA_WALLET_PRIVATE_KEY)
        );
        this.wallet = Keypair.fromSecretKey(secretKey);
        logger.info(
          { publicKey: this.wallet.publicKey.toBase58() },
          "Nosana wallet loaded"
        );
      } catch (error) {
        logger.error({ error }, "Failed to load Nosana wallet");
        throw new Error("Invalid NOSANA_WALLET_PRIVATE_KEY format");
      }
    } else {
      logger.warn("No Nosana wallet configured - job submission disabled");
    }

    this.isInitialized = true;
  }

  /**
   * Get available GPU markets
   */
  async getMarkets(): Promise<NosanaMarket[]> {
    // In production, this would query the Nosana network
    // For now, return static market data
    return Object.values(MARKETS);
  }

  /**
   * Get specific market by tier
   */
  async getMarket(tier: string): Promise<NosanaMarket | null> {
    return MARKETS[tier] ?? null;
  }

  /**
   * Check wallet balance
   */
  async getWalletBalance(): Promise<{ sol: number; nos: number }> {
    if (!this.wallet) {
      throw new Error("Wallet not configured");
    }

    const solBalance = await this.connection.getBalance(this.wallet.publicKey);

    // TODO: Get NOS token balance
    const nosBalance = 0;

    return {
      sol: solBalance / 1e9, // Convert lamports to SOL
      nos: nosBalance,
    };
  }

  /**
   * Submit a job to Nosana
   */
  async submitJob(
    definition: NosanaJobDefinition,
    marketTier: string
  ): Promise<NosanaJob> {
    if (!this.wallet) {
      throw new Error("Wallet not configured - cannot submit jobs");
    }

    const market = await this.getMarket(marketTier);
    if (!market) {
      throw new Error(`Unknown market tier: ${marketTier}`);
    }

    logger.info(
      { market: market.name, jobType: definition.type },
      "Submitting job to Nosana"
    );

    // TODO: Implement actual Nosana SDK job submission
    // This is a mock implementation for development
    //
    // Real implementation would:
    // 1. Pin job definition to IPFS
    // 2. Create Solana transaction with job details
    // 3. Submit to Nosana market
    // 4. Return job ID

    const mockJobId = `job_${Date.now().toString(36)}`;

    // Simulate job submission
    const job: NosanaJob = {
      id: mockJobId,
      market: market.address,
      status: "queued",
      startTime: new Date(),
    };

    logger.info({ jobId: job.id }, "Job submitted successfully");

    return job;
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<NosanaJob | null> {
    // TODO: Query Nosana for job status
    // This is a mock implementation

    logger.debug({ jobId }, "Getting job status");

    // Mock response
    return {
      id: jobId,
      market: MARKETS["4090"]?.address ?? "",
      status: "running",
      nodeUrl: "https://mock-node.nos.ci:8000",
      startTime: new Date(),
    };
  }

  /**
   * Create a deployment (multiple replicas with auto-restart)
   */
  async createDeployment(
    definition: NosanaJobDefinition,
    marketTier: string,
    replicas: number
  ): Promise<NosanaDeployment> {
    if (!this.wallet) {
      throw new Error("Wallet not configured - cannot create deployments");
    }

    const market = await this.getMarket(marketTier);
    if (!market) {
      throw new Error(`Unknown market tier: ${marketTier}`);
    }

    logger.info(
      { market: market.name, replicas },
      "Creating Nosana deployment"
    );

    // TODO: Implement actual Nosana deployment creation
    // Real implementation would use Nosana's deployment manager

    const mockDeploymentId = `deploy_${Date.now().toString(36)}`;

    const deployment: NosanaDeployment = {
      id: mockDeploymentId,
      market: market.address,
      replicas,
      status: "active",
      nodes: [],
    };

    // Simulate node provisioning
    for (let i = 0; i < replicas; i++) {
      deployment.nodes.push({
        id: `node_${i}`,
        url: `https://node-${i}.mock.nos.ci:8000`,
        status: "provisioning",
      });
    }

    logger.info(
      { deploymentId: deployment.id, replicas },
      "Deployment created"
    );

    return deployment;
  }

  /**
   * Get deployment status
   */
  async getDeploymentStatus(
    deploymentId: string
  ): Promise<NosanaDeployment | null> {
    // TODO: Query Nosana for deployment status
    logger.debug({ deploymentId }, "Getting deployment status");

    // Mock response
    return {
      id: deploymentId,
      market: MARKETS["4090"]?.address ?? "",
      replicas: 1,
      status: "active",
      nodes: [
        {
          id: "node_0",
          url: "https://mock-node.nos.ci:8000",
          status: "running",
        },
      ],
    };
  }

  /**
   * Stop a deployment
   */
  async stopDeployment(deploymentId: string): Promise<void> {
    if (!this.wallet) {
      throw new Error("Wallet not configured");
    }

    logger.info({ deploymentId }, "Stopping deployment");

    // TODO: Implement actual deployment stop via Nosana SDK
  }

  /**
   * Scale a deployment
   */
  async scaleDeployment(
    deploymentId: string,
    newReplicas: number
  ): Promise<NosanaDeployment> {
    if (!this.wallet) {
      throw new Error("Wallet not configured");
    }

    logger.info({ deploymentId, newReplicas }, "Scaling deployment");

    // TODO: Implement actual scaling via Nosana SDK

    return {
      id: deploymentId,
      market: "",
      replicas: newReplicas,
      status: "active",
      nodes: [],
    };
  }

  /**
   * Check node health by making HTTP request
   */
  async checkNodeHealth(
    nodeUrl: string
  ): Promise<{ healthy: boolean; latencyMs: number }> {
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${nodeUrl}/health`, {
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const latencyMs = Date.now() - startTime;

      return {
        healthy: response.ok,
        latencyMs,
      };
    } catch (error) {
      return {
        healthy: false,
        latencyMs: Date.now() - startTime,
      };
    }
  }
}

// ============================================
// Singleton Instance
// ============================================

let nosanaClient: NosanaClient | null = null;

export async function getNosanaClient(): Promise<NosanaClient> {
  if (!nosanaClient) {
    nosanaClient = new NosanaClient();
    await nosanaClient.initialize();
  }
  return nosanaClient;
}

// ============================================
// Job Definition Generator
// ============================================

export interface ModelDeploymentConfig {
  modelId: string;
  hfModelId: string;
  engine: "vllm" | "ollama";
  maxTokens: number;
  gpuMemoryUtilization: number;
  quantization?: string;
}

export function generateVllmJobDefinition(
  config: ModelDeploymentConfig
): NosanaJobDefinition {
  const vllmArgs = [
    "--model",
    config.hfModelId,
    "--host",
    "0.0.0.0",
    "--port",
    "8000",
    "--max-model-len",
    config.maxTokens.toString(),
    "--gpu-memory-utilization",
    config.gpuMemoryUtilization.toString(),
  ];

  if (config.quantization) {
    vllmArgs.push("--quantization", config.quantization);
  }

  return {
    version: "0.1",
    type: "container",
    meta: {
      trigger: "wheelsai",
    },
    ops: [
      {
        type: "container/run",
        id: "vllm-inference",
        args: {
          image: "vllm/vllm-openai:v0.6.0",
          cmd: vllmArgs,
          gpu: true,
          expose: [8000],
          env: {
            HF_TOKEN: "${HF_TOKEN}",
          },
        },
      },
    ],
  };
}

export function generateOllamaJobDefinition(
  config: ModelDeploymentConfig
): NosanaJobDefinition {
  // Map HF model ID to Ollama model name
  const ollamaModel = mapToOllamaModel(config.hfModelId);

  return {
    version: "0.1",
    type: "container",
    meta: {
      trigger: "wheelsai",
    },
    ops: [
      {
        type: "container/run",
        id: "ollama-inference",
        args: {
          image: "ollama/ollama:latest",
          // Start Ollama, pull model, then keep serving
          cmd: [
            "/bin/sh",
            "-c",
            `ollama serve & sleep 5 && ollama pull ${ollamaModel} && wait`,
          ],
          gpu: true,
          expose: [11434],
          env: {
            OLLAMA_HOST: "0.0.0.0:11434",
            OLLAMA_NUM_CTX: config.maxTokens.toString(),
            OLLAMA_NUM_GPU: "999", // Use all available GPU layers
            OLLAMA_KEEP_ALIVE: "24h", // Keep model loaded
          },
        },
      },
    ],
  };
}

/**
 * Generate Ollama job with OpenAI-compatible proxy
 * This uses a sidecar container to provide /v1/chat/completions endpoint
 */
export function generateOllamaWithProxyJobDefinition(
  config: ModelDeploymentConfig
): NosanaJobDefinition {
  const ollamaModel = mapToOllamaModel(config.hfModelId);

  return {
    version: "0.1",
    type: "container",
    meta: {
      trigger: "wheelsai",
    },
    ops: [
      {
        type: "container/run",
        id: "ollama-server",
        args: {
          image: "ollama/ollama:latest",
          cmd: [
            "/bin/sh",
            "-c",
            `ollama serve & sleep 5 && ollama pull ${ollamaModel} && wait`,
          ],
          gpu: true,
          expose: [11434],
          env: {
            OLLAMA_HOST: "0.0.0.0:11434",
            OLLAMA_NUM_CTX: config.maxTokens.toString(),
            OLLAMA_NUM_GPU: "999",
            OLLAMA_KEEP_ALIVE: "24h",
          },
        },
      },
      {
        type: "container/run",
        id: "openai-proxy",
        args: {
          image: "ghcr.io/wheelsai/ollama-openai-proxy:latest",
          cmd: [
            "--ollama-host", "http://localhost:11434",
            "--model", ollamaModel,
            "--port", "8000",
          ],
          expose: [8000],
          env: {
            OLLAMA_BASE_URL: "http://localhost:11434",
            DEFAULT_MODEL: ollamaModel,
          },
        },
      },
    ],
  };
}

function mapToOllamaModel(hfModelId: string): string {
  // Map common HuggingFace model IDs to Ollama equivalents
  const mapping: Record<string, string> = {
    // Llama 3.1 family
    "meta-llama/Meta-Llama-3.1-8B-Instruct": "llama3.1:8b",
    "meta-llama/Meta-Llama-3.1-70B-Instruct": "llama3.1:70b",
    "meta-llama/Meta-Llama-3.1-405B-Instruct": "llama3.1:405b",
    // Llama 3.2 family
    "meta-llama/Llama-3.2-1B-Instruct": "llama3.2:1b",
    "meta-llama/Llama-3.2-3B-Instruct": "llama3.2:3b",
    // Mistral family
    "mistralai/Mistral-7B-Instruct-v0.2": "mistral:7b",
    "mistralai/Mistral-7B-Instruct-v0.3": "mistral:7b",
    "mistralai/Mixtral-8x7B-Instruct-v0.1": "mixtral:8x7b",
    "mistralai/Mixtral-8x22B-Instruct-v0.1": "mixtral:8x22b",
    // Qwen family
    "Qwen/Qwen2-7B-Instruct": "qwen2:7b",
    "Qwen/Qwen2-72B-Instruct": "qwen2:72b",
    "Qwen/Qwen2.5-7B-Instruct": "qwen2.5:7b",
    "Qwen/Qwen2.5-14B-Instruct": "qwen2.5:14b",
    "Qwen/Qwen2.5-32B-Instruct": "qwen2.5:32b",
    "Qwen/Qwen2.5-72B-Instruct": "qwen2.5:72b",
    // Phi family
    "microsoft/Phi-3-mini-4k-instruct": "phi3:mini",
    "microsoft/Phi-3-medium-4k-instruct": "phi3:medium",
    "microsoft/Phi-3.5-mini-instruct": "phi3.5:mini",
    // Gemma family
    "google/gemma-2-2b-it": "gemma2:2b",
    "google/gemma-2-9b-it": "gemma2:9b",
    "google/gemma-2-27b-it": "gemma2:27b",
    // Code models
    "Qwen/Qwen2.5-Coder-7B-Instruct": "qwen2.5-coder:7b",
    "deepseek-ai/deepseek-coder-6.7b-instruct": "deepseek-coder:6.7b",
    "codellama/CodeLlama-7b-Instruct-hf": "codellama:7b",
    "codellama/CodeLlama-34b-Instruct-hf": "codellama:34b",
  };

  return mapping[hfModelId] ?? hfModelId.split("/").pop() ?? hfModelId;
}

/**
 * Check if a model is available in Ollama
 */
export function isOllamaSupported(hfModelId: string): boolean {
  const ollamaModels = [
    // Llama family
    "meta-llama/Meta-Llama-3.1-8B-Instruct",
    "meta-llama/Meta-Llama-3.1-70B-Instruct",
    "meta-llama/Llama-3.2-1B-Instruct",
    "meta-llama/Llama-3.2-3B-Instruct",
    // Mistral family
    "mistralai/Mistral-7B-Instruct-v0.2",
    "mistralai/Mistral-7B-Instruct-v0.3",
    "mistralai/Mixtral-8x7B-Instruct-v0.1",
    // Qwen family
    "Qwen/Qwen2-7B-Instruct",
    "Qwen/Qwen2.5-7B-Instruct",
    "Qwen/Qwen2.5-14B-Instruct",
    "Qwen/Qwen2.5-32B-Instruct",
    "Qwen/Qwen2.5-72B-Instruct",
    // Phi family
    "microsoft/Phi-3-mini-4k-instruct",
    "microsoft/Phi-3-medium-4k-instruct",
    "microsoft/Phi-3.5-mini-instruct",
    // Gemma family
    "google/gemma-2-2b-it",
    "google/gemma-2-9b-it",
    "google/gemma-2-27b-it",
    // Code models
    "Qwen/Qwen2.5-Coder-7B-Instruct",
    "deepseek-ai/deepseek-coder-6.7b-instruct",
    "codellama/CodeLlama-7b-Instruct-hf",
  ];

  return ollamaModels.includes(hfModelId);
}

export function generateJobDefinition(
  config: ModelDeploymentConfig
): NosanaJobDefinition {
  switch (config.engine) {
    case "vllm":
      return generateVllmJobDefinition(config);
    case "ollama":
      return generateOllamaJobDefinition(config);
    default:
      throw new Error(`Unsupported engine: ${config.engine}`);
  }
}
