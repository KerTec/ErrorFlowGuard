import { useState, useEffect } from "react";
import { Shield, ChartLine, AlertCircle, Settings, List, Bolt, Trash2, Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ErrorTriggers } from "@/components/error-triggers";
import { ErrorDisplay } from "@/components/error-display";
import { useFlowGuard } from "@/hooks/use-flowguard";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function Home() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { initializeSDK, errorCount } = useFlowGuard();

  const [config, setConfig] = useState({
    autoRetry: true,
    formTracking: true,
    consoleLogging: true,
  });

  // Use the hardcoded demo API key
  const demoApiKey = "fg_demo123456789abcdef123456789abcdef";

  // Fetch error statistics
  const { data: stats } = useQuery({
    queryKey: ["/api/errors/stats", demoApiKey],
    queryFn: () => fetch('/api/errors/stats', {
      headers: { 'X-API-Key': demoApiKey }
    }).then(res => res.json()),
    refetchInterval: 2000,
  });

  // Fetch recent errors
  const { data: recentErrors } = useQuery({
    queryKey: ["/api/errors", demoApiKey],
    queryFn: () => fetch('/api/errors', {
      headers: { 'X-API-Key': demoApiKey }
    }).then(res => res.json()),
    refetchInterval: 2000,
  });

  // Clear errors mutation
  const clearErrorsMutation = useMutation({
    mutationFn: () => fetch('/api/errors', {
      method: 'DELETE',
      headers: { 'X-API-Key': demoApiKey }
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/errors", demoApiKey] });
      queryClient.invalidateQueries({ queryKey: ["/api/errors/stats", demoApiKey] });
      toast({
        title: "Success",
        description: "All errors have been cleared.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to clear errors.",
        variant: "destructive",
      });
    },
  });

  const handleConfigChange = (key: string, value: boolean) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleClearErrors = () => {
    clearErrorsMutation.mutate();
  };

  const handleDownloadLogs = () => {
    if (recentErrors && recentErrors.length > 0) {
      const data = JSON.stringify(recentErrors, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `flowguard-logs-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Logs exported successfully.",
      });
    } else {
      toast({
        title: "No Data",
        description: "No error logs to export.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (demoApiKey && demoApiKey !== "loading...") {
      initializeSDK({
        ...config,
        apiKey: demoApiKey
      });
    }
  }, [config, demoApiKey, initializeSDK]);

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
                <h1 className="text-xl font-semibold text-slate-900">FlowGuard SDK</h1>
                <p className="text-sm text-slate-500">Real-time Error Tracking & UX Monitoring</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-slate-600">SDK Active</span>
              </div>
              <div className="text-sm text-slate-500">
                <span>{errorCount}</span> errors captured
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Status Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900">FlowGuard SDK Test Environment</h3>
              <p className="text-sm text-blue-700 mt-1">
                This page demonstrates various error scenarios that the FlowGuard SDK can capture and report. 
                Use the controls below to trigger different types of errors and observe how they're handled.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Error Triggers */}
          <div className="lg:col-span-2">
            <ErrorTriggers />
          </div>

          {/* Error Display */}
          <div className="space-y-6">
            {/* Error Statistics */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                    <ChartLine className="w-5 h-5 text-slate-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Error Statistics</h3>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">JavaScript Errors</span>
                    <span className="font-semibold text-red-600">{stats?.jsErrors || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Network Errors</span>
                    <span className="font-semibold text-orange-600">{stats?.networkErrors || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Promise Rejections</span>
                    <span className="font-semibold text-purple-600">{stats?.promiseRejections || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Form Abandonments</span>
                    <span className="font-semibold text-blue-600">{stats?.formAbandonment || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Errors */}
            <ErrorDisplay errors={recentErrors || []} />

            {/* SDK Configuration */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Settings className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">SDK Configuration</h3>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Auto-retry Failed Requests</span>
                    <Switch
                      checked={config.autoRetry}
                      onCheckedChange={(checked) => handleConfigChange('autoRetry', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Form Tracking</span>
                    <Switch
                      checked={config.formTracking}
                      onCheckedChange={(checked) => handleConfigChange('formTracking', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Console Logging</span>
                    <Switch
                      checked={config.consoleLogging}
                      onCheckedChange={(checked) => handleConfigChange('consoleLogging', checked)}
                    />
                  </div>

                  <div className="pt-4 border-t border-slate-200">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">API Endpoint</span>
                      <code className="text-xs bg-slate-100 px-2 py-1 rounded">/api/report</code>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* SDK Management */}
        <Card className="mt-8">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                  <Bolt className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">SDK Management</h3>
                  <p className="text-sm text-slate-500">Control SDK behavior and clear error logs</p>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <Button 
                  variant="outline"
                  onClick={handleClearErrors}
                  disabled={clearErrorsMutation.isPending}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear Errors
                </Button>

                <Button onClick={handleDownloadLogs}>
                  <Download className="w-4 h-4 mr-2" />
                  Export Logs
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}