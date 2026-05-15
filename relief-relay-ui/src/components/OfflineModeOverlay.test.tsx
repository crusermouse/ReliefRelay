import { render, screen, act, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { OfflineModeOverlay } from "./OfflineModeOverlay";

// Mock framer-motion to simplify testing
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, className }: any) => <div className={className}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe("OfflineModeOverlay", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders offline status when isOnline is false", () => {
    act(() => {
      render(<OfflineModeOverlay isOnline={false} backendReachable={true} health={null} />);
    });

    expect(screen.getAllByText("🔴 Offline (no network)").length).toBeGreaterThan(0);
    expect(screen.getByText("NETWORK LOST")).toBeDefined();
    expect(screen.getByText("Internet disconnected")).toBeDefined();
  });

  it("renders backend unreachable status when backendReachable is false", () => {
    act(() => {
      render(<OfflineModeOverlay isOnline={true} backendReachable={false} health={null} />);
    });

    expect(screen.getAllByText("🔴 Backend unreachable").length).toBeGreaterThan(0);
    expect(screen.getByText("API UNREACHABLE")).toBeDefined();
    expect(screen.getByText("Backend unavailable")).toBeDefined();
  });

  it("renders local AI unavailable when ollama is not ready", () => {
    const health: any = {
      status: "degraded",
      services: { backend: "ok", vector_store: "ok", ollama: "offline" }
    };

    act(() => {
      render(<OfflineModeOverlay isOnline={true} backendReachable={true} health={health} />);
    });

    expect(screen.getByText("OLLAMA DEGRADED")).toBeDefined();
    expect(screen.getByText("Local AI unavailable")).toBeDefined();
    expect(screen.getAllByText("🟡 Degraded (using fallbacks)").length).toBeGreaterThan(0);
  });

  it("renders degraded operational mode when status is degraded but ollama is ready", () => {
    const health: any = {
      status: "degraded",
      services: { backend: "ok", vector_store: "offline", ollama: "ready" }
    };

    act(() => {
      render(<OfflineModeOverlay isOnline={true} backendReachable={true} health={health} />);
    });

    expect(screen.getByText("LIMITED SERVICE")).toBeDefined();
    expect(screen.getByText("Degraded operational mode")).toBeDefined();
    expect(screen.getAllByText("🟡 Degraded (using fallbacks)").length).toBeGreaterThan(0);
  });

  it("renders only status badge when fully operational", () => {
    const health: any = {
      status: "operational",
      services: { backend: "ok", vector_store: "ok", ollama: "ready" }
    };

    act(() => {
      render(<OfflineModeOverlay isOnline={true} backendReachable={true} health={health} />);
    });

    expect(screen.getByText("🟢 Online (fully operational)")).toBeDefined();
    expect(screen.queryByText("NETWORK LOST")).toBeNull();
    expect(screen.queryByText("API UNREACHABLE")).toBeNull();
    expect(screen.queryByText("OLLAMA DEGRADED")).toBeNull();
    expect(screen.queryByText("LIMITED SERVICE")).toBeNull();
  });

  it("renders default checking status when health is null but online and backend reachable", () => {
    act(() => {
      render(<OfflineModeOverlay isOnline={true} backendReachable={true} health={null} />);
    });

    expect(screen.getByText("🟡 Checking services…")).toBeDefined();
  });
});
