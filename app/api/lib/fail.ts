import { TRPCError } from "@trpc/server";
import { encodeError, type AppError, type ErrorCode, type ErrorParams } from "@contracts/errors";

type TrpcCode = ConstructorParameters<typeof TRPCError>[0]["code"];

/** Throws an error the app words in the reader's language (see contracts/errors.ts). */
export function fail(status: TrpcCode, error: AppError | ErrorCode, params?: ErrorParams): never {
  const e = typeof error === "string" ? { code: error, params } : error;
  throw new TRPCError({ code: status, message: encodeError(e) });
}
