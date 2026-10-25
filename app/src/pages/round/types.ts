import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../api/router";

export type RoundData = inferRouterOutputs<AppRouter>["rounds"]["get"];
export type RoundOrder = RoundData["orders"][number];
