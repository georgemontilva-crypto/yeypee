import { Router } from "express";
import type { RequestHandler, ErrorRequestHandler } from "express";

/**
 * Express 4 does NOT catch rejected promises thrown inside async handlers.
 * An unhandled rejection kills the whole Node 22 process, so a single failing
 * query (or a missing R2 credential) would take the site down.
 *
 * asyncRouter() returns a normal Router whose handlers are wrapped so that any
 * thrown error or rejected promise is forwarded to next(err) and handled by the
 * global error middleware in index.ts.
 */

const METHODS = [
  "all",
  "get",
  "post",
  "put",
  "patch",
  "delete",
  "options",
  "head",
  "use",
] as const;

function isSubRouter(fn: unknown): boolean {
  // A mounted Router is a function too, but it carries a .stack — never wrap it.
  return typeof fn === "function" && Array.isArray((fn as any).stack);
}

function wrapHandler(fn: any): any {
  if (typeof fn !== "function" || isSubRouter(fn)) return fn;

  // Error-handling middleware keeps its 4-arg shape or Express won't detect it.
  if (fn.length === 4) {
    const wrapped: ErrorRequestHandler = (err, req, res, next) => {
      try {
        const out = fn(err, req, res, next);
        if (out && typeof out.catch === "function") out.catch(next);
      } catch (e) {
        next(e);
      }
    };
    return wrapped;
  }

  const wrapped: RequestHandler = (req, res, next) => {
    try {
      const out = fn(req, res, next);
      if (out && typeof out.catch === "function") out.catch(next);
    } catch (e) {
      next(e);
    }
  };
  return wrapped;
}

function wrapArg(arg: any): any {
  return Array.isArray(arg) ? arg.map(wrapHandler) : wrapHandler(arg);
}

export function asyncRouter(): Router {
  const router = Router();
  for (const method of METHODS) {
    const original = (router as any)[method].bind(router);
    (router as any)[method] = (...args: any[]) => original(...args.map(wrapArg));
  }
  return router;
}
