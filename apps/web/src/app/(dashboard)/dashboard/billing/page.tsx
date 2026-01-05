"use client";

import { useEffect, useState } from "react";
import {
  CreditCard,
  Plus,
  Download,
  TrendingUp,
  DollarSign,
  Clock,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { toast } from "sonner";

import { Header } from "@/components/dashboard/header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { billingApi, type CreditBalance, type CreditTransaction, type UsageSummary } from "@/lib/api";
import { cn } from "@/lib/utils";

const creditPackages = [
  { amount: 10, bonus: 0, price: 10, popular: false },
  { amount: 50, bonus: 5, price: 50, popular: true },
  { amount: 100, bonus: 15, price: 100, popular: false },
  { amount: 500, bonus: 100, price: 500, popular: false },
];

export default function BillingPage() {
  const [balance, setBalance] = useState<CreditBalance | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState<number | null>(null);

  async function loadBillingData() {
    try {
      const [balanceData, transactionsData, usageData] = await Promise.all([
        billingApi.getBalance(),
        billingApi.getTransactions(),
        billingApi.getUsage(),
      ]);
      setBalance(balanceData.balance);
      setTransactions(transactionsData.transactions);
      setUsage(usageData.usage);
    } catch (error) {
      toast.error("Failed to load billing data");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadBillingData();
  }, []);

  async function handlePurchase(packageIndex: number) {
    const pkg = creditPackages[packageIndex];
    setIsPurchasing(packageIndex);

    try {
      const { checkoutUrl } = await billingApi.createCheckout(pkg.amount);
      // In production, redirect to Stripe checkout
      // window.location.href = checkoutUrl;
      toast.success(`Redirecting to checkout for $${pkg.price}...`);
      // Simulated for demo
      setTimeout(() => {
        toast.success(`Added $${pkg.amount + pkg.bonus} in credits!`);
        loadBillingData();
      }, 1500);
    } catch (error) {
      toast.error("Failed to create checkout session");
    } finally {
      setIsPurchasing(null);
    }
  }

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  }

  if (isLoading) {
    return (
      <div className="flex flex-col">
        <Header title="Billing" />
        <div className="p-8">
          <div className="grid gap-6 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-lg bg-gray-200" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <Header
        title="Billing & Credits"
        description="Manage your account balance and view usage"
      />

      <div className="p-8">
        {/* Balance overview */}
        <div className="mb-8 grid gap-6 md:grid-cols-3">
          <Card>
            <CardContent className="py-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Available Credits</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {formatCurrency(balance?.available || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                  <TrendingUp className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">This Month's Usage</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {formatCurrency(usage?.currentMonth || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100">
                  <Zap className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">GPU Hours Used</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {(usage?.gpuHours || 0).toFixed(1)}h
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Purchase credits */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-base">Add Credits</CardTitle>
            <CardDescription>
              Purchase credits to pay for GPU compute time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              {creditPackages.map((pkg, index) => (
                <div
                  key={pkg.amount}
                  className={cn(
                    "relative rounded-lg border-2 p-6 text-center transition-all",
                    pkg.popular
                      ? "border-primary-500 bg-primary-50"
                      : "border-gray-200 hover:border-gray-300"
                  )}
                >
                  {pkg.popular && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                      Most Popular
                    </Badge>
                  )}
                  <p className="text-3xl font-bold text-gray-900">
                    ${pkg.amount}
                  </p>
                  {pkg.bonus > 0 && (
                    <p className="mt-1 text-sm font-medium text-green-600">
                      +${pkg.bonus} bonus
                    </p>
                  )}
                  <p className="mt-2 text-sm text-gray-500">
                    {formatCurrency(pkg.amount + pkg.bonus)} total
                  </p>
                  <Button
                    className="mt-4 w-full"
                    variant={pkg.popular ? "default" : "outline"}
                    onClick={() => handlePurchase(index)}
                    isLoading={isPurchasing === index}
                  >
                    Purchase
                  </Button>
                </div>
              ))}
            </div>

            <p className="mt-4 text-center text-sm text-gray-500">
              Secure payment powered by Stripe. Credits never expire.
            </p>
          </CardContent>
        </Card>

        {/* Usage breakdown */}
        {usage && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-base">Usage Breakdown</CardTitle>
              <CardDescription>
                Your resource consumption this billing period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Compute (GPU Hours)</p>
                    <p className="text-sm text-gray-500">
                      {usage.gpuHours.toFixed(2)} hours @ avg ${usage.avgCostPerHour.toFixed(2)}/hr
                    </p>
                  </div>
                  <p className="text-lg font-semibold">
                    {formatCurrency(usage.computeCost)}
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Inference Requests</p>
                    <p className="text-sm text-gray-500">
                      {usage.requests.toLocaleString()} requests
                    </p>
                  </div>
                  <p className="text-lg font-semibold">
                    {formatCurrency(usage.requestsCost)}
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Token Usage</p>
                    <p className="text-sm text-gray-500">
                      {usage.inputTokens.toLocaleString()} input / {usage.outputTokens.toLocaleString()} output
                    </p>
                  </div>
                  <p className="text-lg font-semibold">
                    {formatCurrency(usage.tokensCost)}
                  </p>
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-semibold">Total This Month</p>
                    <p className="text-xl font-bold text-primary-600">
                      {formatCurrency(usage.currentMonth)}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Transaction history */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Transaction History</CardTitle>
              <CardDescription>
                Your recent credit transactions
              </CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <CreditCard className="h-12 w-12 text-gray-300" />
                <p className="mt-4 text-gray-500">No transactions yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-lg",
                          tx.type === "purchase" || tx.type === "bonus"
                            ? "bg-green-100"
                            : "bg-red-100"
                        )}
                      >
                        {tx.type === "purchase" || tx.type === "bonus" ? (
                          <ArrowDownRight className="h-5 w-5 text-green-600" />
                        ) : (
                          <ArrowUpRight className="h-5 w-5 text-red-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium capitalize">{tx.type}</p>
                        <p className="text-sm text-gray-500">{tx.description}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p
                        className={cn(
                          "text-lg font-semibold",
                          tx.type === "purchase" || tx.type === "bonus"
                            ? "text-green-600"
                            : "text-red-600"
                        )}
                      >
                        {tx.type === "purchase" || tx.type === "bonus" ? "+" : "-"}
                        {formatCurrency(Math.abs(tx.amount))}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(tx.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
