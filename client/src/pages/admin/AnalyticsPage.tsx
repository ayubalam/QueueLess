import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Users,
  Layers,
  ArrowLeft,
  RotateCw,
  TrendingUp,
  Percent,
  Timer,
  LayoutGrid,
} from 'lucide-react';
import {
  getAnalyticsOverview,
  getDailyAnalytics,
  getServiceAnalytics,
  getCounterAnalytics,
  getStaffAnalytics,
} from '../../lib/api/analyticsApi';
import type {
  AnalyticsOverview,
  DailyAnalyticsItem,
  ServiceAnalyticsItem,
  CounterAnalyticsItem,
  StaffAnalyticsItem,
} from '../../types/analytics';

type DatePreset = 'today' | '7days' | '30days' | 'custom';

export const AnalyticsPage: React.FC = () => {
  const getToday = () => new Date().toISOString().split('T')[0];

  const [preset, setPreset] = useState<DatePreset>('today');
  const [fromDate, setFromDate] = useState<string>(getToday());
  const [toDate, setToDate] = useState<string>(getToday());

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [dailyData, setDailyData] = useState<DailyAnalyticsItem[]>([]);
  const [servicesData, setServicesData] = useState<ServiceAnalyticsItem[]>([]);
  const [countersData, setCountersData] = useState<CounterAnalyticsItem[]>([]);
  const [staffData, setStaffData] = useState<StaffAnalyticsItem[]>([]);

  // Apply preset date ranges
  const applyPreset = (newPreset: DatePreset) => {
    setPreset(newPreset);
    const today = getToday();

    if (newPreset === 'today') {
      setFromDate(today);
      setToDate(today);
    } else if (newPreset === '7days') {
      const past7 = new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0];
      setFromDate(past7);
      setToDate(today);
    } else if (newPreset === '30days') {
      const past30 = new Date(Date.now() - 29 * 86400000).toISOString().split('T')[0];
      setFromDate(past30);
      setToDate(today);
    }
  };

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);

      const [ov, daily, svcs, cntrs, stf] = await Promise.all([
        getAnalyticsOverview(fromDate, toDate),
        getDailyAnalytics(fromDate, toDate),
        getServiceAnalytics(fromDate, toDate),
        getCounterAnalytics(fromDate, toDate),
        getStaffAnalytics(fromDate, toDate),
      ]);

      setOverview(ov);
      setDailyData(daily || []);
      setServicesData(svcs || []);
      setCountersData(cntrs || []);
      setStaffData(stf || []);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load operational analytics.');
    } finally {
      setIsLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Max value for daily trend chart scaling
  const maxDailyVolume = Math.max(
    ...dailyData.map((d) => Math.max(d.totalTokens, d.completedTokens, d.cancelledTokens)),
    1
  );

  const maxTimeValue = Math.max(
    ...dailyData.map((d) => Math.max(d.averageWaitingTime, d.averageServiceTime)),
    10
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <Link
              to="/admin"
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Operations & Analytics
              </h1>
              <p className="text-xs text-slate-500">
                Performance metrics, queue wait times, and service throughput
              </p>
            </div>
          </div>

          {/* Date Range Selector */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="bg-slate-100 p-1 rounded-xl flex items-center text-xs font-medium text-slate-600 border border-slate-200">
              <button
                onClick={() => applyPreset('today')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  preset === 'today'
                    ? 'bg-white text-blue-600 font-semibold shadow-xs'
                    : 'hover:text-slate-900'
                }`}
              >
                Today
              </button>
              <button
                onClick={() => applyPreset('7days')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  preset === '7days'
                    ? 'bg-white text-blue-600 font-semibold shadow-xs'
                    : 'hover:text-slate-900'
                }`}
              >
                Last 7 Days
              </button>
              <button
                onClick={() => applyPreset('30days')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  preset === '30days'
                    ? 'bg-white text-blue-600 font-semibold shadow-xs'
                    : 'hover:text-slate-900'
                }`}
              >
                Last 30 Days
              </button>
              <button
                onClick={() => setPreset('custom')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  preset === 'custom'
                    ? 'bg-white text-blue-600 font-semibold shadow-xs'
                    : 'hover:text-slate-900'
                }`}
              >
                Custom
              </button>
            </div>

            {preset === 'custom' && (
              <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-xl border border-slate-200 text-xs">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="date"
                  value={fromDate}
                  max={toDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="bg-transparent text-slate-700 focus:outline-none"
                />
                <span className="text-slate-400">to</span>
                <input
                  type="date"
                  value={toDate}
                  min={fromDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="bg-transparent text-slate-700 focus:outline-none"
                />
              </div>
            )}

            <button
              onClick={loadData}
              disabled={isLoading}
              className="p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-lg border border-slate-200 bg-white transition-colors"
              title="Refresh Analytics"
            >
              <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl w-full mx-auto p-6 space-y-6 flex-1">
        {/* Error State */}
        {errorMessage && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={loadData}
              className="text-xs font-semibold text-rose-700 hover:underline ml-4"
            >
              Retry
            </button>
          </div>
        )}

        {/* KPI Cards Grid */}
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          {/* 1. Total Tokens */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-medium">Total Tokens</span>
              <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                <Layers className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {isLoading ? '...' : overview?.totalTokens ?? 0}
            </p>
            <span className="text-[10px] text-slate-400 mt-1">Generated in period</span>
          </div>

          {/* 2. Completed */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-emerald-600 mb-2">
              <span className="text-xs font-medium text-slate-500">Completed</span>
              <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-emerald-600">
              {isLoading ? '...' : overview?.completedTokens ?? 0}
            </p>
            <span className="text-[10px] text-slate-400 mt-1">Served at counters</span>
          </div>

          {/* 3. Cancelled */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-rose-600 mb-2">
              <span className="text-xs font-medium text-slate-500">Cancelled</span>
              <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
                <XCircle className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-rose-600">
              {isLoading ? '...' : overview?.cancelledTokens ?? 0}
            </p>
            <span className="text-[10px] text-slate-400 mt-1">Left or dropped queue</span>
          </div>

          {/* 4. Skipped */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-amber-600 mb-2">
              <span className="text-xs font-medium text-slate-500">Skipped</span>
              <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
                <AlertTriangle className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-amber-600">
              {isLoading ? '...' : overview?.skippedTokens ?? 0}
            </p>
            <span className="text-[10px] text-slate-400 mt-1">No-show / skipped</span>
          </div>

          {/* 5. Avg Wait Time */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-indigo-600 mb-2">
              <span className="text-xs font-medium text-slate-500">Avg Wait</span>
              <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                <Clock className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="flex items-baseline space-x-1">
              <p className="text-2xl font-bold text-slate-900">
                {isLoading ? '...' : overview?.averageWaitingTime ?? 0}
              </p>
              <span className="text-xs text-slate-500">min</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1">Join to counter</span>
          </div>

          {/* 6. Avg Service Time */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-cyan-600 mb-2">
              <span className="text-xs font-medium text-slate-500">Avg Service</span>
              <div className="p-1.5 bg-cyan-50 text-cyan-600 rounded-lg">
                <Timer className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="flex items-baseline space-x-1">
              <p className="text-2xl font-bold text-slate-900">
                {isLoading ? '...' : overview?.averageServiceTime ?? 0}
              </p>
              <span className="text-xs text-slate-500">min</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1">Serving duration</span>
          </div>

          {/* 7. Completion Rate */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-emerald-600 mb-2">
              <span className="text-xs font-medium text-slate-500">Completion</span>
              <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                <Percent className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="flex items-baseline space-x-1">
              <p className="text-2xl font-bold text-slate-900">
                {isLoading ? '...' : overview?.completionRate ?? 0}
              </p>
              <span className="text-xs text-slate-500">%</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1">Throughput rate</span>
          </div>
        </section>

        {/* Charts Section: 2 Column Layout */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Token Volume Over Time */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  Token Volume Over Time
                </h3>
                <p className="text-xs text-slate-500">Daily breakdown of tokens created, completed, and cancelled</p>
              </div>
              <div className="flex items-center space-x-3 text-xs">
                <span className="inline-flex items-center gap-1.5 text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span> Total
                </span>
                <span className="inline-flex items-center gap-1.5 text-emerald-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> Completed
                </span>
                <span className="inline-flex items-center gap-1.5 text-rose-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span> Cancelled
                </span>
              </div>
            </div>

            {dailyData.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-12 text-slate-400 text-xs">
                <Calendar className="w-8 h-8 mb-2 stroke-1" />
                No token activity recorded in this period.
              </div>
            ) : (
              <div className="space-y-4 pt-2">
                {dailyData.map((day) => {
                  const totalPct = Math.round((day.totalTokens / maxDailyVolume) * 100);
                  const compPct = Math.round((day.completedTokens / maxDailyVolume) * 100);
                  const cancPct = Math.round((day.cancelledTokens / maxDailyVolume) * 100);

                  return (
                    <div key={day.date} className="space-y-1">
                      <div className="flex justify-between text-xs text-slate-600">
                        <span className="font-semibold text-slate-800">{day.date}</span>
                        <span>
                          <strong className="text-blue-600">{day.totalTokens}</strong> total ·{' '}
                          <span className="text-emerald-600">{day.completedTokens} done</span> ·{' '}
                          <span className="text-rose-600">{day.cancelledTokens} cancel</span>
                        </span>
                      </div>
                      <div className="h-4 bg-slate-100 rounded-full overflow-hidden flex relative">
                        <div
                          style={{ width: `${totalPct}%` }}
                          className="bg-blue-100 h-full absolute inset-y-0 left-0 rounded-full"
                          title={`Total: ${day.totalTokens}`}
                        />
                        <div
                          style={{ width: `${compPct}%` }}
                          className="bg-emerald-500 h-full relative z-10 rounded-full transition-all"
                          title={`Completed: ${day.completedTokens}`}
                        />
                        {day.cancelledTokens > 0 && (
                          <div
                            style={{ width: `${cancPct}%` }}
                            className="bg-rose-400 h-full relative z-10 rounded-full ml-1"
                            title={`Cancelled: ${day.cancelledTokens}`}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Chart 2: Average Waiting & Service Time */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  Average Waiting & Service Time
                </h3>
                <p className="text-xs text-slate-500">Wait duration vs. consultation time in minutes</p>
              </div>
              <div className="flex items-center space-x-3 text-xs">
                <span className="inline-flex items-center gap-1.5 text-indigo-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block"></span> Avg Wait
                </span>
                <span className="inline-flex items-center gap-1.5 text-cyan-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 inline-block"></span> Avg Service
                </span>
              </div>
            </div>

            {dailyData.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-12 text-slate-400 text-xs">
                <Clock className="w-8 h-8 mb-2 stroke-1" />
                No wait or service time data available.
              </div>
            ) : (
              <div className="space-y-4 pt-2">
                {dailyData.map((day) => {
                  const waitPct = Math.min(100, Math.round((day.averageWaitingTime / maxTimeValue) * 100));
                  const srvPct = Math.min(100, Math.round((day.averageServiceTime / maxTimeValue) * 100));

                  return (
                    <div key={day.date} className="space-y-1">
                      <div className="flex justify-between text-xs text-slate-600">
                        <span className="font-semibold text-slate-800">{day.date}</span>
                        <span>
                          Wait: <strong className="text-indigo-600">{day.averageWaitingTime}m</strong> ·{' '}
                          Service: <strong className="text-cyan-600">{day.averageServiceTime}m</strong>
                        </span>
                      </div>
                      <div className="space-y-1">
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            style={{ width: `${waitPct}%` }}
                            className="bg-indigo-500 h-full rounded-full transition-all"
                            title={`Wait: ${day.averageWaitingTime} min`}
                          />
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            style={{ width: `${srvPct}%` }}
                            className="bg-cyan-500 h-full rounded-full transition-all"
                            title={`Service: ${day.averageServiceTime} min`}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Section: Service Performance Table */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <LayoutGrid className="w-4 h-4 text-blue-600" />
                Service Performance
              </h3>
              <p className="text-xs text-slate-500">Queue volumes and operational efficiency breakdown by service</p>
            </div>
            <span className="text-xs text-slate-400">
              {servicesData.length} service{servicesData.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className="overflow-x-auto">
            {servicesData.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                No service data for this period.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-6">Service</th>
                    <th className="py-3 px-4">Tokens</th>
                    <th className="py-3 px-4">Completed</th>
                    <th className="py-3 px-4">Cancelled</th>
                    <th className="py-3 px-4">Skipped</th>
                    <th className="py-3 px-4">Avg Wait</th>
                    <th className="py-3 px-4">Avg Service</th>
                    <th className="py-3 px-6 text-right">Completion Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {servicesData.map((svc) => (
                    <tr key={svc.serviceId} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-6 font-semibold text-slate-900">
                        {svc.serviceName}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 font-medium">{svc.totalTokens}</td>
                      <td className="py-3.5 px-4 text-emerald-600 font-medium">{svc.completedTokens}</td>
                      <td className="py-3.5 px-4 text-rose-600">{svc.cancelledTokens}</td>
                      <td className="py-3.5 px-4 text-amber-600">{svc.skippedTokens}</td>
                      <td className="py-3.5 px-4 text-slate-600">{svc.averageWaitingTime}m</td>
                      <td className="py-3.5 px-4 text-slate-600">{svc.averageServiceTime}m</td>
                      <td className="py-3.5 px-6 text-right">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                          {svc.completionRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* Section: Counter & Staff Performance in 2 Columns */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Counter Performance */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600" />
                Counter Performance
              </h3>
              <p className="text-xs text-slate-500">Service counters and throughput</p>
            </div>

            <div className="overflow-x-auto flex-1">
              {countersData.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  No counter data for this period.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-6">Counter</th>
                      <th className="py-3 px-4">Completed</th>
                      <th className="py-3 px-4">Skipped</th>
                      <th className="py-3 px-4">Avg Wait</th>
                      <th className="py-3 px-4">Avg Service</th>
                      <th className="py-3 px-6 text-right">Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {countersData.map((cntr) => (
                      <tr key={cntr.counterId} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-6 font-semibold text-slate-900">
                          {cntr.counterName}
                        </td>
                        <td className="py-3.5 px-4 text-emerald-600 font-medium">
                          {cntr.totalCompleted}
                        </td>
                        <td className="py-3.5 px-4 text-amber-600">{cntr.skippedTokens}</td>
                        <td className="py-3.5 px-4 text-slate-600">{cntr.averageWaitingTime}m</td>
                        <td className="py-3.5 px-4 text-slate-600">{cntr.averageServiceTime}m</td>
                        <td className="py-3.5 px-6 text-right">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                            {cntr.completionRate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Staff Performance */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                Staff Operations
              </h3>
              <p className="text-xs text-slate-500">
                Staff member productivity (attributed via assigned counter)
              </p>
            </div>

            <div className="overflow-x-auto flex-1">
              {staffData.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  No staff members assigned to this organization.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-6">Staff Member</th>
                      <th className="py-3 px-4">Counter</th>
                      <th className="py-3 px-4">Completed</th>
                      <th className="py-3 px-4">Skipped</th>
                      <th className="py-3 px-4">Avg Service</th>
                      <th className="py-3 px-6 text-right">Total Handled</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {staffData.map((stf) => (
                      <tr key={stf.staffId} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-6 font-semibold text-slate-900">
                          {stf.staffName}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">{stf.counterName}</td>
                        <td className="py-3.5 px-4 text-emerald-600 font-medium">
                          {stf.totalCompleted}
                        </td>
                        <td className="py-3.5 px-4 text-amber-600">{stf.totalSkipped}</td>
                        <td className="py-3.5 px-4 text-slate-600">{stf.averageServiceTime}m</td>
                        <td className="py-3.5 px-6 text-right font-bold text-slate-800">
                          {stf.averageTokensHandled}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="p-3 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-400 text-center">
              Staff metrics are attributed through active counter assignment.
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
