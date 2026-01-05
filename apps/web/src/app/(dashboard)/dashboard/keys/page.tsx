"use client";

import { useEffect, useState } from "react";
import { Key, Plus, Copy, Trash2, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { Header } from "@/components/dashboard/header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiKeysApi, type ApiKey } from "@/lib/api";

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());

  async function loadApiKeys() {
    try {
      const { apiKeys } = await apiKeysApi.list();
      setApiKeys(apiKeys);
    } catch (error) {
      toast.error("Failed to load API keys");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadApiKeys();
  }, []);

  async function handleCreateKey() {
    if (!newKeyName.trim()) {
      toast.error("Please enter a name for the API key");
      return;
    }

    setIsCreating(true);
    try {
      const { apiKey, key } = await apiKeysApi.create(newKeyName);
      setNewlyCreatedKey(key);
      setApiKeys([apiKey, ...apiKeys]);
      setNewKeyName("");
      toast.success("API key created successfully");
    } catch (error) {
      toast.error("Failed to create API key");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleRevokeKey(id: string) {
    try {
      await apiKeysApi.revoke(id);
      setApiKeys(apiKeys.filter((k) => k.id !== id));
      toast.success("API key revoked");
    } catch (error) {
      toast.error("Failed to revoke API key");
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  }

  function toggleKeyVisibility(id: string) {
    const newVisible = new Set(visibleKeys);
    if (newVisible.has(id)) {
      newVisible.delete(id);
    } else {
      newVisible.add(id);
    }
    setVisibleKeys(newVisible);
  }

  function maskKey(key: string): string {
    if (key.length <= 8) return "••••••••";
    return key.slice(0, 4) + "••••••••" + key.slice(-4);
  }

  return (
    <div className="flex flex-col">
      <Header
        title="API Keys"
        description="Manage your API keys for accessing WheelsAI endpoints"
      />

      <div className="p-8">
        {/* Create new key section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Create New API Key</CardTitle>
            <CardDescription>
              API keys are used to authenticate requests to your deployed models
            </CardDescription>
          </CardHeader>
          <CardContent>
            {newlyCreatedKey ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    <div>
                      <p className="font-medium text-yellow-800">
                        Save your API key now
                      </p>
                      <p className="mt-1 text-sm text-yellow-700">
                        This is the only time you'll see this key. Store it securely.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-lg bg-gray-100 px-4 py-3 text-sm font-mono">
                    {newlyCreatedKey}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(newlyCreatedKey)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>

                <Button
                  variant="outline"
                  onClick={() => {
                    setNewlyCreatedKey(null);
                    setShowCreateForm(false);
                  }}
                >
                  Done
                </Button>
              </div>
            ) : showCreateForm ? (
              <div className="flex items-end gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Key Name
                  </label>
                  <Input
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="e.g., Production, Development, CI/CD"
                    className="mt-1"
                  />
                </div>
                <Button onClick={handleCreateKey} isLoading={isCreating}>
                  Create Key
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewKeyName("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create New Key
              </Button>
            )}
          </CardContent>
        </Card>

        {/* API Keys list */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your API Keys</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-200" />
                ))}
              </div>
            ) : apiKeys.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Key className="h-12 w-12 text-gray-300" />
                <p className="mt-4 text-gray-500">No API keys yet</p>
                <p className="text-sm text-gray-400">
                  Create your first API key to start making requests
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {apiKeys.map((apiKey) => (
                  <div
                    key={apiKey.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                        <Key className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{apiKey.name}</p>
                          <Badge
                            variant={apiKey.status === "active" ? "success" : "destructive"}
                          >
                            {apiKey.status}
                          </Badge>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <code className="text-sm text-gray-500">
                            {visibleKeys.has(apiKey.id)
                              ? apiKey.keyPrefix + "••••••••"
                              : maskKey(apiKey.keyPrefix)}
                          </code>
                          <button
                            onClick={() => toggleKeyVisibility(apiKey.id)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            {visibleKeys.has(apiKey.id) ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right text-sm">
                        <p className="text-gray-500">Last used</p>
                        <p className="font-medium">
                          {apiKey.lastUsedAt
                            ? new Date(apiKey.lastUsedAt).toLocaleDateString()
                            : "Never"}
                        </p>
                      </div>
                      <div className="text-right text-sm">
                        <p className="text-gray-500">Created</p>
                        <p className="font-medium">
                          {new Date(apiKey.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      {apiKey.status === "active" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:bg-red-50 hover:text-red-600"
                          onClick={() => handleRevokeKey(apiKey.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Usage example */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Usage Example</CardTitle>
            <CardDescription>
              Use your API key to authenticate requests to your deployed models
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-sm text-gray-100">
{`curl https://api.wheelsai.io/v1/your-deployment/chat/completions \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "messages": [{"role": "user", "content": "Hello!"}],
    "max_tokens": 100
  }'`}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
