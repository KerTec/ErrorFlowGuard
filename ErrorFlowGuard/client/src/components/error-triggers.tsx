import { useState, useEffect } from "react";
import { Bug, Wifi, Clock, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export function ErrorTriggers() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    message: "",
  });
  const [formModified, setFormModified] = useState(false);

  // JavaScript Error Triggers
  const triggerReferenceError = () => {
    try {
      // @ts-ignore - intentional error
      nonExistentFunction();
    } catch (error) {
      // Error will be caught by global handler
    }
  };

  const triggerTypeError = () => {
    try {
      const obj: any = null;
      obj.property.method();
    } catch (error) {
      // Error will be caught by global handler
    }
  };

  const triggerSyntaxError = () => {
    try {
      eval('const invalid syntax here');
    } catch (error) {
      // Error will be caught by global handler
    }
  };

  const triggerCustomError = () => {
    throw new Error('Custom error triggered from FlowGuard test');
  };

  // Network Error Triggers
  const triggerFetch404 = async () => {
    try {
      const response = await fetch('/nonexistent-endpoint');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    }
  };

  const triggerFetch500 = async () => {
    try {
      const response = await fetch('https://httpstat.us/500');
      if (!response.ok) {
        throw new Error(`Server Error ${response.status}`);
      }
    } catch (error) {
      console.error('Server error:', error);
    }
  };

  const triggerNetworkTimeout = () => {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 1000);
    
    fetch('https://httpstat.us/200?sleep=5000', {
      signal: controller.signal
    }).catch(error => {
      console.error('Network timeout:', error);
    });
  };

  const triggerCORSError = () => {
    fetch('https://example.com/api/data')
      .catch(error => {
        console.error('CORS error:', error);
      });
  };

  // Promise Rejection Triggers
  const triggerUnhandledRejection = () => {
    Promise.reject(new Error('Unhandled promise rejection'));
  };

  const triggerAsyncError = async () => {
    throw new Error('Async function error');
  };

  // Form Handlers
  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setFormModified(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormModified(false);
    toast({
      title: "Success",
      description: "Form submitted successfully!",
    });
    setFormData({ firstName: "", lastName: "", email: "", message: "" });
  };

  const clearForm = () => {
    setFormData({ firstName: "", lastName: "", email: "", message: "" });
    setFormModified(false);
  };

  // Handle form abandonment
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (formModified) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [formModified]);

  return (
    <div className="space-y-6">
      {/* JavaScript Errors Section */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <Bug className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">JavaScript Errors</h2>
              <p className="text-sm text-slate-500">Trigger various JavaScript runtime errors</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button 
              variant="outline"
              className="bg-red-50 hover:bg-red-100 border-red-200 text-red-700"
              onClick={triggerReferenceError}
            >
              Reference Error
            </Button>
            
            <Button 
              variant="outline"
              className="bg-red-50 hover:bg-red-100 border-red-200 text-red-700"
              onClick={triggerTypeError}
            >
              Type Error
            </Button>
            
            <Button 
              variant="outline"
              className="bg-red-50 hover:bg-red-100 border-red-200 text-red-700"
              onClick={triggerSyntaxError}
            >
              Syntax Error
            </Button>
            
            <Button 
              variant="outline"
              className="bg-red-50 hover:bg-red-100 border-red-200 text-red-700"
              onClick={triggerCustomError}
            >
              Custom Error
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Network Errors Section */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Wifi className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Network Errors</h2>
              <p className="text-sm text-slate-500">Test API calls and fetch failures</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button 
              variant="outline"
              className="bg-orange-50 hover:bg-orange-100 border-orange-200 text-orange-700"
              onClick={triggerFetch404}
            >
              404 Not Found
            </Button>
            
            <Button 
              variant="outline"
              className="bg-orange-50 hover:bg-orange-100 border-orange-200 text-orange-700"
              onClick={triggerFetch500}
            >
              500 Server Error
            </Button>
            
            <Button 
              variant="outline"
              className="bg-orange-50 hover:bg-orange-100 border-orange-200 text-orange-700"
              onClick={triggerNetworkTimeout}
            >
              Network Timeout
            </Button>
            
            <Button 
              variant="outline"
              className="bg-orange-50 hover:bg-orange-100 border-orange-200 text-orange-700"
              onClick={triggerCORSError}
            >
              CORS Error
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Promise Rejection Section */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Promise Rejections</h2>
              <p className="text-sm text-slate-500">Unhandled promise rejections and async errors</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button 
              variant="outline"
              className="bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700"
              onClick={triggerUnhandledRejection}
            >
              Unhandled Rejection
            </Button>
            
            <Button 
              variant="outline"
              className="bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700"
              onClick={triggerAsyncError}
            >
              Async Function Error
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Form Abandonment Section */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Form Abandonment</h2>
              <p className="text-sm text-slate-500">Test form abandonment detection</p>
            </div>
          </div>
          
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="Enter your first name"
                  value={formData.firstName}
                  onChange={(e) => handleFormChange('firstName', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Enter your last name"
                  value={formData.lastName}
                  onChange={(e) => handleFormChange('lastName', e.target.value)}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email address"
                value={formData.email}
                onChange={(e) => handleFormChange('email', e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                rows={3}
                placeholder="Enter your message"
                value={formData.message}
                onChange={(e) => handleFormChange('message', e.target.value)}
              />
            </div>
            
            <div className="flex items-center space-x-4">
              <Button type="submit">
                Submit Form
              </Button>
              <Button type="button" variant="outline" onClick={clearForm}>
                Clear Form
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
