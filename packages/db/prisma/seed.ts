import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const models = [
  {
    id: "llama-3.1-8b",
    hfId: "meta-llama/Meta-Llama-3.1-8B-Instruct",
    displayName: "Llama 3.1 8B Instruct",
    description:
      "Meta's latest instruction-tuned model. Excellent for general tasks.",
    parameters: BigInt(8_000_000_000),
    minGpuTier: "3060",
    supportedEngines: ["vllm", "ollama"],
    defaultEngine: "vllm",
    contextLength: 8192,
    license: "llama3.1",
    tags: ["chat", "instruct", "general"],
    pricingTier: "small",
  },
  {
    id: "llama-3.1-70b",
    hfId: "meta-llama/Meta-Llama-3.1-70B-Instruct",
    displayName: "Llama 3.1 70B Instruct",
    description:
      "Larger Llama model with superior reasoning and instruction following.",
    parameters: BigInt(70_000_000_000),
    minGpuTier: "a100",
    supportedEngines: ["vllm"],
    defaultEngine: "vllm",
    contextLength: 8192,
    license: "llama3.1",
    tags: ["chat", "instruct", "reasoning"],
    pricingTier: "large",
  },
  {
    id: "mistral-7b",
    hfId: "mistralai/Mistral-7B-Instruct-v0.2",
    displayName: "Mistral 7B Instruct",
    description: "Fast and efficient model from Mistral AI.",
    parameters: BigInt(7_000_000_000),
    minGpuTier: "3060",
    supportedEngines: ["vllm", "ollama"],
    defaultEngine: "vllm",
    contextLength: 8192,
    license: "apache-2.0",
    tags: ["chat", "instruct", "fast"],
    pricingTier: "small",
  },
  {
    id: "codellama-34b",
    hfId: "codellama/CodeLlama-34b-Instruct-hf",
    displayName: "Code Llama 34B",
    description: "Specialized model for code generation and understanding.",
    parameters: BigInt(34_000_000_000),
    minGpuTier: "4090",
    supportedEngines: ["vllm"],
    defaultEngine: "vllm",
    contextLength: 16384,
    license: "llama2",
    tags: ["code", "instruct", "programming"],
    pricingTier: "medium",
  },
  {
    id: "qwen2-7b",
    hfId: "Qwen/Qwen2-7B-Instruct",
    displayName: "Qwen2 7B Instruct",
    description: "Alibaba's multilingual model with strong performance.",
    parameters: BigInt(7_000_000_000),
    minGpuTier: "3060",
    supportedEngines: ["vllm", "ollama"],
    defaultEngine: "vllm",
    contextLength: 32768,
    license: "apache-2.0",
    tags: ["chat", "multilingual", "long-context"],
    pricingTier: "small",
  },
  {
    id: "phi-3-mini",
    hfId: "microsoft/Phi-3-mini-4k-instruct",
    displayName: "Phi-3 Mini 4K",
    description: "Microsoft's compact but capable model.",
    parameters: BigInt(3_800_000_000),
    minGpuTier: "3060",
    supportedEngines: ["vllm", "ollama"],
    defaultEngine: "vllm",
    contextLength: 4096,
    license: "mit",
    tags: ["chat", "compact", "efficient"],
    pricingTier: "small",
  },
  {
    id: "mixtral-8x7b",
    hfId: "mistralai/Mixtral-8x7B-Instruct-v0.1",
    displayName: "Mixtral 8x7B",
    description: "Mixture of Experts model with excellent performance.",
    parameters: BigInt(46_700_000_000),
    minGpuTier: "a100",
    supportedEngines: ["vllm"],
    defaultEngine: "vllm",
    contextLength: 32768,
    license: "apache-2.0",
    tags: ["chat", "moe", "high-performance"],
    pricingTier: "large",
  },
  {
    id: "deepseek-coder-33b",
    hfId: "deepseek-ai/deepseek-coder-33b-instruct",
    displayName: "DeepSeek Coder 33B",
    description: "Excellent code generation model from DeepSeek.",
    parameters: BigInt(33_000_000_000),
    minGpuTier: "4090",
    supportedEngines: ["vllm"],
    defaultEngine: "vllm",
    contextLength: 16384,
    license: "deepseek",
    tags: ["code", "instruct", "programming"],
    pricingTier: "medium",
  },
];

async function main() {
  console.log("Seeding database...");

  // Upsert models
  for (const model of models) {
    await prisma.model.upsert({
      where: { id: model.id },
      update: model,
      create: model,
    });
    console.log(`  Seeded model: ${model.id}`);
  }

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
