import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";

export function useAuth() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: user, isLoading } = trpc.auth.me.useQuery(undefined, { staleTime: 5 * 60 * 1000, retry: false });

  // Drop every cached query: the next reader must never see the previous one's books
  const logoutMutation = trpc.auth.logout.useMutation({
    onSettled: () => {
      queryClient.clear();
      navigate("/", { replace: true });
    },
  });
  const logout = useCallback(() => logoutMutation.mutate(), [logoutMutation]);

  return { user: user ?? null, isLoading, logout };
}
