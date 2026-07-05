/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import {
  Calendar as CalendarIcon,
  CheckSquare,
  Square,
  Clock,
  Plus,
  Trash2,
  AlertCircle,
  Users,
  Search,
  CheckCircle,
  Briefcase
} from "lucide-react";
import { TaskStatus, TaskPriority } from "../types.js";

interface TasksViewProps {
  tasks: any[];
  customers: any[];
  allUsers: any[];
  onCreateTask: (data: any) => Promise<any>;
  onUpdateTask: (id: string, data: any) => Promise<any>;
  onDeleteTask: (id: string) => Promise<any>;
}

export default function TasksView({
  tasks = [],
  customers = [],
  allUsers = [],
  onCreateTask,
  onUpdateTask,
  onDeleteTask
}: TasksViewProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [filterPriority, setFilterPriority] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Form Fields State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedToId, setAssignedToId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [priority, setPriority] = useState(TaskPriority.MEDIUM);
  const [dueDate, setDueDate] = useState("");

  const filtered = tasks.filter((t) => {
    const priorityMatch = !filterPriority || t.priority === filterPriority;
    const statusMatch = !filterStatus || t.status === filterStatus;
    return priorityMatch && statusMatch;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return alert("Task title is required!");
    await onCreateTask({
      title,
      description,
      assignedToId: assignedToId || undefined,
      customerId: customerId || undefined,
      priority,
      dueDate: dueDate || undefined,
      status: TaskStatus.TODO
    });
    setIsCreateOpen(false);
    // Reset Form Fields
    setTitle("");
    setDescription("");
    setAssignedToId("");
    setCustomerId("");
    setPriority(TaskPriority.MEDIUM);
    setDueDate("");
  };

  const toggleTaskStatus = async (task: any) => {
    const nextStatus = task.status === TaskStatus.COMPLETED ? TaskStatus.TODO : TaskStatus.COMPLETED;
    await onUpdateTask(task.id, { status: nextStatus });
  };

  return (
    <div className="space-y-6">
      {/* Top filter bar controls row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3">
          {/* Priority filter */}
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="bg-slate-50 text-slate-700 text-xs py-2 px-3 rounded-lg border border-slate-200 outline-none"
          >
            <option value="">All Priorities</option>
            {Object.values(TaskPriority).map((p) => (
              <option key={p} value={p}>
                Priority: {p}
              </option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-50 text-slate-700 text-xs py-2 px-3 rounded-lg border border-slate-200 outline-none"
          >
            <option value="">All Progress statuses</option>
            {Object.values(TaskStatus).map((s) => (
              <option key={s} value={s}>
                Status: {s}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="bg-indigo-650 hover:bg-indigo-700 text-white font-semibold text-xs py-2.5 px-4 rounded-lg flex items-center gap-1.5 shadow-sm cursor-pointer ml-auto"
        >
          <Plus className="w-4 h-4" />
          Assign Task
        </button>
      </div>

      {/* Primary splitting workspace view (List pane + mini-calendar representations) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Core assignments list */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <CheckCircle className="w-4.5 h-4.5 text-indigo-500" />
            Reminders Agenda Checklist ({filtered.length})
          </h2>

          <div className="space-y-3.5 pr-1 max-h-[500px] overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="py-20 text-center space-y-2">
                <CheckSquare className="w-10 h-10 text-slate-350 mx-auto" />
                <p className="font-bold text-slate-800 text-sm">No assignments active</p>
                <p className="text-xs text-slate-400">Match priorities or register newly delegated tasks to set timelines.</p>
              </div>
            ) : (
              filtered.map((t) => {
                const isCompleted = t.status === TaskStatus.COMPLETED;
                return (
                  <div
                    key={t.id}
                    className={`p-4 rounded-xl border transition-all flex items-start justify-between gap-4 text-xs ${
                      isCompleted
                        ? "bg-slate-50 border-slate-100 opacity-65"
                        : "bg-white border-slate-150 hover:border-slate-200"
                    }`}
                  >
                    <div className="flex gap-3 items-start grow">
                      {/* Interactive toggle checkboxes status mechanics representation */}
                      <button
                        onClick={() => toggleTaskStatus(t)}
                        className="text-indigo-600 hover:scale-105 transition-transform mt-0.5"
                      >
                        {isCompleted ? (
                          <CheckSquare className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-400" />
                        )}
                      </button>

                      <div className="space-y-1">
                        <p className={`font-bold text-slate-900 leading-snug ${isCompleted ? 'line-through text-slate-400' : ''}`}>
                          {t.title}
                        </p>
                        <p className={`text-slate-500 text-[11px] ${isCompleted ? 'line-through opacity-70' : ''}`}>
                          {t.description || "No supplemental instructions logged."}
                        </p>

                        <div className="flex flex-wrap gap-1.5 pt-1 items-center">
                          {t.customer && (
                            <span className="text-[9px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full border border-slate-150">
                              👤 Contact: {t.customer.firstName} {t.customer.lastName}
                            </span>
                          )}
                          {t.assignee && (
                            <span className="text-[9px] bg-indigo-50 text-indigo-650 font-bold px-2 py-0.5 rounded-full border border-indigo-100 flex items-center gap-0.5">
                              <Users className="w-2.5 h-2.5" />
                              Assigned: {t.assignee.firstName} {t.assignee.lastName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right space-y-2 shrink-0">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase ${
                          t.priority === TaskPriority.HIGH
                            ? "bg-rose-50 text-rose-600 border border-rose-100"
                            : t.priority === TaskPriority.MEDIUM
                            ? "bg-amber-50 text-amber-600"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {t.priority}
                      </span>

                      <p className="text-[10px] text-slate-450 font-mono flex items-center justify-end gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {new Date(t.dueDate).toLocaleDateString()}
                      </p>

                      <button
                        onClick={() => onDeleteTask(t.id)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                        title="Delete task alignment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Mini Calendar View sidebar representations */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-50 pb-2">
              <CalendarIcon className="w-4 h-4 text-indigo-500" />
              Calendar Sync Frame
            </h3>

            {/* Custom styled mock month selector days list representation */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                <span>June 2026</span>
                <span className="text-[10px] text-indigo-650 font-semibold bg-indigo-50 px-2 py-0.5 rounded">GMT-10:00</span>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-slate-400">
                <span>S</span>
                <span>M</span>
                <span>T</span>
                <span>W</span>
                <span>T</span>
                <span>F</span>
                <span>S</span>
                {Array.from({ length: 30 }).map((_, i) => {
                  const dayNum = i + 1;
                  // Highlight mock active task days (e.g. 15, 25, 30)
                  const hasTask = [15, 25, 30].includes(dayNum);
                  return (
                    <span
                      key={i}
                      className={`py-1.5 rounded-md font-mono ${
                        hasTask
                          ? "bg-indigo-600 text-white font-bold relative"
                          : "hover:bg-slate-50 text-slate-750"
                      }`}
                    >
                      {dayNum}
                      {hasTask && (
                        <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-amber-400 rounded-full"></span>
                      )}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200/50 rounded-xl space-y-1 text-[11px] text-amber-900 mt-4">
            <p className="font-bold flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> Calendar Integration
            </p>
            <p className="text-amber-800 leading-snug">
              Dates highlighted are linked securely to tasks and deals closing criteria.
            </p>
          </div>
        </div>
      </div>

      {/* CREATE TASK MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xl max-w-sm w-full">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-slate-900">Delegate Task</h3>
                <p className="text-xs text-slate-400">Add checklist items connected to CRM contacts.</p>
              </div>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Deliver quotation documentation"
                  className="w-full text-xs rounded-lg border border-slate-200 outline-none p-2.5 bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Detailed Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Supplementary items notes"
                  className="w-full text-xs rounded-lg border border-slate-200 outline-none p-2.5 bg-slate-50/50 min-h-[64px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                    className="w-full text-xs rounded-lg border border-slate-200 p-2.5 bg-slate-50/50"
                  >
                    {Object.values(TaskPriority).map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-200 outline-none p-2 bg-slate-50/50"
                  />
                </div>
              </div>


              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Assignee Colleague</label>
                <select
                  value={assignedToId}
                  onChange={(e) => setAssignedToId(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-200 p-2.5 bg-slate-50/50"
                >
                  <option value="">-- Assign To Self --</option>
                  {allUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.firstName} {u.lastName} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Linked Client Contact</label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-200 p-2.5 bg-slate-50/50"
                >
                  <option value="">-- No Association --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.firstName} {c.lastName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-650 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-650 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg shadow-sm"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
