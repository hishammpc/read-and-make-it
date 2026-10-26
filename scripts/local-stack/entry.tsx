// Loaded through Vite by harness.mjs, so '@/…' imports resolve and the app's real modules run.
import { createElement, type ComponentType } from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider, type Query } from '@tanstack/react-query';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { useCreateUser, useSetUserStatus } from '@/hooks/useUsers';
import { useBulkImportUsers } from '@/hooks/useBulkImport';
import AdminDashboard from '@/components/dashboard/AdminDashboard';
import EmployeeDashboard from '@/components/dashboard/EmployeeDashboard';
import AnnualEvaluationCycle from '@/pages/admin/AnnualEvaluationCycle';
import Evaluations from '@/pages/admin/Evaluations';
import ProgramAssign from '@/pages/admin/ProgramAssign';
import ProgramDetails from '@/pages/admin/ProgramDetails';
import ProgramsList from '@/pages/admin/ProgramsList';
import ProposedTrainings from '@/pages/admin/ProposedTrainings';
import Reports from '@/pages/admin/Reports';
import UserEdit from '@/pages/admin/UserEdit';
import UsersList from '@/pages/admin/UsersList';
import EvaluationForm from '@/pages/employee/EvaluationForm';
import MyHours from '@/pages/employee/MyHours';
import MyTeam from '@/pages/employee/MyTeam';
import MyTrainings from '@/pages/employee/MyTrainings';
import SuperviseeEvaluations from '@/pages/employee/SuperviseeEvaluations';

export const pages = {
  AdminDashboard,
  AnnualEvaluationCycle,
  Evaluations,
  ProgramAssign,
  ProgramDetails,
  ProgramsList,
  ProposedTrainings,
  Reports,
  UserEdit,
  UsersList,
  EmployeeDashboard,
  EvaluationForm,
  MyHours,
  MyTeam,
  MyTrainings,
  SuperviseeEvaluations,
};

const MAX_PASSES = 8;

const newClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } } });

// The observer's options (incl. `enabled`) are stored on the query at runtime, though not in its type
const isEnabled = (query: Query) => {
  const { enabled } = query.options as { enabled?: boolean | ((query: Query) => boolean) };
  return typeof enabled === 'function' ? enabled(query) !== false : enabled !== false;
};

/**
 * Renders a page on the server, runs every query it created against the local stack,
 * and renders again until nothing is left to load. Query failures come back in `errors`.
 */
export async function renderSettled(Page: ComponentType, pattern: string, url: string) {
  const client = newClient();
  const errors: string[] = [];
  const tree = () =>
    createElement(ThemeProvider, null,
      createElement(QueryClientProvider, { client },
        createElement(LanguageProvider, null,
          createElement(MemoryRouter, { initialEntries: [url] },
            createElement(AuthProvider, null,
              createElement(Routes, null, createElement(Route, { path: pattern, element: createElement(Page) })))))));

  for (let pass = 0; pass < MAX_PASSES; pass++) {
    const html = renderToString(tree());
    const pending = client
      .getQueryCache()
      .getAll()
      .filter((q) => q.state.status === 'pending' && q.state.fetchStatus === 'idle' && isEnabled(q));
    if (pending.length === 0) return { html, errors };
    await Promise.all(
      pending.map((q) => q.fetch().catch((e: Error) => errors.push(`${JSON.stringify(q.queryKey)}: ${e?.message ?? e}`)))
    );
  }
  errors.push(`${url}: still loading after ${MAX_PASSES} passes`);
  return { html: '', errors };
}

/** Runs a hook once (server render) and hands back what it returned, e.g. a mutation. */
function capture<T>(useHook: () => T): T {
  let value: T | undefined;
  const Probe = () => {
    value = useHook();
    return null;
  };
  renderToString(
    createElement(QueryClientProvider, { client: newClient() },
      createElement(LanguageProvider, null, createElement(MemoryRouter, null, createElement(Probe))))
  );
  return value as T;
}

export const setUserStatus = () => capture(useSetUserStatus);
export const createUser = () => capture(useCreateUser);
export const bulkImport = () => capture(useBulkImportUsers);
