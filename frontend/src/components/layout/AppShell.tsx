import { EditorCanvas } from "../canvas/EditorCanvas";
import { FloatingToolBar } from "./FloatingToolBar";
import { LeftPanel } from "./LeftPanel";
import { RightPanel } from "./RightPanel";
import { TopBar } from "./TopBar";

export function AppShell() {
  return (
    <main className="min-h-screen bg-[var(--bg)] px-3 pb-28 pt-3 text-[var(--text)] sm:px-4 lg:h-screen lg:overflow-hidden lg:px-4 lg:pb-4 lg:pt-4">
      <div className="mx-auto flex min-h-full max-w-[1600px] flex-col lg:h-full lg:min-h-0">
        <TopBar />
        <section className="grid grid-cols-1 gap-4 pt-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[280px_1fr_320px] lg:overflow-hidden">
          <LeftPanel />
          <div
            className="clay-panel clay-panel-strong rounded-[34px] px-5 py-5 lg:flex lg:min-h-0 lg:flex-col lg:px-6 lg:py-4"
            data-testid="workspace-panel"
          >
            <div className="mb-3 flex shrink-0 items-center justify-between gap-3">
              <div>
                <p className="inline-flex rounded-full bg-white/45 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
                  Studio Surface
                </p>
                <h2 className="mt-3 text-xl font-semibold tracking-[-0.02em]">
                  Cutout Workspace
                </h2>
              </div>
            </div>
            <div
              className="lg:flex lg:min-h-0 lg:flex-1 lg:overflow-hidden"
              data-testid="workspace-scroll-body"
            >
              <EditorCanvas />
            </div>
            <FloatingToolBar />
          </div>
          <RightPanel />
        </section>
      </div>
    </main>
  );
}
