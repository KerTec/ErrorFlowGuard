import { List } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { ErrorReport } from "@shared/schema";

interface ErrorDisplayProps {
  errors: ErrorReport[] | undefined;
}

export function ErrorDisplay({ errors }: ErrorDisplayProps) {
  // Ensure errors is always an array
  const safeErrors = Array.isArray(errors) ? errors : [];
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
            <List className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Recent Errors</h3>
          </div>
        </div>
        
        <div className="space-y-3">
          {safeErrors.length === 0 ? (
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">No errors captured yet</p>
                  <p className="text-xs text-slate-500 mt-1">Trigger an error to see it appear here</p>
                </div>
                <span className="text-xs text-slate-400">--:--</span>
              </div>
            </div>
          ) : (
            safeErrors.map((error) => (
              <div key={error.id} className="p-3 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-900">{error.type}</p>
                    <p className="text-xs text-red-600 mt-1">{error.message}</p>
                    <p className="text-xs text-red-500 mt-1">Source: {error.source}</p>
                  </div>
                  <span className="text-xs text-red-400">
                    {new Date(error.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
