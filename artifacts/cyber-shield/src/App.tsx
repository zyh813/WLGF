import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { Shell } from '@/components/layout/Shell';

// Pages
import Dashboard from '@/pages/Dashboard';
import Alerts from '@/pages/Alerts';
import Firewall from '@/pages/Firewall';
import Connections from '@/pages/Connections';
import Scans from '@/pages/Scans';
import Assets from '@/pages/Assets';
import Attacks from '@/pages/Attacks';
import Logs from '@/pages/Logs';
import ThreatIntel from '@/pages/ThreatIntel';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Shell>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/alerts" component={Alerts} />
        <Route path="/firewall" component={Firewall} />
        <Route path="/connections" component={Connections} />
        <Route path="/threat-intel" component={ThreatIntel} />
        <Route path="/assets" component={Assets} />
        <Route path="/scans" component={Scans} />
        <Route path="/attacks" component={Attacks} />
        <Route path="/logs" component={Logs} />
        <Route component={NotFound} />
      </Switch>
    </Shell>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster theme="dark" />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
