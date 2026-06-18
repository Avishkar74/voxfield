"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  FileSearch,
  AlertTriangle,
  Users,
  Search,
  UserCheck,
  Calendar,
  X,
  MessageSquare,
  Wrench,
  FileCheck,
  Activity,
  Layers,
  ShieldAlert,
  ArrowUpDown,
  RefreshCw,
  SlidersHorizontal
} from "lucide-react";
import type {
  User,
  WorkOrder,
  InspectionReport,
  Alert,
  Transcript,
  ActivityLog,
  Equipment,
  RepairHistory
} from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import { OfflineSyncSection } from "./OfflineSyncSection";
import { FormattedDate } from "./FormattedDate";
import { AlertCircle } from "lucide-react";

interface SupervisorDashboardContainerProps {
  initialData: {
    user: {
      id: string;
      fullName?: string | null;
      email: string;
      role: string;
      employeeCode?: string;
    };
    counts: {
      workOrders: number;
      openWorkOrders: number;
      inProgressWorkOrders: number;
      closedWorkOrders: number;
      inspections: number;
      lowInspections: number;
      mediumInspections: number;
      highInspections: number;
      criticalInspections: number;
      alerts: number;
      openAlerts: number;
      acknowledgedAlerts: number;
      resolvedAlerts: number;
      transcripts: number;
      activityLogs: number;
      activeTechnicians: number;
    };
    workOrders: WorkOrder[];
    inspections: InspectionReport[];
    alerts: Alert[];
    transcripts: Transcript[];
    activityLogs: ActivityLog[];
    technicians: User[];
    equipment: Equipment[];
    repairHistory: RepairHistory[];
  };
}

export function SupervisorDashboardContainer({ initialData }: SupervisorDashboardContainerProps) {
  const [data, setData] = useState(initialData);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<Date>(new Date());
  const [timeAgoText, setTimeAgoText] = useState("Just now");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTechnician, setSelectedTechnician] = useState<User | null>(null);

  // Filters for Voice History
  const [voicePeriod, setVoicePeriod] = useState<"today" | "week" | "all">("all");
  const [voiceTechFilter, setVoiceTechFilter] = useState<string>("all");

  // Status/Priority Filter States for lists
  const [woStatusFilter, setWoStatusFilter] = useState<string>("all");
  const [inspSeverityFilter, setInspSeverityFilter] = useState<string>("all");

  const supabase = createClient();

  // Update last updated timer relative text
  useEffect(() => {
    const timer = setInterval(() => {
      const diffMs = new Date().getTime() - lastUpdatedTime.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) {
        setTimeAgoText("Just now");
      } else {
        setTimeAgoText(`${diffMins} min${diffMins > 1 ? "s" : ""} ago`);
      }
    }, 30000);

    return () => clearInterval(timer);
  }, [lastUpdatedTime]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/dashboard/supervisor");
      if (res.ok) {
        const result = await res.json();
        if (result.success && result.data) {
          setData(result.data);
          setLastUpdatedTime(new Date());
          setTimeAgoText("Just now");
          setDashboardError(null);
        } else {
          setDashboardError(result.error || "Failed to refresh dashboard data");
        }
      } else {
        setDashboardError("Failed to refresh dashboard data");
      }
    } catch (err) {
      console.error("Failed to refresh dashboard data", err);
      setDashboardError("Failed to refresh dashboard data. Check your connection.");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      const { data: updatedAlert, error } = await (supabase as any)
        .from("alerts")
        .update({
          status: "ACKNOWLEDGED",
          acknowledged_by: data.user.id
        })
        .eq("id", alertId)
        .select()
        .single();

      if (error) throw error;

      // Update state locally
      setData(prev => ({
        ...prev,
        alerts: prev.alerts.map(a => (a.id === alertId ? { ...a, status: "ACKNOWLEDGED", acknowledged_by: data.user.id } : a))
      }));
      setDashboardError(null);
    } catch (err: any) {
      console.error("Failed to acknowledge alert", err);
      setDashboardError(err.message || "Failed to acknowledge alert");
    }
  };

  // Helper mappings
  const equipmentMap = useMemo(() => {
    const map = new Map<string, Equipment>();
    data.equipment.forEach(e => map.set(e.id, e));
    return map;
  }, [data.equipment]);

  const techniciansMap = useMemo(() => {
    const map = new Map<string, User>();
    data.technicians.forEach(t => map.set(t.id, t));
    return map;
  }, [data.technicians]);

  // Compute Relative Time helper
  const getRelativeTime = (isoString: string) => {
    const date = new Date(isoString);
    const diffMs = new Date().getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  // Filter and Search calculations
  const filteredTechnicians = useMemo(() => {
    return data.technicians.filter(tech => {
      if (!searchQuery) return true;
      const term = searchQuery.toLowerCase();
      return (
        tech.full_name.toLowerCase().includes(term) ||
        tech.employee_code.toLowerCase().includes(term) ||
        tech.email.toLowerCase().includes(term)
      );
    });
  }, [data.technicians, searchQuery]);

  const filteredWorkOrders = useMemo(() => {
    return data.workOrders.filter(wo => {
      const matchesSearch = () => {
        if (!searchQuery) return true;
        const term = searchQuery.toLowerCase();
        const equip = equipmentMap.get(wo.equipment_id);
        const tech = wo.assigned_to ? techniciansMap.get(wo.assigned_to) : null;
        return (
          wo.work_order_number.toLowerCase().includes(term) ||
          wo.title.toLowerCase().includes(term) ||
          (equip && equip.equipment_code.toLowerCase().includes(term)) ||
          (tech && tech.full_name.toLowerCase().includes(term))
        );
      };

      const matchesStatus = woStatusFilter === "all" || wo.status === woStatusFilter;

      return matchesSearch() && matchesStatus;
    });
  }, [data.workOrders, searchQuery, woStatusFilter, equipmentMap, techniciansMap]);

  const filteredInspections = useMemo(() => {
    return data.inspections.filter(insp => {
      const matchesSearch = () => {
        if (!searchQuery) return true;
        const term = searchQuery.toLowerCase();
        const equip = equipmentMap.get(insp.equipment_id);
        const tech = techniciansMap.get(insp.technician_id);
        return (
          insp.title.toLowerCase().includes(term) ||
          insp.description.toLowerCase().includes(term) ||
          (equip && equip.equipment_code.toLowerCase().includes(term)) ||
          (tech && tech.full_name.toLowerCase().includes(term))
        );
      };

      const matchesSeverity = inspSeverityFilter === "all" || insp.severity === inspSeverityFilter;

      return matchesSearch() && matchesSeverity;
    });
  }, [data.inspections, searchQuery, inspSeverityFilter, equipmentMap, techniciansMap]);

  const filteredAlerts = useMemo(() => {
    return data.alerts.filter(alert => {
      if (!searchQuery) return true;
      const term = searchQuery.toLowerCase();
      const equip = equipmentMap.get(alert.equipment_id);
      return (
        alert.message.toLowerCase().includes(term) ||
        (equip && equip.equipment_code.toLowerCase().includes(term))
      );
    });
  }, [data.alerts, searchQuery, equipmentMap]);

  // Critical Alerts list (Only Severity critical/high, sorted by newest)
  const criticalAlerts = useMemo(() => {
    return filteredAlerts.filter(a => a.severity === "CRITICAL" || a.severity === "HIGH");
  }, [filteredAlerts]);

  // Voice history matching filters
  const filteredVoiceTranscripts = useMemo(() => {
    return data.transcripts.filter(t => {
      // Tech filter
      if (voiceTechFilter !== "all" && t.user_id !== voiceTechFilter) return false;

      // Period filter
      if (voicePeriod === "today") {
        const todayStr = new Date().toDateString();
        return new Date(t.created_at).toDateString() === todayStr;
      }
      if (voicePeriod === "week") {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return new Date(t.created_at) >= weekAgo;
      }

      return true;
    });
  }, [data.transcripts, voiceTechFilter, voicePeriod]);

  // Equipment requiring attention
  const equipmentRequiringAttention = useMemo(() => {
    const list: Array<{
      equipment: Equipment;
      alertsCount: number;
      openWorkOrders: number;
      repeatedFailures: boolean;
      failuresCount: number;
    }> = [];

    data.equipment.forEach(eq => {
      // Count alerts
      const activeAlerts = data.alerts.filter(a => a.equipment_id === eq.id && a.status !== "RESOLVED").length;

      // Count open/in_progress work orders
      const openWOs = data.workOrders.filter(w => w.equipment_id === eq.id && w.status !== "CLOSED").length;

      // Count repair history failures
      const failures = data.repairHistory.filter(h => h.equipment_id === eq.id).length;
      const isRepeatedFailure = failures >= 2;

      if (activeAlerts > 0 || openWOs > 0 || isRepeatedFailure) {
        list.push({
          equipment: eq,
          alertsCount: activeAlerts,
          openWorkOrders: openWOs,
          repeatedFailures: isRepeatedFailure,
          failuresCount: failures
        });
      }
    });

    return list;
  }, [data.equipment, data.alerts, data.workOrders, data.repairHistory]);

  // Technician Activity details computation
  const getTechStats = (techId: string) => {
    const assignedWOs = data.workOrders.filter(w => w.assigned_to === techId);
    const createdInsps = data.inspections.filter(i => i.technician_id === techId);
    const techLogs = data.activityLogs.filter(l => l.user_id === techId);
    const techTranscripts = data.transcripts.filter(t => t.user_id === techId);

    // Compute Queries Today
    const todayStr = new Date().toDateString();
    const queriesToday = techTranscripts.filter(t => new Date(t.created_at).toDateString() === todayStr).length;

    // Compute relative time of last activity
    let lastActive = "Never";
    let lastActiveTime = 0;

    techLogs.forEach(l => {
      const t = new Date(l.created_at).getTime();
      if (t > lastActiveTime) lastActiveTime = t;
    });
    techTranscripts.forEach(tr => {
      const t = new Date(tr.created_at).getTime();
      if (t > lastActiveTime) lastActiveTime = t;
    });

    if (lastActiveTime > 0) {
      lastActive = getRelativeTime(new Date(lastActiveTime).toISOString());
    }

    return {
      openWorkOrders: assignedWOs.filter(w => w.status !== "CLOSED").length,
      openInspections: createdInsps.filter(i => i.status === "OPEN").length,
      queriesToday,
      lastActive,
      workOrders: assignedWOs,
      inspections: createdInsps,
      activity: techLogs,
      transcripts: techTranscripts
    };
  };

  return (
    <div className="space-y-8 pb-16">
      
      {/* 1. Header (Premium Style with Metadata Controls, No Greetings) */}
      <header className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 transition duration-300">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
              Supervisor Dashboard
            </h1>
            <button 
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-950 transition active:scale-95 disabled:opacity-50"
              title="Refresh Dashboard"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 font-medium uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse border-2 border-white" />
              System Online
            </span>
            <span>·</span>
            <span>Last Updated: {timeAgoText}</span>
          </div>
        </div>

        {/* Supervisor Profile Box */}
        <div className="flex items-center gap-3.5 bg-[#FAF9F5] border border-gray-100 rounded-2xl p-3 px-5 self-start md:self-auto shadow-inner">
          <div className="w-10 h-10 rounded-full bg-[#D14923] flex items-center justify-center text-white font-extrabold text-sm border border-white shadow-sm">
            {data.user.fullName?.[0]?.toUpperCase() ?? data.user.email[0].toUpperCase()}
          </div>
          <div>
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider leading-none">Supervisor</p>
            <p className="text-sm font-bold text-gray-900 mt-1">{data.user.fullName ?? "John Doe"}</p>
            <p className="text-[10px] text-gray-500 font-mono tracking-tight mt-0.5">{data.user.employeeCode ?? "EMP-001"}</p>
          </div>
        </div>
      </header>

      {dashboardError && (
        <div className="flex items-start justify-between gap-2 bg-red-50 border border-red-100 p-3.5 rounded-2xl text-red-600 text-xs leading-relaxed">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-4.5 h-4.5 mt-0.5 flex-shrink-0" />
            <span>{dashboardError}</span>
          </div>
          <button
            onClick={() => setDashboardError(null)}
            className="text-red-400 hover:text-red-600 transition flex-shrink-0"
            aria-label="Dismiss error"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Operations Summary Cards (Top Row) */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Active Work Orders */}
        <div className="bg-white border border-gray-200 hover:border-[#D14923]/20 hover:-translate-y-0.5 transition duration-300 rounded-3xl p-5 flex flex-col justify-between shadow-sm group">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Active Work Orders</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 group-hover:scale-110 transition duration-300">
              <ClipboardList className="w-5 h-5" />
            </div>
          </div>
          <div>
            <span className="text-3xl font-black text-gray-950 leading-none">
              {data.workOrders.filter(w => w.status !== "CLOSED").length}
            </span>
            <p className="text-[10px] text-gray-400 mt-2 font-medium">In Open / Progress</p>
          </div>
        </div>

        {/* Open Inspections */}
        <div className="bg-white border border-gray-200 hover:border-[#D14923]/20 hover:-translate-y-0.5 transition duration-300 rounded-3xl p-5 flex flex-col justify-between shadow-sm group">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Open Inspections</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 group-hover:scale-110 transition duration-300">
              <FileSearch className="w-5 h-5" />
            </div>
          </div>
          <div>
            <span className="text-3xl font-black text-gray-950 leading-none">
              {data.inspections.filter(i => i.status === "OPEN").length}
            </span>
            <p className="text-[10px] text-gray-400 mt-2 font-medium">Awaiting Review</p>
          </div>
        </div>

        {/* Critical Alerts */}
        <div className="bg-white border border-gray-200 hover:border-[#D14923]/20 hover:-translate-y-0.5 transition duration-300 rounded-3xl p-5 flex flex-col justify-between shadow-sm group">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Critical Alerts</span>
            <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 group-hover:scale-110 transition duration-300">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div>
            <span className="text-3xl font-black text-gray-950 leading-none">
              {data.alerts.filter(a => a.severity === "CRITICAL" && a.status === "OPEN").length}
            </span>
            <p className="text-[10px] text-gray-400 mt-2 font-medium">Require Intervention</p>
          </div>
        </div>

        {/* Active Technicians */}
        <div className="bg-white border border-gray-200 hover:border-[#D14923]/20 hover:-translate-y-0.5 transition duration-300 rounded-3xl p-5 flex flex-col justify-between shadow-sm group">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Active Technicians</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition duration-300">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div>
            <span className="text-3xl font-black text-gray-950 leading-none">
              {data.counts.activeTechnicians}
            </span>
            <p className="text-[10px] text-gray-400 mt-2 font-medium">Active past 7 days</p>
          </div>
        </div>
      </section>

      {/* 10. Search & Filters Center */}
      <section className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-gray-950">
          <SlidersHorizontal className="w-4 h-4 text-[#D14923]" />
          <h2 className="text-sm font-bold uppercase tracking-wider">Search & Filters Center</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          {/* General Search Input */}
          <div className="relative md:col-span-2">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search Technicians, WO #s, Equipment Code..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#D14923] focus:bg-white transition"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-900"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Work Orders Status Filter */}
          <div>
            <select
              value={woStatusFilter}
              onChange={e => setWoStatusFilter(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#D14923] transition"
            >
              <option value="all">All Work Order Statuses</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>

          {/* Inspections Severity Filter */}
          <div>
            <select
              value={inspSeverityFilter}
              onChange={e => setInspSeverityFilter(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#D14923] transition"
            >
              <option value="all">All Inspection Severities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>

        </div>
      </section>

      {/* 3. Critical Alerts Section (Most Important Section) */}
      <section className="bg-white border border-gray-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-extrabold text-gray-950 text-base flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-600" />
            Critical Alerts
          </h2>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-red-50 text-red-700 rounded-full border border-red-100">
            {criticalAlerts.length} Active
          </span>
        </div>

        {criticalAlerts.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">
            No Active Alerts
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FAF9F5] border-b border-gray-100 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                  <th className="p-4 px-6">Severity</th>
                  <th className="p-4 px-6">Equipment</th>
                  <th className="p-4 px-6">Message</th>
                  <th className="p-4 px-6">Timestamp</th>
                  <th className="p-4 px-6">Status</th>
                  <th className="p-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {criticalAlerts.map(alert => {
                  const equip = equipmentMap.get(alert.equipment_id);
                  return (
                    <tr key={alert.id} className="hover:bg-[#FAF9F5]/50 transition duration-150">
                      <td className="p-4 px-6">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
                          alert.severity === "CRITICAL"
                            ? "bg-red-50 text-red-700 border-red-100"
                            : "bg-orange-50 text-orange-700 border-orange-100"
                        }`}>
                          {alert.severity}
                        </span>
                      </td>
                      <td className="p-4 px-6 font-semibold text-gray-900">
                        {equip ? equip.equipment_code : "Unknown"}
                      </td>
                      <td className="p-4 px-6 text-sm text-gray-600 max-w-sm truncate" title={alert.message}>
                        {alert.message}
                      </td>
                      <td className="p-4 px-6 text-xs text-gray-500">
                        {getRelativeTime(alert.created_at)}
                      </td>
                      <td className="p-4 px-6">
                        <span className={`text-[10px] font-bold uppercase ${
                          alert.status === "OPEN"
                            ? "text-red-600"
                            : alert.status === "ACKNOWLEDGED"
                            ? "text-amber-600"
                            : "text-emerald-600"
                        }`}>
                          {alert.status}
                        </span>
                      </td>
                      <td className="p-4 px-6 text-right">
                        {alert.status === "OPEN" && (
                          <button
                            onClick={() => handleAcknowledgeAlert(alert.id)}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold py-1 px-3 rounded-lg transition"
                          >
                            Acknowledge
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 4. Technician Monitoring Section (Large Cards view) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-extrabold text-gray-950 text-base flex items-center gap-2">
            <Users className="w-5 h-5 text-[#D14923]" />
            Technician Monitoring
          </h2>
          <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
            {filteredTechnicians.length} Technicians
          </span>
        </div>

        {filteredTechnicians.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-3xl p-10 text-center text-gray-400 text-sm">
            No active technicians found matching filters.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredTechnicians.map(tech => {
              const stats = getTechStats(tech.id);
              return (
                <div
                  key={tech.id}
                  onClick={() => setSelectedTechnician(tech)}
                  className="bg-white border border-gray-200 hover:border-[#D14923] rounded-3xl p-6 shadow-sm hover:shadow-md transition duration-300 cursor-pointer flex flex-col justify-between gap-5 group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-[#FAF9F5] border border-gray-100 flex items-center justify-center text-gray-700 font-black text-base group-hover:bg-[#D14923] group-hover:text-white transition duration-300">
                      {tech.full_name[0].toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 group-hover:text-[#D14923] transition">
                        {tech.full_name}
                      </h3>
                      <p className="text-xs text-gray-400 font-mono mt-0.5">{tech.employee_code}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 border-t border-b border-gray-100 py-3 text-center">
                    <div>
                      <span className="block text-lg font-black text-gray-950 leading-none">{stats.openWorkOrders}</span>
                      <span className="text-[9px] text-gray-400 uppercase tracking-wider font-semibold mt-1 block">WOs</span>
                    </div>
                    <div>
                      <span className="block text-lg font-black text-gray-950 leading-none">{stats.openInspections}</span>
                      <span className="text-[9px] text-gray-400 uppercase tracking-wider font-semibold mt-1 block">Insps</span>
                    </div>
                    <div>
                      <span className="block text-lg font-black text-gray-950 leading-none">{stats.queriesToday}</span>
                      <span className="text-[9px] text-gray-400 uppercase tracking-wider font-semibold mt-1 block">Queries</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-gray-500 font-medium">
                    <span>Last Active:</span>
                    <span className="font-semibold text-gray-800">{stats.lastActive}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Grid for Activity Feed & Voice Monitor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* 5. Recent Activity Feed */}
        <section className="lg:col-span-5 bg-white border border-gray-200 rounded-3xl shadow-sm overflow-hidden flex flex-col h-[480px]">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-extrabold text-gray-950 text-base flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-500" />
              Recent Activity Feed
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-4 divide-y divide-gray-50">
            {data.activityLogs.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm py-12">
                No Recent Activity
              </div>
            ) : (
              data.activityLogs.map((log, i) => {
                const tech = techniciansMap.get(log.user_id);
                return (
                  <div key={log.id} className={`pt-4 ${i === 0 ? "pt-0" : ""} flex gap-3.5`}>
                    <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-extrabold text-xs flex-shrink-0">
                      {tech?.full_name?.[0]?.toUpperCase() ?? "T"}
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-xs text-gray-900 leading-tight">
                        <span className="font-bold">{tech?.full_name ?? "Technician"}</span>{" "}
                        <span className="text-gray-500">performed</span>{" "}
                        <span className="font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded px-1.5 py-0.5 text-[9px] uppercase tracking-wider">{log.action_type}</span>
                      </p>
                      <p className="text-xs text-gray-600 font-medium">{log.description}</p>
                      <span className="text-[10px] text-gray-400 block font-medium">
                        {getRelativeTime(log.created_at)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* 6. Voice Interaction Monitoring */}
        <section className="lg:col-span-7 bg-white border border-gray-200 rounded-3xl shadow-sm overflow-hidden flex flex-col h-[480px]">
          <div className="p-5 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="font-extrabold text-gray-950 text-base flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-[#D14923]" />
              Voice Interaction Monitoring
            </h2>

            {/* Micro Filters for transcripts */}
            <div className="flex items-center gap-2">
              {/* Period Select tabs */}
              <div className="flex bg-gray-100 p-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider text-gray-600">
                <button
                  onClick={() => setVoicePeriod("all")}
                  className={`px-2.5 py-1 rounded-md transition ${voicePeriod === "all" ? "bg-white text-gray-900 shadow-sm" : "hover:text-gray-900"}`}
                >
                  All
                </button>
                <button
                  onClick={() => setVoicePeriod("today")}
                  className={`px-2.5 py-1 rounded-md transition ${voicePeriod === "today" ? "bg-white text-gray-900 shadow-sm" : "hover:text-gray-900"}`}
                >
                  Today
                </button>
                <button
                  onClick={() => setVoicePeriod("week")}
                  className={`px-2.5 py-1 rounded-md transition ${voicePeriod === "week" ? "bg-white text-gray-900 shadow-sm" : "hover:text-gray-900"}`}
                >
                  Week
                </button>
              </div>

              {/* Technician Dropdown */}
              <select
                value={voiceTechFilter}
                onChange={e => setVoiceTechFilter(e.target.value)}
                className="px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none"
              >
                <option value="all">All Techs</option>
                {data.technicians.map(t => (
                  <option key={t.id} value={t.id}>{t.full_name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4 divide-y divide-gray-50">
            {filteredVoiceTranscripts.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm py-12">
                No Voice Interactions Recorded
              </div>
            ) : (
              filteredVoiceTranscripts.map((t, i) => {
                const tech = techniciansMap.get(t.user_id);
                return (
                  <div key={t.id} className={`pt-4 ${i === 0 ? "pt-0" : ""} space-y-2.5`}>
                    <div className="flex justify-between items-center text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                      <span>Technician: <strong className="text-gray-800">{tech?.full_name ?? "Unknown"}</strong></span>
                      <span>{getRelativeTime(t.created_at)}</span>
                    </div>
                    <div className="space-y-1.5">
                      <div className="bg-[#FAF9F5] border border-gray-100 p-3 rounded-2xl flex gap-2">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest w-12 flex-shrink-0">Prompt</span>
                        <p className="text-sm font-bold text-gray-900 leading-normal">{t.user_prompt}</p>
                      </div>
                      <div className="bg-[#D14923]/5 border border-[#D14923]/10 p-3 rounded-2xl flex gap-2">
                        <span className="text-[10px] font-black text-[#D14923]/60 uppercase tracking-widest w-12 flex-shrink-0">Agent</span>
                        <p className="text-sm text-gray-700 leading-normal font-medium">{t.agent_response}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

      </div>

      {/* 7. Work Orders Management Table */}
      <section className="bg-white border border-gray-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-extrabold text-gray-950 text-base flex items-center gap-2">
            <Wrench className="w-5 h-5 text-blue-500" />
            Work Orders Management
          </h2>
          <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
            {filteredWorkOrders.length} Total
          </span>
        </div>

        {filteredWorkOrders.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">
            No Active Work Orders
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FAF9F5] border-b border-gray-100 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                  <th className="p-4 px-6">WO Number</th>
                  <th className="p-4 px-6">Equipment</th>
                  <th className="p-4 px-6">Title</th>
                  <th className="p-4 px-6">Priority</th>
                  <th className="p-4 px-6">Status</th>
                  <th className="p-4 px-6">Assigned Tech</th>
                  <th className="p-4 px-6">Created Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredWorkOrders.map(wo => {
                  const equip = equipmentMap.get(wo.equipment_id);
                  const tech = wo.assigned_to ? techniciansMap.get(wo.assigned_to) : null;
                  return (
                    <tr key={wo.id} className="hover:bg-[#FAF9F5]/50 transition duration-150 text-sm">
                      <td className="p-4 px-6 font-bold text-gray-900">{wo.work_order_number}</td>
                      <td className="p-4 px-6 font-semibold text-gray-800">{equip ? equip.equipment_code : "Unknown"}</td>
                      <td className="p-4 px-6 text-gray-600 max-w-xs truncate" title={wo.title}>{wo.title}</td>
                      <td className="p-4 px-6">
                        <span className={`inline-flex text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                          wo.priority === "CRITICAL" || wo.priority === "HIGH"
                            ? "bg-red-50 text-red-700 border-red-100"
                            : "bg-blue-50 text-blue-700 border-blue-100"
                        }`}>
                          {wo.priority}
                        </span>
                      </td>
                      <td className="p-4 px-6">
                        <span className={`inline-flex text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                          wo.status === "CLOSED"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                            : wo.status === "IN_PROGRESS"
                            ? "bg-orange-50 text-orange-700 border-orange-100"
                            : "bg-gray-100 text-gray-700 border-gray-200"
                        }`}>
                          {wo.status}
                        </span>
                      </td>
                      <td className="p-4 px-6 font-semibold text-gray-800">
                        {tech ? tech.full_name : "Unassigned"}
                      </td>
                      <td className="p-4 px-6 text-xs text-gray-500">
                        <FormattedDate date={wo.created_at} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 8. Inspections Overview Table */}
      <section className="bg-white border border-gray-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-extrabold text-gray-950 text-base flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-amber-500" />
            Inspections Overview
          </h2>
          <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
            {filteredInspections.length} Total
          </span>
        </div>

        {filteredInspections.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">
            No Inspections Recorded
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FAF9F5] border-b border-gray-100 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                  <th className="p-4 px-6">Equipment</th>
                  <th className="p-4 px-6">Title</th>
                  <th className="p-4 px-6">Severity</th>
                  <th className="p-4 px-6">Status</th>
                  <th className="p-4 px-6">Technician</th>
                  <th className="p-4 px-6">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredInspections.map(insp => {
                  const equip = equipmentMap.get(insp.equipment_id);
                  const tech = techniciansMap.get(insp.technician_id);
                  return (
                    <tr key={insp.id} className="hover:bg-[#FAF9F5]/50 transition duration-150 text-sm">
                      <td className="p-4 px-6 font-bold text-gray-900">{equip ? equip.equipment_code : "Unknown"}</td>
                      <td className="p-4 px-6 text-gray-600 max-w-xs truncate" title={insp.title}>{insp.title}</td>
                      <td className="p-4 px-6">
                        <span className={`inline-flex text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                          insp.severity === "CRITICAL" || insp.severity === "HIGH"
                            ? "bg-red-50 text-red-700 border-red-100"
                            : insp.severity === "MEDIUM"
                            ? "bg-orange-50 text-orange-700 border-orange-100"
                            : "bg-blue-50 text-blue-700 border-blue-100"
                        }`}>
                          {insp.severity}
                        </span>
                      </td>
                      <td className="p-4 px-6">
                        <span className={`inline-flex text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                          insp.status === "CLOSED"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                            : insp.status === "REVIEWED"
                            ? "bg-blue-50 text-blue-700 border-blue-100"
                            : "bg-orange-50 text-orange-700 border-orange-100"
                        }`}>
                          {insp.status}
                        </span>
                      </td>
                      <td className="p-4 px-6 font-semibold text-gray-800">
                        {tech ? tech.full_name : "Unknown"}
                      </td>
                      <td className="p-4 px-6 text-xs text-gray-500">
                        <FormattedDate date={insp.created_at} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Grid for Equipment requiring attention & Offline sync status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* 9. Equipment Requiring Attention */}
        <section className="bg-white border border-gray-200 rounded-3xl shadow-sm overflow-hidden flex flex-col h-[350px]">
          <div className="p-5 border-b border-gray-100">
            <h2 className="font-extrabold text-gray-950 text-base flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-600" />
              Equipment Requiring Attention
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {equipmentRequiringAttention.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                No equipment requires attention.
              </div>
            ) : (
              equipmentRequiringAttention.map(item => (
                <div key={item.equipment.id} className="bg-[#FAF9F5] border border-gray-100 rounded-2xl p-4 flex items-center justify-between hover:border-amber-300 transition duration-200">
                  <div className="space-y-1">
                    <h3 className="font-black text-gray-900 text-sm">{item.equipment.name} ({item.equipment.equipment_code})</h3>
                    <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">{item.equipment.location}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    {item.alertsCount > 0 && (
                      <span className="text-[10px] font-bold text-red-700 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">
                        {item.alertsCount} Alert{item.alertsCount > 1 ? "s" : ""}
                      </span>
                    )}
                    {item.openWorkOrders > 0 && (
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">
                        {item.openWorkOrders} Open WO{item.openWorkOrders > 1 ? "s" : ""}
                      </span>
                    )}
                    {item.repeatedFailures && (
                      <span className="text-[10px] font-bold text-orange-700 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-full">
                        Repeated Failures ({item.failuresCount} repairs)
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* 11. Offline Sync Monitoring (Using custom component) */}
        <section className="h-[350px]">
          <OfflineSyncSection />
        </section>

      </div>

      {/* ───────── SELECTED TECHNICIAN MODAL ───────── */}
      {selectedTechnician && (() => {
        const stats = getTechStats(selectedTechnician.id);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/50 backdrop-blur-xs p-4 md:p-0 transition-opacity">
            {/* Backdrop click to close */}
            <div className="absolute inset-0" onClick={() => setSelectedTechnician(null)} />
            
            {/* Sliding Panel */}
            <div className="relative w-full max-w-2xl bg-white h-full md:rounded-l-3xl shadow-2xl flex flex-col z-10 animate-slide-in overflow-hidden border-l border-gray-200">
              
              {/* Header */}
              <div className="p-6 border-b border-gray-100 bg-[#FAF9F5] flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#D14923] flex items-center justify-center text-white font-black text-lg shadow-sm border border-white">
                    {selectedTechnician.full_name[0].toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">{selectedTechnician.full_name}</h2>
                    <p className="text-xs text-gray-400 font-mono tracking-tight mt-0.5">{selectedTechnician.employee_code}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedTechnician(null)}
                  className="w-9 h-9 rounded-full bg-white hover:bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-900 shadow-sm transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Panel Content (Scrollable) */}
              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                
                {/* Profile detail cards */}
                <div className="bg-[#FAF9F5] border border-gray-100 rounded-2xl p-5 space-y-3">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Technician Profile</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm font-medium">
                    <div>
                      <span className="text-[10px] text-gray-400 block uppercase font-bold tracking-wider">Email</span>
                      <span className="text-gray-900">{selectedTechnician.email}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block uppercase font-bold tracking-wider">Role</span>
                      <span className="text-[#D14923] font-bold uppercase tracking-wider">{selectedTechnician.role}</span>
                    </div>
                  </div>
                </div>

                {/* Current Work Orders */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-blue-500" />
                    Current Work Orders
                  </h3>
                  {stats.workOrders.length === 0 ? (
                    <p className="text-sm text-gray-400">No work orders assigned.</p>
                  ) : (
                    <div className="border border-gray-200 rounded-2xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#FAF9F5] text-gray-400 font-bold uppercase tracking-wider border-b border-gray-100">
                          <tr>
                            <th className="p-3 px-4">WO Number</th>
                            <th className="p-3 px-4">Priority</th>
                            <th className="p-3 px-4">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {stats.workOrders.map(wo => (
                            <tr key={wo.id} className="hover:bg-gray-50/50">
                              <td className="p-3 px-4 font-bold text-gray-900">{wo.work_order_number}</td>
                              <td className="p-3 px-4">
                                <span className="text-[9px] font-bold uppercase text-red-600">{wo.priority}</span>
                              </td>
                              <td className="p-3 px-4 text-gray-500">{wo.status}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Current Inspections */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-amber-500" />
                    Current Inspections
                  </h3>
                  {stats.inspections.length === 0 ? (
                    <p className="text-sm text-gray-400">No inspections created.</p>
                  ) : (
                    <div className="border border-gray-200 rounded-2xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#FAF9F5] text-gray-400 font-bold uppercase tracking-wider border-b border-gray-100">
                          <tr>
                            <th className="p-3 px-4">Title</th>
                            <th className="p-3 px-4">Severity</th>
                            <th className="p-3 px-4">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {stats.inspections.map(insp => (
                            <tr key={insp.id} className="hover:bg-gray-50/50">
                              <td className="p-3 px-4 font-semibold text-gray-950 truncate max-w-[180px]" title={insp.title}>{insp.title}</td>
                              <td className="p-3 px-4">
                                <span className="text-[9px] font-bold uppercase text-orange-600">{insp.severity}</span>
                              </td>
                              <td className="p-3 px-4 text-gray-500">{insp.status}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Recent Activity */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <Activity className="w-4 h-4 text-indigo-500" />
                    Recent Activity
                  </h3>
                  {stats.activity.length === 0 ? (
                    <p className="text-sm text-gray-400">No activity logged.</p>
                  ) : (
                    <div className="space-y-3">
                      {stats.activity.slice(0, 5).map(log => (
                        <div key={log.id} className="text-xs bg-gray-50 border border-gray-100 rounded-xl p-3 flex justify-between items-start gap-4">
                          <div>
                            <span className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded px-1.5 py-0.5 text-[9px] uppercase tracking-wider">{log.action_type}</span>
                            <p className="text-gray-700 mt-1.5 leading-normal">{log.description}</p>
                          </div>
                          <span className="text-[10px] text-gray-400 whitespace-nowrap">{getRelativeTime(log.created_at)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Voice History */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-[#D14923]" />
                    Voice History
                  </h3>
                  {stats.transcripts.length === 0 ? (
                    <p className="text-sm text-gray-400">No voice history recorded.</p>
                  ) : (
                    <div className="space-y-4">
                      {stats.transcripts.slice(0, 5).map(t => (
                        <div key={t.id} className="space-y-1.5 bg-[#FAF9F5] border border-gray-100 rounded-2xl p-4">
                          <span className="text-[9px] text-gray-400 uppercase tracking-widest font-semibold block">{getRelativeTime(t.created_at)}</span>
                          <div className="space-y-1">
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">User:</p>
                            <p className="text-sm text-gray-900 font-extrabold">{t.user_prompt}</p>
                          </div>
                          <div className="space-y-1 pt-2 border-t border-gray-200/50 mt-2">
                            <p className="text-xs text-[#D14923]/60 font-bold uppercase tracking-wider">Agent:</p>
                            <p className="text-xs text-gray-700 font-medium leading-relaxed">{t.agent_response}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

            </div>
          </div>
        );
      })()}
    </div>
  );
}