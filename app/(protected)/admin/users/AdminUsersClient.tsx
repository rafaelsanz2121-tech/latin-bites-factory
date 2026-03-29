"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "sonner"
import { UserPlus, X, CheckCircle, Ban, MapPin } from "lucide-react"
import { useRouter } from "next/navigation"
import { ROLE_LABELS, ROLE_COLORS } from "@/constants/roles"
import { AreaAssignmentPanel } from "@/components/admin/AreaAssignmentPanel"

interface UserProfile {
  id: string
  full_name: string
  initials: string
  employee_id: string | null
  role: string
  is_active: boolean
  created_at: string
}

export function AdminUsersClient({ users: initialUsers, currentUserId }: { users: UserProfile[]; currentUserId: string }) {
  const supabase = createClient()
  const router = useRouter()

  const [users, setUsers] = useState(initialUsers)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [areaUserId, setAreaUserId] = useState<string | null>(null)

  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    full_name: "",
    initials: "",
    employee_id: "",
    role: "operator",
  })
  const [creating, setCreating] = useState(false)

  const set = (k: string, v: string) => setNewUser((p) => ({ ...p, [k]: v }))

  const handleCreate = async () => {
    if (!newUser.email || !newUser.password || !newUser.full_name || !newUser.initials) {
      toast.error("Email, password, name, and initials are required")
      return
    }
    setCreating(true)

    const res = await fetch("/api/admin/create-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newUser),
    })
    const result = await res.json()

    setCreating(false)
    if (!res.ok) { toast.error(result.error || "Failed to create user"); return }

    toast.success(`User ${newUser.full_name} created`)
    setShowCreateForm(false)
    setNewUser({ email: "", password: "", full_name: "", initials: "", employee_id: "", role: "operator" })
    router.refresh()
  }

  const toggleActive = async (userId: string, currentActive: boolean) => {
    setLoadingId(userId)
    const { error } = await supabase.from("profiles").update({ is_active: !currentActive }).eq("id", userId)
    setLoadingId(null)
    if (error) { toast.error(error.message); return }
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, is_active: !currentActive } : u))
    toast.success(currentActive ? "User deactivated" : "User reactivated")
  }

  const changeRole = async (userId: string, newRole: string) => {
    setLoadingId(userId)
    const { error } = await supabase.from("profiles").update({ role: newRole }).eq("id", userId)
    setLoadingId(null)
    if (error) { toast.error(error.message); return }
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u))
    toast.success("Role updated")
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">{users.length} users · {users.filter((u) => u.is_active).length} active</p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <UserPlus className="w-4 h-4" />Create User
        </Button>
      </div>

      {/* Create form */}
      {showCreateForm && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold">New User</h2>
              <button type="button" onClick={() => setShowCreateForm(false)}><X className="w-4 h-4 text-[var(--muted-foreground)]" /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Email <span className="text-red-500">*</span></Label>
                <Input type="email" value={newUser.email} onChange={(e) => set("email", e.target.value)} placeholder="user@example.com" />
              </div>
              <div className="space-y-1.5">
                <Label>Temporary Password <span className="text-red-500">*</span></Label>
                <Input type="password" value={newUser.password} onChange={(e) => set("password", e.target.value)} placeholder="Min 8 characters" />
              </div>
              <div className="space-y-1.5">
                <Label>Full Name <span className="text-red-500">*</span></Label>
                <Input value={newUser.full_name} onChange={(e) => set("full_name", e.target.value)} placeholder="Jane Doe" />
              </div>
              <div className="space-y-1.5">
                <Label>Initials <span className="text-red-500">*</span></Label>
                <Input value={newUser.initials} onChange={(e) => set("initials", e.target.value.toUpperCase())} placeholder="JD" maxLength={3} />
              </div>
              <div className="space-y-1.5">
                <Label>Employee ID</Label>
                <Input value={newUser.employee_id} onChange={(e) => set("employee_id", e.target.value)} placeholder="Optional" />
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select value={newUser.role} onValueChange={(v) => set("role", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="operator">Operator</SelectItem>
                    <SelectItem value="supervisor">Supervisor</SelectItem>
                    <SelectItem value="qa">QA</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreate} loading={creating}>Create User</Button>
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Users table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)] text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">
                  <th className="text-left px-4 py-3">User</th>
                  <th className="text-left px-4 py-3">Employee ID</th>
                  <th className="text-left px-4 py-3">Role</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <>
                    <tr key={u.id} className={`border-b border-[var(--border)] last:border-0 transition-colors ${!u.is_active ? "opacity-50" : "hover:bg-[var(--muted)]/30"}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold">{u.initials}</div>
                          <div>
                            <p className="text-sm font-medium">{u.full_name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--muted-foreground)] font-mono">{u.employee_id || "—"}</td>
                      <td className="px-4 py-3">
                        <Select
                          value={u.role}
                          onValueChange={(v) => changeRole(u.id, v)}
                          disabled={loadingId === u.id}
                        >
                          <SelectTrigger className="h-7 text-xs w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="operator">Operator</SelectItem>
                            <SelectItem value="supervisor">Supervisor</SelectItem>
                            <SelectItem value="qa">QA</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-3">
                        {u.is_active
                          ? <Badge variant="success" className="text-xs">Active</Badge>
                          : <Badge variant="secondary" className="text-xs">Inactive</Badge>
                        }
                      </td>
                      <td className="px-4 py-3 flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setAreaUserId(areaUserId === u.id ? null : u.id)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <MapPin className="w-3.5 h-3.5" />Areas
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleActive(u.id, u.is_active)}
                          loading={loadingId === u.id}
                          className={u.is_active ? "text-red-600 hover:text-red-700 hover:bg-red-50" : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"}
                        >
                          {u.is_active ? <><Ban className="w-3.5 h-3.5" />Deactivate</> : <><CheckCircle className="w-3.5 h-3.5" />Reactivate</>}
                        </Button>
                      </td>
                    </tr>
                    {areaUserId === u.id && (
                      <tr key={`areas-${u.id}`}>
                        <td colSpan={5} className="px-4">
                          <AreaAssignmentPanel
                            userId={u.id}
                            userName={u.full_name}
                            currentUserId={currentUserId}
                            onClose={() => setAreaUserId(null)}
                          />
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
