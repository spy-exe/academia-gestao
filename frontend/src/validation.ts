import { z } from "zod";
// Keep validation compatible with script-src 'self', without dynamic compilation.
z.config({ jitless: true });
export { z };
