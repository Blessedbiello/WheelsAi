"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Brain,
  MessageSquare,
  Database,
  Activity,
  Clock,
  Bot,
  ChevronRight,
  Plus,
  Search,
  Filter,
  Trash2,
  Eye,
  Tag,
  Zap,
} from "lucide-react";
import {
  memoryApi,
  agentsApi,
  type Conversation,
  type ConversationStats,
  type Agent,
} from "@/lib/api";

export default function MemoryPage() {
  const router = useRouter();
  const [stats, setStats] = useState<ConversationStats | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [showActiveOnly, setShowActiveOnly] = useState(false);

  useEffect(() => {
    loadData();
  }, [selectedAgent, showActiveOnly]);

  async function loadData() {
    try {
      setLoading(true);
      const [statsData, conversationsData, agentsData] = await Promise.all([
        memoryApi.getStats(selectedAgent || undefined),
        memoryApi.getConversations({
          agentId: selectedAgent || undefined,
          isActive: showActiveOnly ? true : undefined,
          limit: 20,
        }),
        agentsApi.list(),
      ]);

      setStats(statsData);
      setConversations(conversationsData.conversations);
      setAgents(agentsData.agents);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function deleteConversation(id: string) {
    if (!confirm("Are you sure you want to delete this conversation?")) return;
    try {
      await memoryApi.deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      loadData();
    } catch (error) {
      console.error("Failed to delete conversation:", error);
    }
  }

  const filteredConversations = conversations.filter(
    (conv) =>
      !searchQuery ||
      conv.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.agent?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Conversation Memory</h1>
        <p className="text-gray-600 mt-1">
          Manage conversation history and memory contexts for your agents
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard
            icon={MessageSquare}
            label="Total Conversations"
            value={stats.totalConversations}
          />
          <StatCard
            icon={Activity}
            label="Active"
            value={stats.activeConversations}
            color="green"
          />
          <StatCard
            icon={Database}
            label="Total Messages"
            value={stats.totalMessages}
            color="blue"
          />
          <StatCard
            icon={Zap}
            label="Total Tokens"
            value={formatNumber(stats.totalTokens)}
            color="yellow"
          />
          <StatCard
            icon={Clock}
            label="Avg Messages"
            value={stats.avgMessagesPerConversation}
            color="purple"
          />
          <StatCard
            icon={Brain}
            label="Memory Contexts"
            value={stats.totalMemoryContexts}
            color="pink"
          />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        <select
          value={selectedAgent}
          onChange={(e) => setSelectedAgent(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        >
          <option value="">All Agents</option>
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.name}
            </option>
          ))}
        </select>

        <button
          onClick={() => setShowActiveOnly(!showActiveOnly)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
            showActiveOnly
              ? "bg-primary-50 border-primary-300 text-primary-700"
              : "border-gray-300 text-gray-700 hover:bg-gray-50"
          }`}
        >
          <Filter className="h-4 w-4" />
          Active Only
        </button>
      </div>

      {/* Conversations List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Conversations</h2>
        </div>

        {filteredConversations.length === 0 ? (
          <div className="p-12 text-center">
            <Brain className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No conversations found
            </h3>
            <p className="text-gray-500">
              Conversations will appear here once your agents start chatting
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                className="px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-2 w-2 rounded-full ${
                          conversation.isActive ? "bg-green-500" : "bg-gray-300"
                        }`}
                      />
                      <h3 className="font-medium text-gray-900 truncate">
                        {conversation.title || `Conversation ${conversation.id.slice(0, 8)}`}
                      </h3>
                      {conversation.agent && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-50 text-primary-700 rounded text-xs">
                          <Bot className="h-3 w-3" />
                          {conversation.agent.name}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3.5 w-3.5" />
                        {conversation.messageCount} messages
                      </span>
                      <span className="flex items-center gap-1">
                        <Zap className="h-3.5 w-3.5" />
                        {formatNumber(conversation.totalTokens)} tokens
                      </span>
                      <span className="flex items-center gap-1">
                        <Brain className="h-3.5 w-3.5" />
                        {conversation._count?.memoryContexts ?? 0} memories
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {formatDate(conversation.lastMessageAt)}
                      </span>
                    </div>

                    {conversation.summary && (
                      <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                        {conversation.summary}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() =>
                        router.push(`/dashboard/memory/${conversation.id}`)
                      }
                      className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                      title="View conversation"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deleteConversation(conversation.id)}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete conversation"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color = "gray",
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  color?: "gray" | "green" | "blue" | "yellow" | "purple" | "pink";
}) {
  const colorClasses = {
    gray: "bg-gray-100 text-gray-600",
    green: "bg-green-100 text-green-600",
    blue: "bg-blue-100 text-blue-600",
    yellow: "bg-yellow-100 text-yellow-600",
    purple: "bg-purple-100 text-purple-600",
    pink: "bg-pink-100 text-pink-600",
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-lg font-semibold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
