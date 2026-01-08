"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Trophy,
  Medal,
  Crown,
  Users,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { reputationApi, type LeaderboardEntry } from "@/lib/api";
import {
  ReputationScore,
  ReputationTierBadge,
} from "@/components/reputation/reputation-score";
import { ReputationBadgeList } from "@/components/reputation/reputation-badge";

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [stats, setStats] = useState<{
    totalPublishers: number;
    averageScore: number;
    tierDistribution: Record<string, number>;
  } | null>(null);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedTier) {
      loadTierPublishers(selectedTier);
    } else {
      loadData();
    }
  }, [selectedTier]);

  async function loadData() {
    try {
      const [leaderboardRes, statsRes] = await Promise.all([
        reputationApi.getLeaderboard(20),
        reputationApi.getStats(),
      ]);
      setLeaderboard(leaderboardRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error("Failed to load leaderboard:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadTierPublishers(tier: string) {
    setLoading(true);
    try {
      const res = await reputationApi.getPublishersByTier(tier, 20);
      setLeaderboard(res.data);
    } catch (error) {
      console.error("Failed to load tier publishers:", error);
    } finally {
      setLoading(false);
    }
  }

  const tiers = [
    { id: "platinum", label: "Platinum", color: "bg-cyan-500/20 text-cyan-400" },
    { id: "gold", label: "Gold", color: "bg-yellow-500/20 text-yellow-400" },
    { id: "silver", label: "Silver", color: "bg-gray-400/20 text-gray-300" },
    { id: "bronze", label: "Bronze", color: "bg-orange-500/20 text-orange-400" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-yellow-500/20 rounded-lg">
              <Trophy className="h-8 w-8 text-yellow-500" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Publisher Leaderboard</h1>
              <p className="text-muted-foreground">
                Top rated publishers on WheelsAI Marketplace
              </p>
            </div>
          </div>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="bg-card rounded-lg p-4 border">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Users className="h-4 w-4" />
                  <span className="text-sm">Total Publishers</span>
                </div>
                <div className="text-2xl font-bold">{stats.totalPublishers}</div>
              </div>
              <div className="bg-card rounded-lg p-4 border">
                <div className="text-sm text-muted-foreground mb-1">
                  Average Score
                </div>
                <div className="text-2xl font-bold">
                  {Math.round(stats.averageScore)}
                </div>
              </div>
              {tiers.slice(0, 2).map((tier) => (
                <div key={tier.id} className="bg-card rounded-lg p-4 border">
                  <div className="text-sm text-muted-foreground mb-1">
                    {tier.label} Publishers
                  </div>
                  <div className="text-2xl font-bold">
                    {stats.tierDistribution[tier.id] || 0}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tier Filter */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setSelectedTier(null)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedTier === null
                ? "bg-primary text-primary-foreground"
                : "bg-card border hover:bg-accent"
            }`}
          >
            All
          </button>
          {tiers.map((tier) => (
            <button
              key={tier.id}
              onClick={() => setSelectedTier(tier.id)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedTier === tier.id
                  ? tier.color + " border"
                  : "bg-card border hover:bg-accent"
              }`}
            >
              {tier.label}
            </button>
          ))}
        </div>

        {/* Leaderboard Table */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-20 bg-card border rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No publishers found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {leaderboard.map((publisher, index) => (
              <div
                key={publisher.orgId}
                className="bg-card border rounded-lg p-4 hover:border-primary/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  {/* Rank */}
                  <div className="flex-shrink-0 w-12 text-center">
                    {index === 0 && !selectedTier ? (
                      <Crown className="h-8 w-8 text-yellow-500 mx-auto" />
                    ) : index === 1 && !selectedTier ? (
                      <Medal className="h-8 w-8 text-gray-300 mx-auto" />
                    ) : index === 2 && !selectedTier ? (
                      <Medal className="h-8 w-8 text-orange-400 mx-auto" />
                    ) : (
                      <span className="text-2xl font-bold text-muted-foreground">
                        #{index + 1}
                      </span>
                    )}
                  </div>

                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    {publisher.avatarUrl ? (
                      <img
                        src={publisher.avatarUrl}
                        alt={publisher.displayName}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-xl font-bold">
                        {publisher.displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold truncate">
                        {publisher.displayName}
                      </h3>
                      {publisher.isVerified && (
                        <span className="text-blue-500">
                          <svg
                            className="h-4 w-4"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </span>
                      )}
                      <ReputationTierBadge tier={publisher.reputationTier} size="sm" />
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      <span>{publisher.totalListings} agents</span>
                      <span>{publisher.totalInstalls} installs</span>
                    </div>
                    {publisher.badges.length > 0 && (
                      <div className="mt-2">
                        <ReputationBadgeList
                          badges={publisher.badges}
                          size="sm"
                          maxShow={5}
                        />
                      </div>
                    )}
                  </div>

                  {/* Score */}
                  <div className="flex-shrink-0 text-right">
                    <div className="text-2xl font-bold">
                      {Math.round(publisher.reputationScore)}
                    </div>
                    <div className="text-sm text-muted-foreground">points</div>
                  </div>

                  {/* Link */}
                  <Link
                    href={`/marketplace?publisher=${publisher.slug}`}
                    className="flex-shrink-0 p-2 hover:bg-accent rounded-lg transition-colors"
                  >
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
