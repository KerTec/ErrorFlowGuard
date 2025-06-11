import { useState } from "react";
import { Copy, CheckCircle, Code2, Server, Database, Zap, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export default function ApiDocs() {
  const { toast } = useToast();
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const copyToClipboard = async (text: string, description: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(text);
      setTimeout(() => setCopiedText(null), 2000);
      toast({
        title: "Copié",
        description: `${description} copié dans le presse-papiers.`,
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de copier le texte.",
        variant: "destructive",
      });
    }
  };

  const endpoints = [
    {
      method: "POST",
      path: "/api/report",
      title: "Signaler une erreur",
      description: "Envoie un rapport d'erreur au système FlowGuard",
      auth: true,
      request: `{
  "type": "JavaScript Error",
  "message": "Cannot read property 'length' of undefined",
  "source": "javascript",
  "url": "https://example.com/page",
  "userAgent": "Mozilla/5.0...",
  "stackTrace": "Error: Cannot read property...",
  "metadata": {
    "filename": "app.js",
    "lineno": 42,
    "colno": 15,
    "timestamp": "2025-06-11T12:00:00.000Z"
  }
}`,
      response: `{
  "success": true,
  "errorId": 123,
  "actionPlan": {
    "retry": false,
    "message": "JavaScript error detected. Manual intervention required.",
    "suggestions": [
      "Check browser console",
      "Verify script dependencies",
      "Update error handling"
    ]
  }
}`
    },
    {
      method: "GET",
      path: "/api/errors/stats",
      title: "Statistiques d'erreurs",
      description: "Récupère les statistiques d'erreurs pour l'application",
      auth: true,
      request: null,
      response: `{
  "jsErrors": 15,
  "networkErrors": 8,
  "promiseRejections": 3,
  "formAbandonment": 2,
  "total": 28
}`
    },
    {
      method: "GET",
      path: "/api/errors?limit=10",
      title: "Erreurs récentes",
      description: "Récupère la liste des erreurs récentes",
      auth: true,
      request: null,
      response: `[
  {
    "id": 123,
    "type": "Network Error",
    "message": "HTTP 500: Internal Server Error",
    "source": "fetch",
    "url": "https://example.com",
    "timestamp": "2025-06-11T12:00:00.000Z",
    "resolved": false
  }
]`
    },
    {
      method: "GET",
      path: "/api/billing",
      title: "Informations de facturation",
      description: "Récupère les informations de plan et d'utilisation",
      auth: true,
      request: null,
      response: `{
  "plan": "free",
  "totalErrors": 156,
  "monthlyErrors": 42,
  "lastResetDate": "2025-06-01T00:00:00.000Z",
  "limits": {
    "free": 10000,
    "pro": 100000,
    "enterprise": -1
  }
}`
    },
    {
      method: "DELETE",
      path: "/api/errors",
      title: "Supprimer les erreurs",
      description: "Supprime toutes les erreurs de l'application",
      auth: true,
      request: null,
      response: `{
  "success": true,
  "message": "All errors cleared"
}`
    }
  ];

  const sdkMethods = [
    {
      method: "init(config)",
      description: "Initialise le SDK FlowGuard",
      example: `FlowGuard.init({
  apiKey: 'your-api-key',
  debug: false,
  autoRetry: true,
  formTracking: true
});`
    },
    {
      method: "trackError(message, source, metadata)",
      description: "Envoie manuellement un rapport d'erreur",
      example: `FlowGuard.trackError(
  'User action failed',
  'manual',
  { userId: 123, action: 'save' }
);`
    },
    {
      method: "trackEvent(eventName, data)",
      description: "Envoie un événement personnalisé",
      example: `FlowGuard.trackEvent('button_click', {
  button: 'subscribe',
  page: 'pricing'
});`
    },
    {
      method: "setUser(userData)",
      description: "Définit les informations utilisateur",
      example: `FlowGuard.setUser({
  id: 'user123',
  email: 'user@example.com',
  plan: 'pro'
});`
    },
    {
      method: "setContext(key, value)",
      description: "Ajoute du contexte personnalisé",
      example: `FlowGuard.setContext('version', '1.2.3');
FlowGuard.setContext('feature_flags', {
  newUI: true,
  darkMode: false
});`
    },
    {
      method: "getStatus()",
      description: "Récupère le statut du SDK",
      example: `const status = FlowGuard.getStatus();
console.log('SDK initialized:', status.initialized);
console.log('Error count:', status.errorCount);`
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Code2 className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-slate-900">Documentation API</h1>
                <p className="text-sm text-slate-500">FlowGuard REST API & SDK Reference</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => window.location.href = '/'}>
              Retour au Dashboard
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Introduction */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="w-5 h-5" />
              <span>Introduction</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate-600">
              L'API FlowGuard vous permet de collecter, analyser et gérer les erreurs de vos applications web. 
              Cette documentation couvre à la fois l'API REST et le SDK JavaScript.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <Server className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <h3 className="font-semibold text-blue-900">API REST</h3>
                <p className="text-sm text-blue-700">Endpoints pour gérer vos données</p>
              </div>
              
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <Code2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <h3 className="font-semibold text-green-900">SDK JavaScript</h3>
                <p className="text-sm text-green-700">Client-side error tracking</p>
              </div>
              
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <Database className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <h3 className="font-semibold text-purple-900">Intégrations</h3>
                <p className="text-sm text-purple-700">React, Vue, Angular</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Authentication */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Authentification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate-600">
              Toutes les requêtes API nécessitent une clé API fournie dans l'en-tête de la requête.
            </p>
            
            <div className="bg-slate-900 rounded-lg p-4 relative">
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 text-slate-400 hover:text-white"
                onClick={() => copyToClipboard('X-API-Key: your-api-key-here', "En-tête d'authentification")}
              >
                {copiedText === 'X-API-Key: your-api-key-here' ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
              <pre className="text-sm text-slate-200">
                <code>X-API-Key: your-api-key-here</code>
              </pre>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Sécurité:</strong> Ne jamais exposer votre clé API côté client. 
                Utilisez uniquement le SDK JavaScript pour l'intégration frontend.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* API Documentation */}
        <Tabs defaultValue="endpoints" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="endpoints">API Endpoints</TabsTrigger>
            <TabsTrigger value="sdk">SDK JavaScript</TabsTrigger>
          </TabsList>

          <TabsContent value="endpoints" className="space-y-6">
            {endpoints.map((endpoint, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-3">
                      <Badge variant={endpoint.method === 'GET' ? 'secondary' : endpoint.method === 'POST' ? 'default' : 'destructive'}>
                        {endpoint.method}
                      </Badge>
                      <code className="text-lg">{endpoint.path}</code>
                    </CardTitle>
                    {endpoint.auth && (
                      <Badge variant="outline">
                        <Shield className="w-3 h-3 mr-1" />
                        Auth requis
                      </Badge>
                    )}
                  </div>
                  <p className="text-slate-600">{endpoint.description}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {endpoint.request && (
                    <div>
                      <h4 className="font-semibold mb-2">Request Body</h4>
                      <div className="bg-slate-900 rounded-lg p-4 relative">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute top-2 right-2 text-slate-400 hover:text-white"
                          onClick={() => copyToClipboard(endpoint.request!, "Request body")}
                        >
                          {copiedText === endpoint.request ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                        <pre className="text-sm text-slate-200 overflow-x-auto">
                          <code>{endpoint.request}</code>
                        </pre>
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <h4 className="font-semibold mb-2">Response</h4>
                    <div className="bg-slate-900 rounded-lg p-4 relative">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2 text-slate-400 hover:text-white"
                        onClick={() => copyToClipboard(endpoint.response, "Response body")}
                      >
                        {copiedText === endpoint.response ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                      <pre className="text-sm text-slate-200 overflow-x-auto">
                        <code>{endpoint.response}</code>
                      </pre>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="sdk" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Méthodes du SDK</CardTitle>
                <p className="text-slate-600">
                  Interface JavaScript pour intégrer FlowGuard dans vos applications.
                </p>
              </CardHeader>
            </Card>

            {sdkMethods.map((method, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Zap className="w-5 h-5" />
                    <code className="text-lg">{method.method}</code>
                  </CardTitle>
                  <p className="text-slate-600">{method.description}</p>
                </CardHeader>
                <CardContent>
                  <div className="bg-slate-900 rounded-lg p-4 relative">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2 text-slate-400 hover:text-white"
                      onClick={() => copyToClipboard(method.example, "Exemple de code")}
                    >
                      {copiedText === method.example ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                    <pre className="text-sm text-slate-200 overflow-x-auto">
                      <code>{method.example}</code>
                    </pre>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>

        {/* Rate Limits & Billing */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Limites et Facturation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border border-slate-200 rounded-lg">
                <h4 className="font-semibold text-slate-900 mb-2">Plan Gratuit</h4>
                <p className="text-2xl font-bold text-slate-900">10K</p>
                <p className="text-sm text-slate-600">erreurs/mois</p>
              </div>
              
              <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
                <h4 className="font-semibold text-blue-900 mb-2">Plan Pro</h4>
                <p className="text-2xl font-bold text-blue-900">100K</p>
                <p className="text-sm text-blue-700">erreurs/mois</p>
              </div>
              
              <div className="p-4 border border-purple-200 rounded-lg bg-purple-50">
                <h4 className="font-semibold text-purple-900 mb-2">Enterprise</h4>
                <p className="text-2xl font-bold text-purple-900">∞</p>
                <p className="text-sm text-purple-700">illimité</p>
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Facturation:</strong> Chaque erreur capturée et traitée compte dans votre quota mensuel. 
                Les quotas se réinitialisent automatiquement le 1er de chaque mois.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}