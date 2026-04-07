"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import {
  Settings,
  Users,
  Mail,
  Trash2,
  Crown,
  Pencil,
  Check,
  X,
  UserPlus,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Separator } from "@/components/ui/separator";
import type { User, Workspace, UserRole } from "@/types";

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  analyst: "Analyste",
  "read-only": "Lecture seule",
};

interface WorkspaceData {
  workspace: Workspace;
  members: User[];
  currentUserId: string;
  currentRole: UserRole;
}

export function WorkspaceSettings() {
  const { user: clerkUser } = useUser();
  const [data, setData] = useState<WorkspaceData | null>(null);
  const [loading, setLoading] = useState(true);

  // Workspace name editing
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [savingName, setSavingName] = useState(false);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"analyst" | "read-only">("analyst");
  const [inviting, setInviting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/workspaces/current");
      if (!res.ok) throw new Error("Erreur chargement");
      const json = await res.json();
      setData(json);
      setNameValue(json.workspace.name);
    } catch {
      toast.error("Impossible de charger les paramètres");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function saveName() {
    if (!nameValue.trim()) return;
    setSavingName(true);
    try {
      const res = await fetch("/api/workspaces/current", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameValue.trim() }),
      });
      if (!res.ok) throw new Error("Erreur sauvegarde");
      toast.success("Nom mis à jour");
      setEditingName(false);
      await fetchData();
    } catch {
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSavingName(false);
    }
  }

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      const res = await fetch("/api/workspaces/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erreur");
      toast.success(json.message ?? `Invitation envoyée à ${inviteEmail}`);
      setInviteEmail("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setInviting(false);
    }
  }

  async function changeRole(member: User, newRole: "analyst" | "read-only") {
    try {
      const res = await fetch(`/api/workspaces/members/${member.clerkUserId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error);
      }
      toast.success(`Rôle mis à jour pour ${member.name}`);
      await fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  }

  async function removeMember(member: User) {
    try {
      const res = await fetch(`/api/workspaces/members/${member.clerkUserId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error);
      }
      toast.success(`${member.name} retiré du workspace`);
      await fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const isAdmin = data.currentRole === "admin";

  return (
    <Tabs defaultValue="general">
      <TabsList className="mb-6">
        <TabsTrigger value="general" className="gap-2">
          <Settings className="h-3.5 w-3.5" />
          Général
        </TabsTrigger>
        <TabsTrigger value="team" className="gap-2">
          <Users className="h-3.5 w-3.5" />
          Équipe ({data.members.length})
        </TabsTrigger>
      </TabsList>

      {/* General tab */}
      <TabsContent value="general">
        <Card>
          <CardHeader>
            <CardTitle>Informations du workspace</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Nom du workspace</Label>
              {editingName ? (
                <div className="flex gap-2">
                  <Input
                    value={nameValue}
                    onChange={(e) => setNameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveName();
                      if (e.key === "Escape") {
                        setEditingName(false);
                        setNameValue(data.workspace.name);
                      }
                    }}
                    autoFocus
                    disabled={savingName}
                  />
                  <Button size="icon" variant="ghost" onClick={saveName} disabled={savingName}>
                    {savingName ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4 text-green-600" />
                    )}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      setEditingName(false);
                      setNameValue(data.workspace.name);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-slate-800">{data.workspace.name}</p>
                  {isAdmin && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => setEditingName(true)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              )}
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Plan actuel</Label>
              <div className="flex items-center gap-3">
                <Badge variant="info" className="capitalize">
                  {data.workspace.plan}
                </Badge>
                <a href="/billing" className="text-xs text-blue-600 hover:underline">
                  Gérer l'abonnement →
                </a>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Votre profil</Label>
              <div className="flex items-center gap-3">
                {clerkUser?.imageUrl && (
                  <img
                    src={clerkUser.imageUrl}
                    alt={clerkUser.fullName ?? ""}
                    className="h-9 w-9 rounded-full"
                  />
                )}
                <div>
                  <p className="text-sm font-medium">{clerkUser?.fullName}</p>
                  <p className="text-xs text-slate-500">
                    {clerkUser?.emailAddresses[0]?.emailAddress}
                  </p>
                </div>
                <Badge variant="secondary" className="ml-auto">
                  {ROLE_LABELS[data.currentRole]}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Team tab */}
      <TabsContent value="team">
        <div className="space-y-4">
          {/* Invite form — admin only */}
          {isAdmin && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <UserPlus className="h-4 w-4" />
                  Inviter un collaborateur
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={sendInvite} className="flex gap-3">
                  <div className="flex-1">
                    <Input
                      type="email"
                      placeholder="email@exemple.fr"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      required
                      disabled={inviting}
                    />
                  </div>
                  <Select
                    value={inviteRole}
                    onValueChange={(v) => setInviteRole(v as "analyst" | "read-only")}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="analyst">Analyste</SelectItem>
                      <SelectItem value="read-only">Lecture seule</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button type="submit" disabled={inviting || !inviteEmail.trim()}>
                    {inviting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Mail className="h-4 w-4" />
                        Inviter
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Members list */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Membres ({data.members.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {data.members.map((member, i) => {
                const isSelf = member.clerkUserId === data.currentUserId;
                const isOwner =
                  member.role === "admin" && member.clerkUserId === data.workspace.ownerUserId;

                return (
                  <div
                    key={member.id}
                    className={`flex items-center gap-4 px-6 py-4 ${i < data.members.length - 1 ? "border-b border-slate-100" : ""}`}
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-slate-800">{member.name}</p>
                        {isSelf && (
                          <Badge variant="secondary" className="text-[10px]">
                            Vous
                          </Badge>
                        )}
                        {isOwner && <Crown className="h-3.5 w-3.5 text-amber-500" />}
                      </div>
                      <p className="text-xs text-slate-400">{member.email}</p>
                    </div>

                    {/* Role selector — admin only, not for self */}
                    {isAdmin && !isSelf && member.role !== "admin" ? (
                      <Select
                        value={member.role}
                        onValueChange={(v) => changeRole(member, v as "analyst" | "read-only")}
                      >
                        <SelectTrigger className="w-36 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="analyst">Analyste</SelectItem>
                          <SelectItem value="read-only">Lecture seule</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant={member.role === "admin" ? "default" : "secondary"}>
                        {ROLE_LABELS[member.role]}
                      </Badge>
                    )}

                    {/* Remove member */}
                    {isAdmin && !isSelf && (
                      <ConfirmDialog
                        trigger={
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-slate-400 hover:text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        }
                        title={`Retirer ${member.name} ?`}
                        description="Cette personne perdra l'accès au workspace immédiatement."
                        confirmLabel="Retirer"
                        destructive
                        onConfirm={() => removeMember(member)}
                      />
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    </Tabs>
  );
}
