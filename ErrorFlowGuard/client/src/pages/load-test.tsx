
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function LoadTest() {
  const [isRunning, setIsRunning] = useState(false);
  const [errorCount, setErrorCount] = useState(10);
  const [results, setResults] = useState<any>(null);
  const { toast } = useToast();

  const runLoadTest = async () => {
    setIsRunning(true);
    try {
      const response = await apiRequest("POST", "/api/test/load", {
        count: errorCount
      });
      const result = await response.json();
      
      setResults(result);
      toast({
        title: "Test de charge terminé",
        description: `${result.errorIds?.length || 0} erreurs créées`,
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Le test de charge a échoué",
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>🔥 Test de Charge FlowGuard</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <Input
              type="number"
              value={errorCount}
              onChange={(e) => setErrorCount(parseInt(e.target.value) || 10)}
              min="1"
              max="50"
              className="w-32"
            />
            <Button 
              onClick={runLoadTest} 
              disabled={isRunning}
              className="bg-red-600 hover:bg-red-700"
            >
              {isRunning ? "En cours..." : "Lancer Test"}
            </Button>
          </div>
          
          {results && (
            <div className="mt-4 p-4 bg-green-50 rounded-lg">
              <h3 className="font-semibold text-green-800">Résultats :</h3>
              <p className="text-green-700">
                ✅ {results.errorIds?.length || 0} erreurs créées avec succès
              </p>
              <p className="text-sm text-green-600 mt-2">
                IDs: {results.errorIds?.slice(0, 5).join(", ")}
                {results.errorIds?.length > 5 && "..."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
