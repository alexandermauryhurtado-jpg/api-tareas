import type { AuthenticatedUser } from "./user.types.js";

declare global {
  namespace Express {
    interface Request {
      /** Usuario autenticado. Lo rellena `authMiddleware`. */
      user?: AuthenticatedUser;
    }
  }
}

export {};
