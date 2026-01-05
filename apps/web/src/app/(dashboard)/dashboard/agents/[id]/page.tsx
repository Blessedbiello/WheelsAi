"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bot,
  Play,
  Square,
  RefreshCw,
  Trash2,
  Settings,
  Code,
  Terminal,
  Wallet,
  Copy,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

import { Header } from "@/components/dashboard/header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { agentsApi, type AgentDetail, type AgentDeployment } from "@/lib/api";
import { cn } from "@/lib/utils";

const frameworkColors: Record<string, string> = {
  mastra: "bg-purple-100 text-purple-700",
  langchain: "bg-green-100 text-green-700",
  autogen: "bg-blue-100 text-blue-700",
  custom: "bg-gray-100 text-gray-700",
};

const statusColors: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
  running: "success",
  building: "warning",
  deploying: "warning",
  pending: "secondary",
  stopped: "secondary",
  failed: "destructive",
};

type Tab = "overview" | "deployments" | "code" | "logs" | "settings";

export default function AgentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const agentId = params.id as string;

  const [agent, setAgent] = useState<AgentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [isDeploying, setIsDeploying] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Deploy form state
  const [deployConfig, setDeployConfig] = useState({
    gpuTier: "rtx-4090",
    replicas: 1,
    enableWallet: false,
    dailyLimitCents: 1000,
  });

  async function loadAgent() {
    try {
      const { agent } = await agentsApi.get(agentId);
      setAgent(agent);
    } catch (error) {
      toast.error("Failed to load agent");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadAgent();
  }, [agentId]);

  async function handleDeploy() {
    setIsDeploying(true);
    try {
      await agentsApi.deploy(agentId, {
        gpuTier: deployConfig.gpuTier,
        replicas: deployConfig.replicas,
        enableWallet: deployConfig.enableWallet,
        walletConfig: deployConfig.enableWallet
          ? { dailyLimitCents: deployConfig.dailyLimitCents }
          : undefined,
      });
      toast.success("Deployment started");
      loadAgent();
    } catch (error) {
      toast.error("Failed to deploy agent");
    } finally {
      setIsDeploying(false);
    }
  }

  async function handleStop(deploymentId: string) {
    setIsStopping(true);
    try {
      await agentsApi.stopDeployment(agentId, deploymentId);
      toast.success("Deployment stopped");
      loadAgent();
    } catch (error) {
      toast.error("Failed to stop deployment");
    } finally {
      setIsStopping(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this agent? This action cannot be undone.")) {
      return;
    }

    setIsDeleting(true);
    try {
      await agentsApi.delete(agentId);
      toast.success("Agent deleted");
      router.push("/dashboard/agents");
    } catch (error) {
      toast.error("Failed to delete agent");
    } finally {
      setIsDeleting(false);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  }

  if (isLoading) {
    return (
      <div className="flex flex-col">
        <Header title="Loading..." />
        <div className="p-8">
          <div className="h-96 animate-pulse rounded-lg bg-gray-200" />
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="flex flex-col">
        <Header title="Agent Not Found" />
        <div className="p-8">
          <Card>
            <CardContent className="py-16 text-center">
              <Bot className="mx-auto h-16 w-16 text-gray-300" />
              <h3 className="mt-4 text-xl font-medium">Agent not found</h3>
              <Link href="/dashboard/agents" className="mt-4 inline-block">
                <Button variant="outline">Back to Agents</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const latestDeployment = agent.deployments?.[0];
  const isRunning = latestDeployment?.status === "running";

  return (
    <div className="flex flex-col">
      <Header
        title={agent.name}
        description={agent.description || `${agent.framework} agent`}
      />

      <div className="p-8">
        {/* Status bar */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-100">
                  <Bot className="h-6 w-6 text-primary-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={cn("rounded px-2 py-0.5 text-xs font-medium", frameworkColors[agent.framework])}>
                      {agent.framework}
                    </span>
                    <span className="text-sm text-gray-500">v{agent.version}</span>
                    {latestDeployment && (
                      <Badge variant={statusColors[latestDeployment.status]}>
                        {latestDeployment.status}
                      </Badge>
                    )}
                  </div>
                  {latestDeployment?.endpoint && (
                    <div className="mt-1 flex items-center gap-2">
                      <code className="text-sm text-gray-600">{latestDeployment.endpoint}</code>
                      <button onClick={() => copyToClipboard(latestDeployment.endpoint!)}>
                        <Copy className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                {isRunning ? (
                  <Button
                    variant="destructive"
                    onClick={() => handleStop(latestDeployment.id)}
                    isLoading={isStopping}
                  >
                    <Square className="mr-2 h-4 w-4" />
                    Stop
                  </Button>
                ) : (
                  <Button onClick={handleDeploy} isLoading={isDeploying}>
                    <Play className="mr-2 h-4 w-4" />
                    Deploy
                  </Button>
                )}
                <Button variant="outline" onClick={loadAgent}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <div className="mb-6 flex gap-2 border-b">
          {(["overview", "deployments", "code", "logs", "settings"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "border-b-2 px-4 py-2 text-sm font-medium transition-colors",
                activeTab === tab
                  ? "border-primary-500 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              )}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === "overview" && (
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Model</p>
                  <p className="font-medium">{(agent.modelConfig as any)?.externalModel || "Not configured"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Temperature</p>
                  <p className="font-medium">{(agent.modelConfig as any)?.temperature || 0.7}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Max Tokens</p>
                  <p className="font-medium">{(agent.modelConfig as any)?.maxTokens || 4096}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Source</p>
                  <p className="font-medium capitalize">{agent.sourceType}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tools ({(agent.tools as any[])?.length || 0})</CardTitle>
              </CardHeader>
              <CardContent>
                {(agent.tools as any[])?.length > 0 ? (
                  <div className="space-y-2">
                    {(agent.tools as any[]).map((tool: any, index: number) => (
                      <div key={index} className="flex items-center gap-2 rounded border p-2">
                        <Settings className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{tool.name}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No tools configured</p>
                )}
              </CardContent>
            </Card>

            {agent.systemPrompt && (
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">System Prompt</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="whitespace-pre-wrap rounded bg-gray-50 p-4 text-sm">
                    {agent.systemPrompt}
                  </pre>
                </CardContent>
              </Card>
            )}

            {/* Deploy configuration */}
            {!isRunning && (
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">Deploy Configuration</CardTitle>
                  <CardDescription>Configure deployment settings</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">GPU Tier</label>
                      <Select
                        value={deployConfig.gpuTier}
                        onChange={(e) => setDeployConfig({ ...deployConfig, gpuTier: e.target.value })}
                        className="mt-1"
                      >
                        <option value="rtx-3060">RTX 3060 ($0.20/hr)</option>
                        <option value="rtx-4070">RTX 4070 ($0.35/hr)</option>
                        <option value="rtx-4090">RTX 4090 ($0.50/hr)</option>
                        <option value="a100">A100 ($1.50/hr)</option>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Replicas</label>
                      <Select
                        value={deployConfig.replicas.toString()}
                        onChange={(e) => setDeployConfig({ ...deployConfig, replicas: parseInt(e.target.value) })}
                        className="mt-1"
                      >
                        {[1, 2, 3, 4, 5].map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </Select>
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <input
                          type="checkbox"
                          checked={deployConfig.enableWallet}
                          onChange={(e) => setDeployConfig({ ...deployConfig, enableWallet: e.target.checked })}
                        />
                        Enable Agent Wallet
                      </label>
                      {deployConfig.enableWallet && (
                        <Input
                          type="number"
                          value={deployConfig.dailyLimitCents / 100}
                          onChange={(e) => setDeployConfig({ ...deployConfig, dailyLimitCents: parseFloat(e.target.value) * 100 })}
                          placeholder="Daily limit (USD)"
                          className="mt-2"
                        />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {activeTab === "deployments" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Deployment History</CardTitle>
            </CardHeader>
            <CardContent>
              {agent.deployments?.length > 0 ? (
                <div className="space-y-4">
                  {agent.deployments.map((deployment: AgentDeployment) => (
                    <div
                      key={deployment.id}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div className="flex items-center gap-4">
                        <Badge variant={statusColors[deployment.status]}>
                          {deployment.status}
                        </Badge>
                        <div>
                          <p className="font-medium">{deployment.id.slice(0, 8)}...</p>
                          <p className="text-sm text-gray-500">
                            {new Date(deployment.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      {deployment.endpoint && (
                        <code className="rounded bg-gray-100 px-2 py-1 text-sm">
                          {deployment.endpoint}
                        </code>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500">No deployments yet</p>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "code" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Agent Code</CardTitle>
              <CardDescription>
                Source type: {agent.sourceType}
                {agent.sourceUrl && ` - ${agent.sourceUrl}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {agent.sourceCode ? (
                <pre className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-sm text-gray-100">
                  {agent.sourceCode}
                </pre>
              ) : agent.sourceUrl ? (
                <a
                  href={agent.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-primary-600 hover:underline"
                >
                  <ExternalLink className="h-4 w-4" />
                  View source
                </a>
              ) : (
                <p className="text-gray-500">No source code available</p>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "logs" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="h-96 overflow-auto rounded-lg bg-gray-900 p-4 text-sm text-gray-100">
                {latestDeployment?.buildLogs || "No logs available"}
              </pre>
            </CardContent>
          </Card>
        )}

        {activeTab === "settings" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Agent Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500">Settings editing coming soon...</p>
              </CardContent>
            </Card>

            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-base text-red-600">Danger Zone</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Delete Agent</p>
                    <p className="text-sm text-gray-500">
                      Permanently delete this agent and all its deployments
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    isLoading={isDeleting}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Agent
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
