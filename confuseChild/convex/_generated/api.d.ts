/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as chat from "../chat.js";
import type * as deepgram from "../deepgram.js";
import type * as ingest from "../ingest.js";
import type * as knowledge from "../knowledge.js";
import type * as myFunctions from "../myFunctions.js";
import type * as planner from "../planner.js";
import type * as sessions from "../sessions.js";
import type * as users from "../users.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  chat: typeof chat;
  deepgram: typeof deepgram;
  ingest: typeof ingest;
  knowledge: typeof knowledge;
  myFunctions: typeof myFunctions;
  planner: typeof planner;
  sessions: typeof sessions;
  users: typeof users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
