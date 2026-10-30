import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import superjson from "superjson";
import type { AppRouter } from "../../api/router";
import type { ReactNode } from "react";
import { offlineLink } from "@/lib/offline/sync";

export const trpc = createTRPCReact<AppRouter>();

const WEEK = 7 * 24 * 60 * 60 * 1000;

export const queryClient = new QueryClient({
  defaultOptions: {
    // Kept a week on the phone: the app opens offline with its last data
    queries: { gcTime: WEEK },
    // Changes always reach the links: offline, offlineLink holds them
    mutations: { networkMode: "always" },
  },
});

// The last data seen, kept on the phone (dates included, through superjson)
const persister = createSyncStoragePersister({
  storage: typeof window === "undefined" ? undefined : window.localStorage,
  key: "glacify-cache",
  serialize: (data) => superjson.stringify(data),
  deserialize: (data) => superjson.parse(data),
});

const trpcClient = trpc.createClient({
  links: [
    offlineLink(queryClient),
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

export function TRPCProvider({ children }: { children: ReactNode }) {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister,
          maxAge: WEEK,
          // Raise when the shape of the kept data changes
          buster: "1",
          // Everything ever received, even when the last refresh failed (going offline
          // marks a polled query as errored but keeps its data: it must stay on the phone)
          dehydrateOptions: { shouldDehydrateQuery: (q) => q.state.data !== undefined },
        }}
      >
        {children}
      </PersistQueryClientProvider>
    </trpc.Provider>
  );
}
