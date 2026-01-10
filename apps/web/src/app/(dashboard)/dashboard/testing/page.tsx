"use client";

import { useState, useEffect } from "react";
import { testingApi, agentsApi, TestSuite, TestRun, Agent } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// Icons
function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <path d="m9 11 3 3L22 4" />
    </svg>
  );
}

function XCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="m15 9-6 6" />
      <path d="m9 9 6 6" />
    </svg>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="6 3 20 12 6 21 6 3" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  );
}

function BeakerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4.5 3h15" />
      <path d="M6 3v16a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V3" />
      <path d="M6 14h12" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

export default function TestingPage() {
  const [suites, setSuites] = useState<TestSuite[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [stats, setStats] = useState<{
    totalSuites: number;
    totalTests: number;
    avgPassRate: number;
    recentRuns: any[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSuite, setSelectedSuite] = useState<TestSuite | null>(null);

  // Form state
  const [form, setForm] = useState({
    agentId: "",
    name: "",
    description: "",
    timeout: 30000,
    retries: 0,
    parallel: false,
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [suitesRes, agentsRes, statsRes] = await Promise.all([
        testingApi.getSuites(),
        agentsApi.list(),
        testingApi.getStats(),
      ]);
      setSuites(suitesRes.data.suites);
      setAgents(agentsRes.agents);
      setStats(statsRes.data);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function createSuite() {
    try {
      const res = await testingApi.createSuite({
        agentId: form.agentId,
        name: form.name,
        description: form.description,
        timeout: form.timeout,
        retries: form.retries,
        parallel: form.parallel,
      });
      setSuites([res.data, ...suites]);
      setShowCreateModal(false);
      setForm({
        agentId: "",
        name: "",
        description: "",
        timeout: 30000,
        retries: 0,
        parallel: false,
      });
    } catch (error) {
      console.error("Failed to create suite:", error);
    }
  }

  async function deleteSuite(id: string) {
    if (!confirm("Are you sure you want to delete this test suite?")) return;
    try {
      await testingApi.deleteSuite(id);
      setSuites(suites.filter((s) => s.id !== id));
    } catch (error) {
      console.error("Failed to delete suite:", error);
    }
  }

  async function runSuite(suiteId: string) {
    try {
      const res = await testingApi.runSuite(suiteId);
      alert(`Test run started! ID: ${res.data.id}`);
      loadData();
    } catch (error: any) {
      alert(`Failed to run tests: ${error.message}`);
    }
  }

  function getStatusColor(status: string | null) {
    switch (status) {
      case "passed":
        return "text-green-600 bg-green-100";
      case "failed":
        return "text-red-600 bg-red-100";
      case "partial":
        return "text-yellow-600 bg-yellow-100";
      case "running":
        return "text-blue-600 bg-blue-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  }

  function getRunStatusColor(status: string) {
    switch (status) {
      case "completed":
        return "text-green-600";
      case "failed":
        return "text-red-600";
      case "running":
        return "text-blue-600";
      case "cancelled":
        return "text-gray-600";
      default:
        return "text-yellow-600";
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Testing</h1>
        <p className="text-muted-foreground mt-2">
          Create test suites to validate your agents work correctly
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="border rounded-lg p-4">
            <div className="text-2xl font-bold">{stats.totalSuites}</div>
            <div className="text-sm text-muted-foreground">Test Suites</div>
          </div>
          <div className="border rounded-lg p-4">
            <div className="text-2xl font-bold">{stats.totalTests}</div>
            <div className="text-sm text-muted-foreground">Total Tests</div>
          </div>
          <div className="border rounded-lg p-4">
            <div className="text-2xl font-bold">
              {stats.avgPassRate.toFixed(1)}%
            </div>
            <div className="text-sm text-muted-foreground">Avg Pass Rate</div>
          </div>
          <div className="border rounded-lg p-4">
            <div className="text-2xl font-bold">{stats.recentRuns.length}</div>
            <div className="text-sm text-muted-foreground">Recent Runs</div>
          </div>
        </div>
      )}

      {/* Test Suites */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Test Suites</h2>
          <Button onClick={() => setShowCreateModal(true)}>
            <PlusIcon className="w-4 h-4 mr-2" />
            New Suite
          </Button>
        </div>

        {suites.length === 0 ? (
          <div className="border rounded-lg p-12 text-center">
            <BeakerIcon className="w-12 h-12 mx-auto text-muted-foreground" />
            <h3 className="mt-4 font-semibold">No test suites yet</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Create a test suite to start testing your agents
            </p>
            <Button className="mt-4" onClick={() => setShowCreateModal(true)}>
              Create Test Suite
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {suites.map((suite) => {
              const agent = agents.find((a) => a.id === suite.agentId);
              return (
                <div
                  key={suite.id}
                  className="border rounded-lg p-4 hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{suite.name}</span>
                        {suite.lastStatus && (
                          <span
                            className={`px-2 py-0.5 text-xs rounded capitalize ${getStatusColor(
                              suite.lastStatus
                            )}`}
                          >
                            {suite.lastStatus}
                          </span>
                        )}
                      </div>
                      {suite.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {suite.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span>Agent: {agent?.name || "Unknown"}</span>
                        <span>{suite.totalTests} tests</span>
                        {suite.passRate !== null && (
                          <span>{suite.passRate.toFixed(1)}% pass rate</span>
                        )}
                        {suite.lastRunAt && (
                          <span className="flex items-center gap-1">
                            <ClockIcon className="w-3 h-3" />
                            Last run: {new Date(suite.lastRunAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => runSuite(suite.id)}
                        disabled={suite.totalTests === 0}
                      >
                        <PlayIcon className="w-4 h-4 mr-1" />
                        Run
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedSuite(suite)}
                      >
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteSuite(suite.id)}
                      >
                        <TrashIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Runs */}
      {stats && stats.recentRuns.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Recent Runs</h2>
          <div className="border rounded-lg divide-y">
            {stats.recentRuns.map((run: any) => (
              <div key={run.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium">{run.suite?.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(run.createdAt).toLocaleString()}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className={`font-medium ${getRunStatusColor(run.status)}`}>
                      {run.status}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {run.passedTests}/{run.totalTests} passed
                    </div>
                  </div>
                  {run.passRate !== null && (
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        run.passRate >= 80
                          ? "bg-green-100 text-green-700"
                          : run.passRate >= 50
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      <span className="text-sm font-bold">
                        {run.passRate.toFixed(0)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Suite Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 max-w-lg w-full mx-4">
            <h2 className="text-xl font-semibold mb-4">Create Test Suite</h2>
            <div className="space-y-4">
              <div>
                <Label>Agent</Label>
                <select
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                  value={form.agentId}
                  onChange={(e) => setForm({ ...form, agentId: e.target.value })}
                >
                  <option value="">Select an agent</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="My Test Suite"
                />
              </div>
              <div>
                <Label>Description (optional)</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="Describe what this test suite validates"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Timeout (ms)</Label>
                  <Input
                    type="number"
                    value={form.timeout}
                    onChange={(e) =>
                      setForm({ ...form, timeout: parseInt(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <Label>Retries</Label>
                  <Input
                    type="number"
                    value={form.retries}
                    onChange={(e) =>
                      setForm({ ...form, retries: parseInt(e.target.value) })
                    }
                  />
                </div>
              </div>
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.parallel}
                    onChange={(e) =>
                      setForm({ ...form, parallel: e.target.checked })
                    }
                  />
                  <span className="text-sm">Run tests in parallel</span>
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button onClick={createSuite} disabled={!form.agentId || !form.name}>
                Create Suite
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Suite Detail Modal */}
      {selectedSuite && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">{selectedSuite.name}</h2>
              <button onClick={() => setSelectedSuite(null)} className="text-muted-foreground hover:text-foreground">
                Close
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="border rounded-lg p-3">
                  <div className="text-xl font-bold">{selectedSuite.totalTests}</div>
                  <div className="text-sm text-muted-foreground">Tests</div>
                </div>
                <div className="border rounded-lg p-3">
                  <div className="text-xl font-bold">
                    {selectedSuite.passRate?.toFixed(1) || 0}%
                  </div>
                  <div className="text-sm text-muted-foreground">Pass Rate</div>
                </div>
                <div className="border rounded-lg p-3">
                  <div className="text-xl font-bold capitalize">
                    {selectedSuite.lastStatus || "N/A"}
                  </div>
                  <div className="text-sm text-muted-foreground">Last Status</div>
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <h3 className="font-medium mb-2">Configuration</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Timeout:</span>{" "}
                    {selectedSuite.timeout}ms
                  </div>
                  <div>
                    <span className="text-muted-foreground">Retries:</span>{" "}
                    {selectedSuite.retries}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Parallel:</span>{" "}
                    {selectedSuite.parallel ? "Yes" : "No"}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Enabled:</span>{" "}
                    {selectedSuite.isEnabled ? "Yes" : "No"}
                  </div>
                </div>
              </div>

              {selectedSuite.description && (
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium mb-2">Description</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedSuite.description}
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() => {
                    runSuite(selectedSuite.id);
                    setSelectedSuite(null);
                  }}
                  disabled={selectedSuite.totalTests === 0}
                >
                  <PlayIcon className="w-4 h-4 mr-2" />
                  Run Tests
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
