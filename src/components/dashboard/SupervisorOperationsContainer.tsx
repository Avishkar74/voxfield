"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Wrench,
  MessageSquare,
  History,
  AlertTriangle,
  Users,
  Search,
  Trash2,
  Loader2,
  Calendar,
  SlidersHorizontal,
  RefreshCw,
  Clock,
  Layers,
  ArrowUpDown,
  FileCheck,
  Package,
  AlertOctagon
} from "lucide-react";
import type {
  User,
  WorkOrder,
  Transcript,
  ActivityLog,
  QuantityLog,
  ErrorLog
} from "@/types/database";
import { FormattedDate } from "./FormattedDate";

interface SupervisorOperationsContainerProps {
  initialData: {
    user: {
      id: string;
      fullName?: string | null;
      email: string;
      role: string;
      employeeCode?: string;
    };
    workOrders: WorkOrder[];
    transcripts: Transcript[];
    quantityLogs: QuantityLog[];
    errorLogs: ErrorLog[];
    activityLogs: ActivityLog[];
    technicians: User[];
  };
}

export function SupervisorOperationsContainer({ initialData }: SupervisorOperationsContainerProps) {
  const [data, setData] = useState(initialData);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Active section tab (Work Orders | Transcriptions | Inventory | Errors | Activities | Technicians)
  const [activeSection, setActiveSection] = useState<"work_orders" | "transcripts" | "inventory" | "errors" | "activities" | "technicians">("work_orders");

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterUser, setFilterUser] = useState("all");
  const [filterAsset, setFilterAsset] = useState("");
  const [filterWorkOrder, setFilterWorkOrder] = useState("");
  const [filterErrorType, setFilterErrorType] = useState("all");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Sort direction state
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Rolling window updater helper
  const updateRollingList = (currentList: any[], newItems: any[]) => {
    const merged = [...newItems, ...currentList];
    const uniqueMap = new Map(merged.map(item => [item.id, item]));
    const uniqueList = Array.from(uniqueMap.values());
    
    uniqueList.sort((a, b) => {
      const timeA = new Date(a.created_at || a.timestamp || 0).getTime();
      const timeB = new Date(b.created_at || b.timestamp || 0).getTime();
      return sortDirection === "desc" ? timeB - timeA : timeA - timeB;
    });

    return uniqueList.slice(0, 50);
  };

  // Poll for new records every 10 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/dashboard/supervisor/operations");
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setData(prev => ({
              ...prev,
              workOrders: updateRollingList(prev.workOrders, json.data.workOrders),
              transcripts: updateRollingList(prev.transcripts, json.data.transcripts),
              quantityLogs: updateRollingList(prev.quantityLogs, json.data.quantityLogs),
              errorLogs: updateRollingList(prev.errorLogs, json.data.errorLogs),
              activityLogs: updateRollingList(prev.activityLogs, json.data.activityLogs),
              technicians: json.data.technicians || prev.technicians, // Always overwrite tech roster
            }));
          }
        }
      } catch (err) {
        console.error("Operations auto-refresh polling failed:", err);
      }
    }, 10000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortDirection]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/dashboard/supervisor/operations");
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setData(json.data);
        }
      }
    } catch (err) {
      console.error("Operations manual refresh failed:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Technician deletion handler
  const handleDeleteTechnician = async (techId: string) => {
    setIsDeleting(techId);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/technicians/${techId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        // Remove technician from state locally
        setData(prev => ({
          ...prev,
          technicians: prev.technicians.filter(t => t.id !== techId),
          // Re-filter lists since cascade delete will remove child objects on DB
          workOrders: prev.workOrders.filter(w => w.created_by !== techId && w.assigned_to !== techId),
          transcripts: prev.transcripts.filter(t => t.user_id !== techId),
          quantityLogs: prev.quantityLogs.filter(q => q.user_id !== techId),
          activityLogs: prev.activityLogs.filter(a => a.user_id !== techId)
        }));
        setConfirmDeleteId(null);
      } else {
        const json = await res.json();
        setDeleteError(json.error || "Failed to remove technician");
      }
    } catch (err: any) {
      setDeleteError(err.message || "Network error occurred");
    } finally {
      setIsDeleting(null);
    }
  };

  // Compile list of unique users & error types for dropdown filtering
  const allUsersMap = useMemo(() => {
    const users = new Map<string, string>();
    data.technicians.forEach(t => users.set(t.id, t.full_name));
    return users;
  }, [data.technicians]);

  const allErrorTypes = useMemo(() => {
    const types = new Set<string>();
    data.errorLogs.forEach(e => types.add(e.error_type));
    return Array.from(types);
  }, [data.errorLogs]);

  // Client-side filtering & sorting logic
  const filteredWorkOrders = useMemo(() => {
    let list = [...data.workOrders];
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      list = list.filter(w => 
        w.work_order_number.toLowerCase().includes(query) || 
        w.title.toLowerCase().includes(query) ||
        w.description.toLowerCase().includes(query)
      );
    }
    if (filterUser !== "all") {
      list = list.filter(w => w.assigned_to === filterUser || w.created_by === filterUser);
    }
    if (filterAsset) {
      const asset = filterAsset.toLowerCase();
      list = list.filter(w => w.equipment_id.toLowerCase().includes(asset));
    }
    if (filterWorkOrder) {
      const woNum = filterWorkOrder.toLowerCase();
      list = list.filter(w => w.work_order_number.toLowerCase().includes(woNum));
    }
    if (startDate) {
      list = list.filter(w => new Date(w.created_at) >= new Date(startDate));
    }
    if (endDate) {
      list = list.filter(w => new Date(w.created_at) <= new Date(endDate));
    }
    
    // Sort
    list.sort((a, b) => {
      const timeA = new Date(a.created_at).getTime();
      const timeB = new Date(b.created_at).getTime();
      return sortDirection === "desc" ? timeB - timeA : timeA - timeB;
    });

    return list.slice(0, 50);
  }, [data.workOrders, searchQuery, filterUser, filterAsset, filterWorkOrder, startDate, endDate, sortDirection]);

  const filteredTranscripts = useMemo(() => {
    let list = [...data.transcripts];
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      list = list.filter(t => 
        t.user_prompt.toLowerCase().includes(query) || 
        t.agent_response.toLowerCase().includes(query) ||
        t.session_id.toLowerCase().includes(query)
      );
    }
    if (filterUser !== "all") {
      list = list.filter(t => t.user_id === filterUser);
    }
    if (startDate) {
      list = list.filter(t => new Date(t.created_at) >= new Date(startDate));
    }
    if (endDate) {
      list = list.filter(t => new Date(t.created_at) <= new Date(endDate));
    }
    
    // Sort
    list.sort((a, b) => {
      const timeA = new Date(a.created_at).getTime();
      const timeB = new Date(b.created_at).getTime();
      return sortDirection === "desc" ? timeB - timeA : timeA - timeB;
    });

    return list.slice(0, 50);
  }, [data.transcripts, searchQuery, filterUser, startDate, endDate, sortDirection]);

  const filteredQuantityLogs = useMemo(() => {
    let list = [...data.quantityLogs];
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      list = list.filter(q => 
        q.asset_item.toLowerCase().includes(query) || 
        q.source_action.toLowerCase().includes(query)
      );
    }
    if (filterUser !== "all") {
      list = list.filter(q => q.user_id === filterUser);
    }
    if (filterAsset) {
      const asset = filterAsset.toLowerCase();
      list = list.filter(q => q.asset_item.toLowerCase().includes(asset));
    }
    if (startDate) {
      list = list.filter(q => new Date(q.timestamp) >= new Date(startDate));
    }
    if (endDate) {
      list = list.filter(q => new Date(q.timestamp) <= new Date(endDate));
    }
    
    // Sort
    list.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return sortDirection === "desc" ? timeB - timeA : timeA - timeB;
    });

    return list.slice(0, 50);
  }, [data.quantityLogs, searchQuery, filterUser, filterAsset, startDate, endDate, sortDirection]);

  const filteredErrorLogs = useMemo(() => {
    let list = [...data.errorLogs];
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      list = list.filter(e => 
        e.error_message.toLowerCase().includes(query) || 
        e.component_service.toLowerCase().includes(query)
      );
    }
    if (filterErrorType !== "all") {
      list = list.filter(e => e.error_type === filterErrorType);
    }
    if (filterSeverity !== "all") {
      list = list.filter(e => e.severity === filterSeverity);
    }
    if (startDate) {
      list = list.filter(e => new Date(e.timestamp) >= new Date(startDate));
    }
    if (endDate) {
      list = list.filter(e => new Date(e.timestamp) <= new Date(endDate));
    }
    
    // Sort
    list.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return sortDirection === "desc" ? timeB - timeA : timeA - timeB;
    });

    return list.slice(0, 50);
  }, [data.errorLogs, searchQuery, filterErrorType, filterSeverity, startDate, endDate, sortDirection]);

  const filteredActivityLogs = useMemo(() => {
    let list = [...data.activityLogs];
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      list = list.filter(a => 
        a.action_type.toLowerCase().includes(query) || 
        (a.description && a.description.toLowerCase().includes(query))
      );
    }
    if (filterUser !== "all") {
      list = list.filter(a => a.user_id === filterUser);
    }
    if (startDate) {
      list = list.filter(a => new Date(a.created_at) >= new Date(startDate));
    }
    if (endDate) {
      list = list.filter(a => new Date(a.created_at) <= new Date(endDate));
    }
    
    // Sort
    list.sort((a, b) => {
      const timeA = new Date(a.created_at).getTime();
      const timeB = new Date(b.created_at).getTime();
      return sortDirection === "desc" ? timeB - timeA : timeA - timeB;
    });

    return list.slice(0, 50);
  }, [data.activityLogs, searchQuery, filterUser, startDate, endDate, sortDirection]);

  const filteredTechnicians = useMemo(() => {
    let list = [...data.technicians];
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      list = list.filter(t => 
        t.full_name.toLowerCase().includes(query) || 
        t.employee_code.toLowerCase().includes(query) ||
        t.email.toLowerCase().includes(query)
      );
    }
    return list;
  }, [data.technicians, searchQuery]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-gray-900">System Operations Control</h2>
          <p className="text-xs text-gray-500 font-medium tracking-wide uppercase mt-1">
            Real-time audit log & technician management
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-50 border border-gray-200 hover:border-gray-300 text-gray-700 hover:text-gray-900 rounded-2xl text-xs font-semibold shadow-sm transition-all duration-200 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>Refresh Roster</span>
          </button>
          <div className="flex items-center space-x-2 bg-emerald-50 border border-emerald-100 rounded-2xl px-3.5 py-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest">
              Live Monitor Active
            </span>
          </div>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex border-b border-gray-200 gap-1 overflow-x-auto pb-1">
        {[
          { id: "work_orders", label: "Work Orders", icon: Wrench },
          { id: "transcripts", label: "Transcriptions", icon: MessageSquare },
          { id: "inventory", label: "Quantity Logs", icon: Package },
          { id: "errors", label: "Error Logs", icon: AlertTriangle },
          { id: "activities", label: "Activity Logs", icon: History },
          { id: "technicians", label: "Technician Roster", icon: Users }
        ].map(t => {
          const Icon = t.icon;
          const isActive = activeSection === t.id;
          return (
            <button
              key={t.id}
              onClick={() => {
                setActiveSection(t.id as any);
                setSearchQuery(""); // Clear search on tab switch
              }}
              className={`flex items-center space-x-2 px-4 py-3 border-b-2 text-xs font-bold transition-all duration-200 whitespace-nowrap ${
                isActive
                  ? "border-[#D14923] text-[#D14923]"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Filter panel */}
      <div className="bg-white border border-gray-200 rounded-3xl p-5 md:p-6 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 text-gray-500">
          <SlidersHorizontal className="w-4 h-4 text-[#D14923]" />
          <span className="text-xs font-bold uppercase tracking-wider">Search and Filter Center</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {/* Universal Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search table content..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-medium focus:bg-white focus:ring-1 focus:ring-[#D14923] focus:border-[#D14923] transition outline-none"
            />
          </div>

          {/* User selector filter (hides for technicians tab) */}
          {activeSection !== "technicians" && activeSection !== "errors" && (
            <select
              value={filterUser}
              onChange={e => setFilterUser(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-medium focus:bg-white focus:ring-1 focus:ring-[#D14923] focus:border-[#D14923] transition outline-none"
            >
              <option value="all">All Personnel</option>
              {Array.from(allUsersMap.entries()).map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
          )}

          {/* Equipment/Asset filter */}
          {(activeSection === "work_orders" || activeSection === "inventory") && (
            <input
              type="text"
              placeholder="Filter by Asset/Item..."
              value={filterAsset}
              onChange={e => setFilterAsset(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-medium focus:bg-white focus:ring-1 focus:ring-[#D14923] focus:border-[#D14923] transition outline-none"
            />
          )}

          {/* Work Order filter */}
          {activeSection === "work_orders" && (
            <input
              type="text"
              placeholder="Filter by WO Number..."
              value={filterWorkOrder}
              onChange={e => setFilterWorkOrder(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-medium focus:bg-white focus:ring-1 focus:ring-[#D14923] focus:border-[#D14923] transition outline-none"
            />
          )}

          {/* Error Type selector */}
          {activeSection === "errors" && (
            <select
              value={filterErrorType}
              onChange={e => setFilterErrorType(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-medium focus:bg-white focus:ring-1 focus:ring-[#D14923] focus:border-[#D14923] transition outline-none"
            >
              <option value="all">All Error Types</option>
              {allErrorTypes.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          )}

          {/* Severity selector for error logs */}
          {activeSection === "errors" && (
            <select
              value={filterSeverity}
              onChange={e => setFilterSeverity(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-medium focus:bg-white focus:ring-1 focus:ring-[#D14923] focus:border-[#D14923] transition outline-none"
            >
              <option value="all">All Severities</option>
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
              <option value="CRITICAL">CRITICAL</option>
            </select>
          )}

          {/* Start Date */}
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase">From</span>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-medium outline-none"
            />
          </div>

          {/* End Date */}
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase">To</span>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-medium outline-none"
            />
          </div>

          {/* Sort Direction Toggle */}
          {activeSection !== "technicians" && (
            <button
              onClick={() => setSortDirection(prev => prev === "asc" ? "desc" : "asc")}
              className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold text-gray-700 hover:bg-gray-100 transition duration-200 outline-none"
            >
              <span>Sort: Timestamp</span>
              <div className="flex items-center gap-1 text-[#D14923]">
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span className="uppercase">{sortDirection}</span>
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Delete error feedback */}
      {deleteError && (
        <div className="bg-red-50 border border-red-100 text-red-600 rounded-2xl p-4 text-xs font-semibold">
          Error: {deleteError}
        </div>
      )}

      {/* Main tables rendering area */}
      <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm">
        {/* Render indicator of rolling buffer */}
        {activeSection !== "technicians" && (
          <div className="bg-amber-50/50 border-b border-gray-100 px-6 py-2.5 flex items-center space-x-2 text-amber-800 text-[10px] font-bold uppercase tracking-wider">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Displaying the most recent 50 records (rolling retention window)</span>
          </div>
        )}

        {/* 1. WORK ORDERS TABLE */}
        {activeSection === "work_orders" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/75 border-b border-gray-200 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Work Order ID</th>
                  <th className="px-6 py-4">Asset ID</th>
                  <th className="px-6 py-4">Title</th>
                  <th className="px-6 py-4">Assigned Tech</th>
                  <th className="px-6 py-4">Priority</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Created At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs text-gray-700 font-medium">
                {filteredWorkOrders.length > 0 ? (
                  filteredWorkOrders.map(w => (
                    <tr key={w.id} className="hover:bg-gray-50/50 transition">
                      <td className="px-6 py-4 font-bold text-[#D14923]">{w.work_order_number}</td>
                      <td className="px-6 py-4 font-semibold text-gray-800">{w.equipment_id}</td>
                      <td className="px-6 py-4 text-gray-600 max-w-xs truncate">{w.title}</td>
                      <td className="px-6 py-4">
                        {allUsersMap.get(w.assigned_to || "") || "Unassigned"}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          w.priority === "CRITICAL" ? "bg-red-100 text-red-800 border border-red-200" :
                          w.priority === "HIGH" ? "bg-orange-100 text-orange-800" :
                          w.priority === "MEDIUM" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"
                        }`}>
                          {w.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          w.status === "CLOSED" ? "bg-emerald-100 text-emerald-800" :
                          w.status === "IN_PROGRESS" ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-800"
                        }`}>
                          {w.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-400">
                        <FormattedDate date={w.created_at} />
                      </td>
                    </tr>
                  ))
                ) : (
                  <EmptyState colSpan={7} message="No work orders found matching the filter criteria." />
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 2. TRANSCIPTIONS TABLE */}
        {activeSection === "transcripts" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/75 border-b border-gray-200 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Technician</th>
                  <th className="px-6 py-4">User Prompt</th>
                  <th className="px-6 py-4">Agent Response</th>
                  <th className="px-6 py-4">Session ID</th>
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs text-gray-700 font-medium">
                {filteredTranscripts.length > 0 ? (
                  filteredTranscripts.map(t => (
                    <tr key={t.id} className="hover:bg-gray-50/50 transition">
                      <td className="px-6 py-4 font-bold text-gray-900">
                        {allUsersMap.get(t.user_id) || "Unknown User"}
                      </td>
                      <td className="px-6 py-4 italic text-gray-600 max-w-xs truncate" title={t.user_prompt}>
                        "{t.user_prompt}"
                      </td>
                      <td className="px-6 py-4 text-gray-800 max-w-sm truncate" title={t.agent_response}>
                        {t.agent_response}
                      </td>
                      <td className="px-6 py-4 font-mono text-gray-400 text-[10px]">{t.session_id}</td>
                      <td className="px-6 py-4 text-gray-400">
                        <FormattedDate date={t.created_at} />
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800">
                          COMPLETED
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <EmptyState colSpan={6} message="No voice transcriptions found matching the filter criteria." />
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 3. QUANTITY LOGS TABLE */}
        {activeSection === "inventory" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/75 border-b border-gray-200 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Asset/Item</th>
                  <th className="px-6 py-4">Previous Qty</th>
                  <th className="px-6 py-4">Updated Qty</th>
                  <th className="px-6 py-4">Change</th>
                  <th className="px-6 py-4">Performed By</th>
                  <th className="px-6 py-4">Source Action / Reference</th>
                  <th className="px-6 py-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs text-gray-700 font-medium">
                {filteredQuantityLogs.length > 0 ? (
                  filteredQuantityLogs.map(q => {
                    const diff = q.updated_quantity - q.previous_quantity;
                    return (
                      <tr key={q.id} className="hover:bg-gray-50/50 transition">
                        <td className="px-6 py-4 font-bold text-gray-900">{q.asset_item}</td>
                        <td className="px-6 py-4 font-mono text-gray-500">{q.previous_quantity}</td>
                        <td className="px-6 py-4 font-mono text-gray-800">{q.updated_quantity}</td>
                        <td className="px-6 py-4 font-mono font-bold">
                          <span className={diff < 0 ? "text-red-500" : "text-emerald-500"}>
                            {diff > 0 ? `+${diff}` : diff}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {allUsersMap.get(q.user_id) || "Unknown User"}
                        </td>
                        <td className="px-6 py-4 text-gray-500 italic max-w-xs truncate" title={q.source_action}>
                          {q.source_action}
                        </td>
                        <td className="px-6 py-4 text-gray-400">
                          <FormattedDate date={q.timestamp} />
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <EmptyState colSpan={7} message="No inventory/quantity logs found matching the filter criteria." />
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 4. ERROR LOGS TABLE */}
        {activeSection === "errors" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/75 border-b border-gray-200 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Error Type</th>
                  <th className="px-6 py-4">Component/Service</th>
                  <th className="px-6 py-4">Severity</th>
                  <th className="px-6 py-4">Error Message</th>
                  <th className="px-6 py-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs text-gray-700 font-medium">
                {filteredErrorLogs.length > 0 ? (
                  filteredErrorLogs.map(e => (
                    <tr key={e.id} className="hover:bg-gray-50/50 transition">
                      <td className="px-6 py-4 font-bold text-red-600">{e.error_type}</td>
                      <td className="px-6 py-4 font-mono text-gray-600 text-[11px]">{e.component_service}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold ${
                          e.severity === "CRITICAL" ? "bg-red-500 text-white animate-pulse" :
                          e.severity === "HIGH" ? "bg-red-100 text-red-800" :
                          e.severity === "MEDIUM" ? "bg-orange-100 text-orange-800" : "bg-gray-100 text-gray-800"
                        }`}>
                          {e.severity}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-800 max-w-sm truncate" title={e.error_message}>
                        {e.error_message}
                      </td>
                      <td className="px-6 py-4 text-gray-400">
                        <FormattedDate date={e.timestamp} />
                      </td>
                    </tr>
                  ))
                ) : (
                  <EmptyState colSpan={5} message="No error logs found matching the filter criteria." />
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 5. ACTIVITY LOGS TABLE */}
        {activeSection === "activities" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/75 border-b border-gray-200 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Action Type</th>
                  <th className="px-6 py-4">Entity Type</th>
                  <th className="px-6 py-4">Performed By</th>
                  <th className="px-6 py-4">Description</th>
                  <th className="px-6 py-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs text-gray-700 font-medium">
                {filteredActivityLogs.length > 0 ? (
                  filteredActivityLogs.map(a => (
                    <tr key={a.id} className="hover:bg-gray-50/50 transition">
                      <td className="px-6 py-4 font-bold text-gray-900">{a.action_type}</td>
                      <td className="px-6 py-4 font-semibold text-gray-500">{a.entity_type}</td>
                      <td className="px-6 py-4">
                        {allUsersMap.get(a.user_id) || "System Operator"}
                      </td>
                      <td className="px-6 py-4 text-gray-600 max-w-xs truncate" title={a.description || ""}>
                        {a.description || "-"}
                      </td>
                      <td className="px-6 py-4 text-gray-400">
                        <FormattedDate date={a.created_at} />
                      </td>
                    </tr>
                  ))
                ) : (
                  <EmptyState colSpan={5} message="No activity logs found matching the filter criteria." />
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 6. TECHNICIAN ROSTER TABLE */}
        {activeSection === "technicians" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/75 border-b border-gray-200 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Employee Code</th>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Created At</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs text-gray-700 font-medium">
                {filteredTechnicians.length > 0 ? (
                  filteredTechnicians.map(t => (
                    <tr key={t.id} className="hover:bg-gray-50/50 transition">
                      <td className="px-6 py-4 font-bold text-gray-900">{t.employee_code}</td>
                      <td className="px-6 py-4 font-semibold text-gray-800">{t.full_name}</td>
                      <td className="px-6 py-4 text-gray-500">{t.email}</td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-[#FAF0ED] text-[#D14923]">
                          {t.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-400">
                        <FormattedDate date={t.created_at} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        {confirmDeleteId === t.id ? (
                          <div className="flex items-center justify-end space-x-2">
                            <span className="text-[10px] font-bold text-red-500 mr-1">Confirm delete?</span>
                            <button
                              onClick={() => handleDeleteTechnician(t.id)}
                              disabled={isDeleting === t.id}
                              className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[10px] font-bold transition flex items-center gap-1 shadow-sm"
                            >
                              {isDeleting === t.id && <Loader2 className="w-3 h-3 animate-spin" />}
                              Yes
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-[10px] font-bold transition"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setConfirmDeleteId(t.id);
                              setDeleteError(null);
                            }}
                            className="inline-flex items-center space-x-1 px-3 py-1.5 border border-red-100 hover:border-red-200 bg-red-50/50 hover:bg-red-50 text-red-600 rounded-xl text-[10px] font-bold transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <EmptyState colSpan={6} message="No technicians found matching the search criteria." />
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ colSpan, message }: { colSpan: number; message: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-6 py-12 text-center text-gray-400">
        <div className="flex flex-col items-center justify-center space-y-2">
          <AlertOctagon className="w-8 h-8 text-gray-300" />
          <p className="font-semibold text-xs text-gray-500">{message}</p>
        </div>
      </td>
    </tr>
  );
}
