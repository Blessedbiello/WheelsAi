"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Cpu, Check, Zap } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Header } from "@/components/dashboard/header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { modelsApi, deploymentsApi, type Model, type GpuTier } from "@/lib/api";
import { cn } from "@/lib/utils";

type Step = "model" | "config" | "review";

export default function NewDeploymentPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("model");
  const [models, setModels] = useState<Model[]>([]);
  const [gpuTiers, setGpuTiers] = useState<GpuTier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeploying, setIsDeploying] = useState(false);

  // Form state
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [selectedGpu, setSelectedGpu] = useState<GpuTier | null>(null);
  const [name, setName] = useState("");
  const [replicas, setReplicas] = useState(1);
  const [maxTokens, setMaxTokens] = useState(4096);

  useEffect(() => {
    async function loadData() {
      try {
        const { models, gpuTiers } = await modelsApi.list();
        setModels(models);
        setGpuTiers(gpuTiers);
      } catch (error) {
        toast.error("Failed to load models");
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  function selectModel(model: Model) {
    setSelectedModel(model);
    setName(model.displayName.toLowerCase().replace(/\s+/g, "-"));

    // Auto-select compatible GPU
    const compatible = gpuTiers.find((g) => g.id === model.minGpuTier);
    if (compatible) {
      setSelectedGpu(compatible);
    }

    setStep("config");
  }

  function getCompatibleGpus(model: Model): GpuTier[] {
    const tierOrder = ["3060", "4070", "4090", "a100", "h100"];
    const minIndex = tierOrder.indexOf(model.minGpuTier);
    return gpuTiers.filter((g) => tierOrder.indexOf(g.id) >= minIndex);
  }

  async function handleDeploy() {
    if (!selectedModel || !selectedGpu) return;

    setIsDeploying(true);
    try {
      const { deployment } = await deploymentsApi.create({
        name,
        modelId: selectedModel.id,
        gpuTier: selectedGpu.id,
        engine: selectedModel.defaultEngine as "vllm" | "ollama",
        replicas,
        config: { maxTokens },
      });

      toast.success("Deployment created! Provisioning GPU...");
      router.push(`/dashboard/deployments/${deployment.id}`);
    } catch (error) {
      toast.error("Failed to create deployment");
    } finally {
      setIsDeploying(false);
    }
  }

  function formatPrice(pricePerHour: number): string {
    return `$${pricePerHour.toFixed(2)}/hr`;
  }

  function formatParams(params: number): string {
    if (params >= 1e9) return `${(params / 1e9).toFixed(0)}B`;
    if (params >= 1e6) return `${(params / 1e6).toFixed(0)}M`;
    return params.toString();
  }

  const estimatedCost = selectedGpu ? selectedGpu.pricePerHour * replicas * 24 * 30 : 0;

  return (
    <div className="flex flex-col">
      <Header title="Deploy Model" description="Launch a new inference endpoint" />

      <div className="p-8">
        {/* Progress steps */}
        <div className="mb-8 flex items-center justify-center">
          <div className="flex items-center gap-4">
            {[
              { id: "model", label: "Select Model" },
              { id: "config", label: "Configure" },
              { id: "review", label: "Review & Deploy" },
            ].map((s, i) => (
              <div key={s.id} className="flex items-center gap-4">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium",
                    step === s.id
                      ? "bg-primary-600 text-white"
                      : ["model"].indexOf(step) < ["model", "config", "review"].indexOf(s.id)
                      ? "bg-gray-200 text-gray-500"
                      : "bg-green-100 text-green-600"
                  )}
                >
                  {["model"].indexOf(step) > ["model", "config", "review"].indexOf(s.id) ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    i + 1
                  )}
                </div>
                <span
                  className={cn(
                    "text-sm font-medium",
                    step === s.id ? "text-gray-900" : "text-gray-500"
                  )}
                >
                  {s.label}
                </span>
                {i < 2 && <div className="h-px w-12 bg-gray-300" />}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Select Model */}
        {step === "model" && (
          <div>
            <h2 className="mb-4 text-lg font-semibold">Choose a model to deploy</h2>
            {isLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-48 animate-pulse rounded-lg bg-gray-200" />
                ))}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {models.map((model) => (
                  <Card
                    key={model.id}
                    className={cn(
                      "cursor-pointer transition-all hover:border-primary-300 hover:shadow-md",
                      selectedModel?.id === model.id && "border-primary-500 ring-2 ring-primary-200"
                    )}
                    onClick={() => selectModel(model)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base">{model.displayName}</CardTitle>
                        <Badge variant="secondary">{formatParams(model.parameters)}</Badge>
                      </div>
                      <CardDescription className="line-clamp-2">
                        {model.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {model.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      <div className="mt-3 flex items-center justify-between text-sm text-gray-500">
                        <span>Min: {model.minGpuTier}</span>
                        <span>{model.contextLength.toLocaleString()} ctx</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Configure */}
        {step === "config" && selectedModel && (
          <div className="mx-auto max-w-2xl">
            <Button variant="ghost" className="mb-4" onClick={() => setStep("model")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to models
            </Button>

            <Card>
              <CardHeader>
                <CardTitle>Configure Deployment</CardTitle>
                <CardDescription>
                  Deploying {selectedModel.displayName}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Deployment Name
                  </label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="my-llama-deployment"
                    className="mt-1"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    This will be used in your endpoint URL
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    GPU Type
                  </label>
                  <div className="mt-2 grid gap-3 sm:grid-cols-2">
                    {getCompatibleGpus(selectedModel).map((gpu) => (
                      <div
                        key={gpu.id}
                        className={cn(
                          "cursor-pointer rounded-lg border-2 p-4 transition-all",
                          selectedGpu?.id === gpu.id
                            ? "border-primary-500 bg-primary-50"
                            : "border-gray-200 hover:border-gray-300"
                        )}
                        onClick={() => setSelectedGpu(gpu)}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{gpu.name}</span>
                          <span className="text-sm text-gray-500">
                            {formatPrice(gpu.pricePerHour)}
                          </span>
                        </div>
                        <div className="mt-1 text-sm text-gray-500">
                          {gpu.vram}GB VRAM &middot; {gpu.available} available
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Replicas
                    </label>
                    <Select
                      value={replicas.toString()}
                      onChange={(e) => setReplicas(parseInt(e.target.value))}
                      className="mt-1"
                    >
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>
                          {n} replica{n > 1 ? "s" : ""}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Max Tokens
                    </label>
                    <Select
                      value={maxTokens.toString()}
                      onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                      className="mt-1"
                    >
                      {[2048, 4096, 8192, 16384, 32768].map((n) => (
                        <option key={n} value={n}>
                          {n.toLocaleString()}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>

                <div className="rounded-lg bg-gray-50 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      Estimated Monthly Cost
                    </span>
                    <span className="text-lg font-bold text-gray-900">
                      ${estimatedCost.toFixed(2)}/mo
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Based on 24/7 usage. Actual cost depends on uptime.
                  </p>
                </div>

                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setStep("model")}>
                    Back
                  </Button>
                  <Button onClick={() => setStep("review")} disabled={!selectedGpu}>
                    Continue
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 3: Review & Deploy */}
        {step === "review" && selectedModel && selectedGpu && (
          <div className="mx-auto max-w-2xl">
            <Button variant="ghost" className="mb-4" onClick={() => setStep("config")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to configuration
            </Button>

            <Card>
              <CardHeader>
                <CardTitle>Review & Deploy</CardTitle>
                <CardDescription>
                  Confirm your deployment settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="rounded-lg border border-gray-200 divide-y">
                  <div className="flex items-center justify-between p-4">
                    <span className="text-gray-600">Model</span>
                    <span className="font-medium">{selectedModel.displayName}</span>
                  </div>
                  <div className="flex items-center justify-between p-4">
                    <span className="text-gray-600">Deployment Name</span>
                    <span className="font-medium">{name}</span>
                  </div>
                  <div className="flex items-center justify-between p-4">
                    <span className="text-gray-600">GPU</span>
                    <span className="font-medium">{selectedGpu.name}</span>
                  </div>
                  <div className="flex items-center justify-between p-4">
                    <span className="text-gray-600">Replicas</span>
                    <span className="font-medium">{replicas}</span>
                  </div>
                  <div className="flex items-center justify-between p-4">
                    <span className="text-gray-600">Max Tokens</span>
                    <span className="font-medium">{maxTokens.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between p-4">
                    <span className="text-gray-600">Engine</span>
                    <span className="font-medium">{selectedModel.defaultEngine}</span>
                  </div>
                </div>

                <div className="rounded-lg bg-primary-50 p-4">
                  <div className="flex items-start gap-3">
                    <Zap className="h-5 w-5 text-primary-600" />
                    <div>
                      <p className="font-medium text-primary-900">Ready to deploy</p>
                      <p className="mt-1 text-sm text-primary-700">
                        Your endpoint will be available at:{" "}
                        <code className="rounded bg-primary-100 px-1">
                          https://api.wheelsai.io/v1/{name}
                        </code>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setStep("config")}>
                    Back
                  </Button>
                  <Button onClick={handleDeploy} isLoading={isDeploying}>
                    <Cpu className="mr-2 h-4 w-4" />
                    Deploy Model
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
