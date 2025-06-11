import { useState, useEffect } from "react";
import { Copy, CheckCircle, Download, ExternalLink, Code2, Globe, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface App {
  id: number;
  name: string;
  apiKey: string;
  domain: string;
  plan: string;
}

export default function Install() {
  const { toast } = useToast();
  const [selectedApp, setSelectedApp] = useState<App | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Mock user ID
  const userId = 1;

  // Fetch user apps
  const { data: apps } = useQuery({
    queryKey: ['/api/apps', userId],
    queryFn: () => apiRequest("GET", `/api/apps/${userId}`).then(res => res.json()),
  });

  useEffect(() => {
    if (apps && apps.length > 0 && !selectedApp) {
      setSelectedApp(apps[0]);
    }
  }, [apps, selectedApp]);

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

  const getInstallationScript = () => {
    if (!selectedApp) return '';
    
    return `<!-- FlowGuard SDK Installation -->
<script src="https://cdn.flowguard.com/v1/error-capture.js"></script>
<script src="https://cdn.flowguard.com/v1/reporter.js"></script>
<script src="https://cdn.flowguard.com/v1/strategies.js"></script>
<script src="https://cdn.flowguard.com/v1/flowguard.js"></script>

<script>
  FlowGuard.init({
    apiKey: '${selectedApp.apiKey}',
    debug: false,
    autoRetry: true,
    formTracking: true,
    consoleLogging: false,
    onError: function(errorData, result) {
      // Custom error handling (optional)
      console.log('Error captured:', errorData);
    }
  });
</script>`;
  };

  const getManualInstallScript = () => {
    if (!selectedApp) return '';
    
    return `// Manual FlowGuard initialization
import FlowGuard from './flowguard-sdk/flowguard.js';

FlowGuard.init({
  apiKey: '${selectedApp.apiKey}',
  apiEndpoint: '/api/report',
  debug: process.env.NODE_ENV === 'development',
  autoRetry: true,
  formTracking: true,
  maxRetries: 3,
  retryDelay: 1000,
  consoleLogging: process.env.NODE_ENV === 'development',
  context: {
    app: '${selectedApp.name}',
    domain: '${selectedApp.domain}',
    version: '1.0.0'
  },
  onError: (errorData, result) => {
    // Custom error handling
    if (result.success && result.actionPlan) {
      console.log('FlowGuard action plan:', result.actionPlan);
    }
  }
});`;
  };

  const getReactIntegration = () => {
    if (!selectedApp) return '';
    
    return `import { useEffect } from 'react';

function App() {
  useEffect(() => {
    // Initialize FlowGuard SDK
    if (typeof window !== 'undefined' && window.FlowGuard) {
      window.FlowGuard.init({
        apiKey: '${selectedApp.apiKey}',
        debug: process.env.NODE_ENV === 'development',
        autoRetry: true,
        formTracking: true,
        consoleLogging: process.env.NODE_ENV === 'development',
        context: {
          framework: 'React',
          version: '18.0.0'
        }
      });

      // Set user context when user logs in
      window.FlowGuard.setUser({
        id: 'user123',
        email: 'user@example.com',
        plan: 'pro'
      });
    }
  }, []);

  return <div>Your App</div>;
}`;
  };

  const getVueIntegration = () => {
    if (!selectedApp) return '';
    
    return `// Vue.js integration
import { onMounted } from 'vue';

export default {
  setup() {
    onMounted(() => {
      if (typeof window !== 'undefined' && window.FlowGuard) {
        window.FlowGuard.init({
          apiKey: '${selectedApp.apiKey}',
          debug: process.env.NODE_ENV === 'development',
          autoRetry: true,
          formTracking: true,
          context: {
            framework: 'Vue',
            version: '3.0.0'
          }
        });
      }
    });

    return {};
  }
};`;
  };

  const getTestingScript = () => {
    return `// Test FlowGuard integration
function testFlowGuard() {
  // Test manual error tracking
  FlowGuard.trackError('Test error message', 'test', {
    testData: true,
    timestamp: new Date().toISOString()
  });

  // Test custom event tracking
  FlowGuard.trackEvent('test_event', {
    action: 'button_click',
    component: 'test_button'
  });

  // Test context setting
  FlowGuard.setContext('testMode', true);
  FlowGuard.setUser({
    id: 'test_user',
    email: 'test@example.com'
  });

  // Get SDK status
  const status = FlowGuard.getStatus();
  console.log('FlowGuard Status:', status);
}

// Call the test function
testFlowGuard();`;
  };

  if (!selectedApp) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Code2 className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucune application</h3>
            <p className="text-slate-600 mb-4">
              Créez une application pour accéder aux instructions d'installation.
            </p>
            <Button onClick={() => window.location.href = '/'}>
              Retour au Dashboard
            </Button>
          </CardContent>
        </Card>
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
                <Code2 className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-slate-900">Installation FlowGuard</h1>
                <p className="text-sm text-slate-500">Guide d'intégration du SDK</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => window.location.href = '/'}>
              Retour au Dashboard
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* App Selection */}
        {apps && apps.length > 1 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Sélectionner une application</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {apps.map((app: App) => (
                  <Card
                    key={app.id}
                    className={`cursor-pointer transition-all ${
                      selectedApp?.id === app.id
                        ? 'ring-2 ring-primary bg-primary/5'
                        : 'hover:shadow-md'
                    }`}
                    onClick={() => setSelectedApp(app)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">{app.name}</h3>
                        <Badge variant="outline">{app.plan}</Badge>
                      </div>
                      <p className="text-sm text-slate-500">{app.domain}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Installation Guide */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Navigation */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle className="text-lg">Guide</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <a href="#quick-install" className="block text-sm text-primary hover:underline">
                  Installation Rapide
                </a>
                <a href="#manual-install" className="block text-sm text-primary hover:underline">
                  Installation Manuelle
                </a>
                <a href="#frameworks" className="block text-sm text-primary hover:underline">
                  Frameworks
                </a>
                <a href="#testing" className="block text-sm text-primary hover:underline">
                  Tests
                </a>
                <a href="#configuration" className="block text-sm text-primary hover:underline">
                  Configuration Avancée
                </a>
              </CardContent>
            </Card>
          </div>

          {/* Content */}
          <div className="lg:col-span-3 space-y-8">
            {/* Quick Install */}
            <Card id="quick-install">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Zap className="w-5 h-5" />
                  <span>Installation Rapide (CDN)</span>
                </CardTitle>
                <p className="text-slate-600">
                  La méthode la plus simple pour intégrer FlowGuard dans votre site web.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-slate-900 rounded-lg p-4 relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2 text-slate-400 hover:text-white"
                    onClick={() => copyToClipboard(getInstallationScript(), "Script d'installation")}
                  >
                    {copiedText === getInstallationScript() ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                  <pre className="text-sm text-slate-200 overflow-x-auto">
                    <code>{getInstallationScript()}</code>
                  </pre>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> Ajoutez ce code juste avant la fermeture de la balise &lt;/body&gt; 
                    de votre page HTML pour un chargement optimal.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Manual Install */}
            <Card id="manual-install">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Download className="w-5 h-5" />
                  <span>Installation Manuelle</span>
                </CardTitle>
                <p className="text-slate-600">
                  Pour un contrôle total sur l'intégration et les performances.
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-2">1. Télécharger les fichiers</h4>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      flowguard-sdk.zip
                    </Button>
                    <Button variant="outline" size="sm">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      GitHub
                    </Button>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">2. Intégration JavaScript</h4>
                  <div className="bg-slate-900 rounded-lg p-4 relative">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2 text-slate-400 hover:text-white"
                      onClick={() => copyToClipboard(getManualInstallScript(), "Script d'intégration")}
                    >
                      {copiedText === getManualInstallScript() ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                    <pre className="text-sm text-slate-200 overflow-x-auto">
                      <code>{getManualInstallScript()}</code>
                    </pre>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Framework Integration */}
            <Card id="frameworks">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Globe className="w-5 h-5" />
                  <span>Intégration Frameworks</span>
                </CardTitle>
                <p className="text-slate-600">
                  Instructions spécifiques pour les frameworks populaires.
                </p>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="react" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="react">React</TabsTrigger>
                    <TabsTrigger value="vue">Vue.js</TabsTrigger>
                    <TabsTrigger value="angular">Angular</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="react" className="space-y-4">
                    <div className="bg-slate-900 rounded-lg p-4 relative">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2 text-slate-400 hover:text-white"
                        onClick={() => copyToClipboard(getReactIntegration(), "Code React")}
                      >
                        {copiedText === getReactIntegration() ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                      <pre className="text-sm text-slate-200 overflow-x-auto">
                        <code>{getReactIntegration()}</code>
                      </pre>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="vue" className="space-y-4">
                    <div className="bg-slate-900 rounded-lg p-4 relative">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2 text-slate-400 hover:text-white"
                        onClick={() => copyToClipboard(getVueIntegration(), "Code Vue.js")}
                      >
                        {copiedText === getVueIntegration() ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                      <pre className="text-sm text-slate-200 overflow-x-auto">
                        <code>{getVueIntegration()}</code>
                      </pre>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="angular" className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-blue-800">
                        Documentation Angular à venir. Contactez le support pour une assistance immédiate.
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Testing */}
            <Card id="testing">
              <CardHeader>
                <CardTitle>Test de l'Installation</CardTitle>
                <p className="text-slate-600">
                  Vérifiez que FlowGuard fonctionne correctement.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-slate-900 rounded-lg p-4 relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2 text-slate-400 hover:text-white"
                    onClick={() => copyToClipboard(getTestingScript(), "Script de test")}
                  >
                    {copiedText === getTestingScript() ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                  <pre className="text-sm text-slate-200 overflow-x-auto">
                    <code>{getTestingScript()}</code>
                  </pre>
                </div>
                
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-800">
                    <strong>Conseil:</strong> Ouvrez la console de votre navigateur après avoir exécuté 
                    ces tests pour voir les logs FlowGuard et vérifier que les erreurs sont bien capturées.
                  </p>
                </div>

                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    onClick={() => window.open('/demo?apiKey=' + selectedApp.apiKey, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Demo Interactive
                  </Button>
                  <Button variant="outline" onClick={() => window.location.href = '/'}>
                    Voir le Dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Advanced Configuration */}
            <Card id="configuration">
              <CardHeader>
                <CardTitle>Configuration Avancée</CardTitle>
                <p className="text-slate-600">
                  Options de configuration pour personnaliser le comportement de FlowGuard.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Options Principales</h4>
                    <ul className="text-sm text-slate-600 space-y-1">
                      <li><code>apiKey</code> - Clé API (requis)</li>
                      <li><code>debug</code> - Mode débogage</li>
                      <li><code>autoRetry</code> - Retry automatique</li>
                      <li><code>formTracking</code> - Suivi formulaires</li>
                      <li><code>consoleLogging</code> - Logs console</li>
                    </ul>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Options Avancées</h4>
                    <ul className="text-sm text-slate-600 space-y-1">
                      <li><code>maxRetries</code> - Nb max de retry</li>
                      <li><code>retryDelay</code> - Délai entre retry</li>
                      <li><code>context</code> - Contexte personnalisé</li>
                      <li><code>onError</code> - Callback d'erreur</li>
                      <li><code>customHandlers</code> - Handlers custom</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}