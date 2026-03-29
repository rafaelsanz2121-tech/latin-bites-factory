"use client"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { X, MapPin, Plus } from "lucide-react"

interface Area {
  id: string
  name: string
  code: string
}

interface Props {
  userId: string
  userName: string
  currentUserId: string
  onClose: () => void
}

export function AreaAssignmentPanel({ userId, userName, currentUserId, onClose }: Props) {
  const supabase = createClient()
  const [allAreas, setAllAreas] = useState<Area[]>([])
  const [assignedAreaIds, setAssignedAreaIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const [{ data: areas }, { data: assignments }] = await Promise.all([
        supabase.from("areas").select("id, name, code").eq("is_active", true).order("name"),
        supabase.from("user_area_assignments").select("area_id").eq("user_id", userId),
      ])
      if (areas) setAllAreas(areas)
      if (assignments) setAssignedAreaIds(new Set(assignments.map((a: any) => a.area_id)))
      setLoading(false)
    }
    load()
  }, [userId])

  const toggle = async (areaId: string) => {
    setToggling(areaId)
    const isAssigned = assignedAreaIds.has(areaId)

    if (isAssigned) {
      const { error } = await supabase
        .from("user_area_assignments")
        .delete()
        .eq("user_id", userId)
        .eq("area_id", areaId)
      if (error) { toast.error(error.message); setToggling(null); return }
      setAssignedAreaIds((prev) => { const next = new Set(prev); next.delete(areaId); return next })
      toast.success("Area removed")
    } else {
      const { error } = await supabase
        .from("user_area_assignments")
        .insert({ user_id: userId, area_id: areaId, assigned_by: currentUserId })
      if (error) { toast.error(error.message); setToggling(null); return }
      setAssignedAreaIds((prev) => new Set([...prev, areaId]))
      toast.success("Area assigned")
    }
    setToggling(null)
  }

  return (
    <div className="mt-2 mb-3 p-4 rounded-xl border border-blue-200 bg-blue-50 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-blue-600" />
          <p className="text-sm font-semibold text-blue-900">Area Assignments — {userName}</p>
        </div>
        <button onClick={onClose}><X className="w-4 h-4 text-blue-600" /></button>
      </div>

      {loading ? (
        <p className="text-sm text-blue-700">Loading areas...</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {allAreas.map((area) => {
            const assigned = assignedAreaIds.has(area.id)
            return (
              <button
                key={area.id}
                onClick={() => toggle(area.id)}
                disabled={toggling === area.id}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors disabled:opacity-50 ${
                  assigned
                    ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
                    : "bg-white text-blue-700 border-blue-300 hover:bg-blue-100"
                }`}
              >
                {assigned ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                {area.name}
              </button>
            )
          })}
          {!allAreas.length && <p className="text-sm text-blue-700 italic">No areas defined</p>}
        </div>
      )}
      <p className="text-xs text-blue-600">Click an area to toggle assignment. Blue = assigned.</p>
    </div>
  )
}
