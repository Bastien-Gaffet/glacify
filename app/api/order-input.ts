import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { MAX_SCOOPS, type Menu } from "@contracts/menu";
import { orderProblem, type OrderInput } from "@contracts/orders";

export const orderInput = z.object({
  name: z.string().trim().min(1).max(40),
  containerId: z.number().int(),
  scoops: z.array(z.number().int()).min(1).max(MAX_SCOOPS),
  toppings: z.array(z.number().int()).max(20),
  note: z.string().trim().max(140).optional(),
});

export function assertValidOrder(menu: Menu, order: OrderInput, guest: boolean) {
  const problem = orderProblem(menu, order, { guest });
  if (problem) throw new TRPCError({ code: "BAD_REQUEST", message: problem });
}
