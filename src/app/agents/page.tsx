'use client';

import React, { useState } from 'react';
import { Header } from '@/components/layout/header';
import { REGISTERED_AGENTS } from '@/lib/agents/framework';
import { AgentDefinition } from '@/types/agent';
import { createApprovalRequest } from '@/lib/services/approvals';
import { logActivity } from '@/lib/services/activity-logs';
import {
  Bot,
  Sparkles,
  Search,
  Users,
  TrendingUp,
  Globe,
  BarChart,
  Play,
  CheckCircle2,
  AlertTriangle,
  Info
} from 'lucide-react';

const AGENT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'seo-agent': Search,
  'content-agent': Sparkles,
  'sales-agent': Users,
  'competitor-agent': TrendingUp,
  'website-agent': Globe,
  'business-analyst': BarChart,
};

export default function AgentsPage() {
  const [selectedAgent, setSelectedAgent] = useState<AgentDefinition>(REGISTERED_AGENTS[0]);
  const [testInput, setTestInput] = useState('Clear Magnetic Acrylic Photo Frame (5x7 inch)');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [approvalSent, setApprovalSent] = useState(false);


  async function handleRunAgent() {
    setRunning(true);
    setResult(null);
    setApprovalSent(false);

    try {
      const res = await fetch(`/api/agents/${selectedAgent.id}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: testInput, task_type: 'studio_task' }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setResult(data.output);
      } else {
        alert(data.error || 'Failed to execute agent task.');
      }
    } catch (err: any) {
      console.error('Agent execution error:', err);
      alert('Could not connect to agent API route.');
    } finally {
      setRunning(false);
    }
  }

  async function handleSendToApprovalGate() {
    if (!result) return;

    const res = await createApprovalRequest({
      action_type: selectedAgent.id === 'sales-agent' ? 'customer_message' : 'content_publish',
      title: `${selectedAgent.name} Proposed Output for "${testInput}"`,
      proposed_content: result,
      destination: selectedAgent.id === 'sales-agent' ? 'WhatsApp / Email Outbox' : 'Content Repository',
      agent_id: selectedAgent.id,
      risk_level: selectedAgent.id === 'sales-agent' ? 'high' : 'medium',
    });

    if (res.success) {
      await logActivity({
        entity_type: 'agent_task',
        entity_id: selectedAgent.id,
        action: 'sent_to_approval_gate',
        description: `${selectedAgent.name} routed proposed output to human approval queue`,
        actor_type: 'agent',
        actor_id: selectedAgent.id,
      });
      setApprovalSent(true);
    }
  }

  const Icon = AGENT_ICONS[selectedAgent.id] || Bot;

  return (
    <>
      <Header
        title="AI Agent Center & Task Engine"
        subtitle="Configured specialized autonomous agents with strict typed inputs and human verification gates"
      />

      <main className="p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Transparent Capability & Credential Status Notice */}
        <div className="p-4 rounded-xl bg-kria-card border border-kria-border flex items-start gap-3">
          <div className="p-2 rounded-lg bg-electric/10 text-electric-light mt-0.5">
            <Info className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">Agent Framework Status & Safety Constraints</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              In accordance with KRIA AI architectural standards, agent definitions are fully typed with structured schemas. Agents do not execute live external actions (sending WhatsApp messages, updating websites, launching ads) until explicitly approved in the Approval Center. Non-AI database operations continue functioning independently.
            </p>
          </div>
        </div>

        {/* Agent Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {REGISTERED_AGENTS.map((agent) => {
            const AgentIcon = AGENT_ICONS[agent.id] || Bot;
            const isSelected = selectedAgent.id === agent.id;

            return (
              <div
                key={agent.id}
                onClick={() => {
                  setSelectedAgent(agent);
                  setResult(null);
                  setApprovalSent(false);
                }}
                className={`p-5 rounded-xl cursor-pointer transition-all border flex flex-col justify-between ${
                  isSelected
                    ? 'bg-kria-card border-electric shadow-glow'
                    : 'bg-kria-card/70 border-kria-border hover:border-kria-600'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-2.5 rounded-lg ${isSelected ? 'bg-electric text-white' : 'bg-kria-surface text-slate-400'}`}>
                      <AgentIcon className="h-5 w-5" />
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {agent.category}
                    </span>
                  </div>

                  <h3 className="font-bold text-white text-sm">{agent.name}</h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                    {agent.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-kria-border/60">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1.5">
                    Core Capabilities
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {agent.capabilities.map((cap) => (
                      <span
                        key={cap}
                        className="text-[10px] px-2 py-0.5 rounded bg-kria-surface text-slate-300 border border-kria-border/40"
                      >
                        {cap}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Agent Execution & Schema Verification Sandbox */}
        <div className="p-6 rounded-xl bg-kria-card border border-kria-border shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-kria-border/70 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-electric/10 text-electric-light">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Execute Task: {selectedAgent.name}</h3>
                <p className="text-xs text-slate-400">Category: {selectedAgent.category} • Strict Typed Envelope</p>
              </div>
            </div>

            <button
              onClick={handleRunAgent}
              disabled={running}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-electric hover:bg-electric-dark text-white transition-colors shadow-glow disabled:opacity-50"
            >
              <Play className="h-3.5 w-3.5" />
              {running ? 'Processing Task...' : 'Run Agent Task'}
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Task Prompt / Reference Target
            </label>
            <input
              type="text"
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              placeholder="Specify product, URL, lead query or topic..."
              className="w-full px-3.5 py-2.5 rounded-lg bg-kria-850 border border-kria-border text-xs text-white focus:outline-none focus:border-electric"
            />
          </div>

          {!result && !running && (
            <div className="p-8 text-center border border-dashed border-kria-border/70 rounded-xl space-y-1.5">
              <Bot className="h-6 w-6 text-slate-500 mx-auto" />
              <p className="text-xs font-semibold text-slate-300">Ready for Execution</p>
              <p className="text-[11px] text-slate-500">
                Enter your target product or task parameters above and click &ldquo;Run Agent Task&rdquo; to generate structured outputs. No pre-baked history.
              </p>
            </div>
          )}

          {/* Structured Output Display */}
          {result && (
            <div className="mt-4 p-4 rounded-xl bg-kria-surface border border-kria-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">Structured Output & Verified Analysis</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">
                  Schema Validated
                </span>
              </div>

              {/* Reasoning Summary */}
              {result.reasoning_summary && (
                <div className="text-xs text-slate-300 bg-kria-850 p-3 rounded-lg border border-kria-border/60">
                  <strong className="text-white block mb-1">Brief Reasoning:</strong>
                  {result.reasoning_summary}
                </div>
              )}

              {/* Verified Facts vs Assumptions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-kria-850 border border-emerald-500/20">
                  <span className="font-bold text-emerald-400 block mb-1">✓ Verified Facts</span>
                  <ul className="list-disc list-inside text-slate-300 space-y-0.5">
                    {result.verified_facts?.map((fact: string, idx: number) => (
                      <li key={idx}>{fact}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-3 rounded-lg bg-kria-850 border border-amber-500/20">
                  <span className="font-bold text-amber-400 block mb-1">? Working Assumptions</span>
                  <ul className="list-disc list-inside text-slate-300 space-y-0.5">
                    {result.assumptions?.map((ass: string, idx: number) => (
                      <li key={idx}>{ass}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Raw JSON Data Preview */}
              <div className="p-3 rounded-lg bg-kria-900 border border-kria-border text-xs font-mono text-slate-300 overflow-x-auto max-h-48">
                <pre>{JSON.stringify(result, null, 2)}</pre>
              </div>

              {/* Action Routing to Approval Gate */}
              <div className="pt-2 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  Routing this result to the approval gate enables human authorization before execution.
                </span>

                {approvalSent ? (
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                    <CheckCircle2 className="h-4 w-4" />
                    Submitted to Approval Queue
                  </span>
                ) : (
                  <button
                    onClick={handleSendToApprovalGate}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white transition-colors"
                  >
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Submit to Approval Gate
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
