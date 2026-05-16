import { EditorCanvas } from "../canvas/EditorCanvas";
import { FloatingToolBar } from "./FloatingToolBar";
import { LeftPanel } from "./LeftPanel";
import { RightPanel } from "./RightPanel";
import { TopBar } from "./TopBar";

export function AppShell() {
  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text)] lg:h-screen lg:overflow-hidden">
      <TopBar />
      <section className="grid min-h-[calc(100vh-88px)] grid-cols-1 gap-4 p-4 lg:h-[calc(100vh-88px)] lg:min-h-0 lg:grid-cols-[280px_1fr_320px] lg:overflow-hidden">
        <LeftPanel />
        <div
          className="rounded-[28px] border border-[var(--border)] bg-[var(--panel)] p-6 lg:flex lg:min-h-0 lg:flex-col"
          data-testid="workspace-panel"
        >
          <div className="shrink-0">
            <h2 className="mb-4 text-xl font-semibold">Cutout Workspace</h2>
          </div>
          <div
            className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pb-24"
            data-testid="workspace-scroll-body"
          >
            <EditorCanvas />
          </div>
        </div>
        <RightPanel />
      </section>
      <FloatingToolBar />
    </main>
  );
}
