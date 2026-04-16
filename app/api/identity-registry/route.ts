import { createIdentityRegistryHandler } from "@bsv/simple/server";

const handler = createIdentityRegistryHandler();
export const GET = handler.GET;
export const POST = handler.POST;
