import "@testing-library/jest-dom/vitest";
import { cleanup, configure } from "@testing-library/react";
import { afterEach, vi } from "vitest";
afterEach(cleanup);

configure({ asyncUtilTimeout: 5000 });

// JSDOM has no viewport scrolling; the real behavior is verified by Playwright.
Object.defineProperty(window, "scrollTo", { value: vi.fn(), writable: true });
