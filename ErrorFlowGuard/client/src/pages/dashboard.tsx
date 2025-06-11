import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Shield, TrendingUp, AlertCircle, Clock, Users, Key, Copy, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface App {
  id: number;
  name: string;
  apiKey: string;
  domain: string;
  plan: string;
  errorCount: number;
  monthlyErrorCount: number;
  lastResetDate: string;
  createdAt: string;
}

interface ErrorReport {
  id: number;
  type: string;
  message: string;
  source: string;
  url: string;
  timestamp: string;
}

interface BillingInfo {
  plan: string;
  totalErrors: number;
  monthlyErrors: number;
  lastResetDate: string;
  limits: {
    free: number;
    pro: number;
    enterprise: number;
  };
}

const COLORS = ['#ef4444', '#f97316', '#8b5cf6', '#3b82f6', '#10b981'];

export default function Dashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedApp, setSelectedApp] = useState<App | null>(null);
  const [showCreateApp, setShowCreateApp] = useState(false);
  const [newAppData, setNewAppData] = useState({ name: '', domain: '' });
  const [copiedApiKey, setCopiedApiKey] = useState<string | null>(null);

  // Mock user ID - dans un vrai app, cela viendrait de l'auth
  const userId = 1;

  // Use demo app with fixed API key
  const { data: appsData, isLoading, isError } = useQuery({
    queryKey: ['/api/apps', userId],
    queryFn: () =>
      fetch(`/api/apps?userId=${userId}`).then(res => res.json())
  });

  const apps = (appsData?.apps || []).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Fetch error stats for selected app
  const { data: errorStats } = useQuery({
    queryKey: ['/api/errors/stats', selectedApp?.apiKey],
    queryFn: () => {
      if (!selectedApp) return null;
      return fetch('/api/errors/stats', {
        headers: { 'X-API-Key': selectedApp.apiKey }
      }).then(res => res.json());
    },
    enabled: !!selectedApp,
    refetchInterval: 5000,
  });

  // Fetch recent errors for selected app
  const { data: recentErrors } = useQuery({
    queryKey: ['/api/errors', selectedApp?.apiKey],
    queryFn: () => {
      if (!selectedApp) return null;
      return fetch('/api/errors?limit=10', {
        headers: { 'X-API-Key': selectedApp.apiKey }
      }).then(res => res.json());
    },
    enabled: !!selectedApp,
    refetchInterval: 5000,
  });

  // Fetch billing info for selected app
  const { data: billingInfo } = useQuery({
    queryKey: ['/api/billing', selectedApp?.apiKey],
    queryFn: () => {
      if (!selectedApp) return null;
      return fetch('/api/billing', {
        headers: { 'X-API-Key': selectedApp.apiKey }
      }).then(res => res.json());
    },
    enabled: !!selectedApp,
  });

  // Create app mutation
  const createAppMutation = useMutation({
    mutationFn: (appData: { name: string; domain: string; userId: number }) =>
      apiRequest("POST", "/api/apps", appData).then(res => res.json()),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/apps', userId] });
      setShowCreateApp(false);
      setNewAppData({ name: '', domain: '' });
      setSelectedApp(data.app);
      toast({
        title: "Application créée",
        description: "Votre nouvelle application a été créée avec succès.",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de créer l'application.",
        variant: "destructive",
      });
    },
  });

  // Auto-select first app
  useEffect(() => {
    if (apps && apps.length > 0 && !selectedApp) {
      setSelectedApp(apps[0]);
    }
  }, [apps, selectedApp]);

  const handleCreateApp = () => {
    if (!newAppData.name.trim()) {
      toast({
        title: "Erreur",
        description: "Le nom de l'application est requis.",
        variant: "destructive",
      });
      return;
    }

    createAppMutation.mutate({
      ...newAppData,
      userId: userId,
    });
  };

  const copyApiKey = async (apiKey: string) => {
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopiedApiKey(apiKey);
      setTimeout(() => setCopiedApiKey(null), 2000);
      toast({
        title: "Copié",
        description: "Clé API copiée dans le presse-papiers.",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de copier la clé API.",
        variant: "destructive",
      });
    }
  };

  const getErrorChartData = () => {
    if (!errorStats) return [];

    return [
      { name: 'JavaScript', value: errorStats.jsErrors, color: COLORS[0] },
      { name: 'Réseau', value: errorStats.networkErrors, color: COLORS[1] },
      { name: 'Promesses', value: errorStats.promiseRejections, color: COLORS[2] },
      { name: 'Formulaires', value: errorStats.formAbandonment, color: COLORS[3] },
    ].filter(item => item.value > 0);
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'free': return 'bg-gray-100 text-gray-800';
      case 'pro': return 'bg-blue-100 text-blue-800';
      case 'enterprise': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getUsagePercentage = () => {
    if (!billingInfo || !billingInfo.limits) return 0;
    const limit = billingInfo.limits[billingInfo.plan as keyof typeof billingInfo.limits];
    if (limit === -1) return 0; // Unlimited
    return Math.min((billingInfo.monthlyErrors / limit) * 100, 100);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-slate-900">FlowGuard</h1>
                <p className="text-sm text-slate-500">Monitoring & Error Tracking</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="outline" onClick={() => window.location.href = '/api-docs'}>
                Documentation API
              </Button>
              <Button variant="outline" onClick={() => window.location.href = '/install'}>
                Guide d'Installation
              </Button>
              <Button variant="outline" onClick={() => window.location.href = '/demo'}>
                Demo
              </Button>
              <Button onClick={() => setShowCreateApp(true)}>
                Nouvelle Application
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* App Selection */}
        {apps && apps.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center space-x-4 overflow-x-auto pb-2">
              {apps.map((app: App) => (
                <Card
                  key={app.id}
                  className={`min-w-[280px] cursor-pointer transition-all ${
                    selectedApp?.id === app.id
                      ? 'ring-2 ring-primary bg-primary/5'
                      : 'hover:shadow-md'
                  }`}
                  onClick={() => setSelectedApp(app)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-slate-900">{app.name}</h3>
                      <Badge className={getPlanColor(app.plan)}>
                        {app.plan}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-500 mb-2">{app.domain || 'Aucun domaine'}</p>
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>{app.errorCount} erreurs total</span>
                      <span>{app.monthlyErrorCount} ce mois</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Create App Modal */}
        {showCreateApp && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardHeader>
                <CardTitle>Créer une nouvelle application</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="appName">Nom de l'application</Label>
                  <Input
                    id="appName"
                    value={newAppData.name}
                    onChange={(e) => setNewAppData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Mon site web"
                  />
                </div>
                <div>
                  <Label htmlFor="appDomain">Domaine (optionnel)</Label>
                  <Input
                    id="appDomain"
                    value={newAppData.domain}
                    onChange={(e) => setNewAppData(prev => ({ ...prev, domain: e.target.value }))}
                    placeholder="VotreDomain.com"
                  />
                </div>
                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateApp(false)}
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={handleCreateApp}
                    disabled={createAppMutation.isPending}
                  >
                    {createAppMutation.isPending ? 'Création...' : 'Créer'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {selectedApp ? (
          <>
            {/* API Key Section */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Key className="w-5 h-5" />
                  <span>Clé API</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <Input
                    value={selectedApp.apiKey}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyApiKey(selectedApp.apiKey)}
                  >
                    {copiedApiKey === selectedApp.apiKey ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <p className="text-sm text-slate-500 mt-2">
                  Utilisez cette clé dans votre SDK FlowGuard pour commencer à tracker les erreurs.
                </p>
              </CardContent>
            </Card>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600">Erreurs Total</p>
                      <p className="text-2xl font-bold text-slate-900">
                        {errorStats?.total || 0}
                      </p>
                    </div>
                    <AlertCircle className="w-8 h-8 text-red-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600">Ce Mois</p>
                      <p className="text-2xl font-bold text-slate-900">
                        {billingInfo?.monthlyErrors || selectedApp?.monthlyErrorCount || 0}
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600">Plan</p>
                      <p className="text-2xl font-bold text-slate-900 capitalize">
                        {billingInfo?.plan || selectedApp?.plan || 'free'}
                      </p>
                    </div>
                    <Users className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600">Utilisation</p>
                      <p className="text-2xl font-bold text-slate-900">
                        {getUsagePercentage().toFixed(0)}%
                      </p>
                    </div>
                    <Clock className="w-8 h-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts and Recent Errors */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Error Type Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Répartition des Erreurs</CardTitle>
                </CardHeader>
                <CardContent>
                  {getErrorChartData().length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={getErrorChartData()}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={120}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {getErrorChartData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-slate-500">
                      Aucune erreur à afficher
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Errors */}
              <Card>
                <CardHeader>
                  <CardTitle>Erreurs Récentes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {recentErrors && recentErrors.length > 0 ? (
                      recentErrors.map((error: ErrorReport) => (
                        <div key={error.id} className="border border-slate-200 rounded-lg p-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-sm text-slate-900">{error.type}</p>
                              <p className="text-xs text-slate-600 mt-1 truncate">
                                {error.message}
                              </p>
                              <div className="flex items-center space-x-2 mt-2">
                                <Badge variant="outline" className="text-xs">
                                  {error.source}
                                </Badge>
                                <span className="text-xs text-slate-400">
                                  {new Date(error.timestamp).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-slate-500 py-8">
                        Aucune erreur récente
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <Shield className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              Aucune application
            </h3>
            <p className="text-slate-500 mb-4">
              Créez votre première application pour commencer à tracker les erreurs.
            </p>
            <Button onClick={() => setShowCreateApp(true)}>
              Créer une application
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}