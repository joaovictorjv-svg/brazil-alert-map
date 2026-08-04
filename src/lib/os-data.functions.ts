import { createServerFn } from "@tanstack/react-start";

import type { OsSnapshot } from "./os-data";
import { fetchOsSnapshot } from "./os-data.server";

export const getOsSnapshot = createServerFn({ method: "GET" }).handler(
  async (): Promise<OsSnapshot> => fetchOsSnapshot(),
);
