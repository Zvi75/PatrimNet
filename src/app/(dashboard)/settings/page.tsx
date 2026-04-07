import { WorkspaceSettings } from "@/components/settings/workspace-settings";

export const metadata = { title: "Paramètres" };

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Paramètres</h1>
        <p className="mt-1 text-sm text-slate-500">Workspace, équipe, notifications</p>
      </div>
      <WorkspaceSettings />
    </div>
  );
}
