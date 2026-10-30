import { useState, useMemo } from 'react';

/**
 * Helper to format date YYYY-MM-DD
 */
const formatDate = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const addDays = (dateStr, days) => {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return formatDate(d);
};

const formatDisplayDate = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
  return dateStr;
};

export default function BurndownChart({ project, tasks = [], sprints = [], onSelectTask }) {
  const [selectedSprintId, setSelectedSprintId] = useState('all');
  const [metricUnit, setMetricUnit] = useState('tasks'); // 'tasks' | 'points'
  const [activeTab, setActiveTab] = useState('chart'); // 'chart' | 'table' | 'breakdown'
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // Filter tasks according to selected sprint
  const filteredTasks = useMemo(() => {
    if (selectedSprintId === 'all') return tasks;
    if (selectedSprintId === 'backlog') return tasks.filter(t => !t.sprint_id);
    return tasks.filter(t => String(t.sprint_id) === String(selectedSprintId));
  }, [tasks, selectedSprintId]);

  // Selected sprint details
  const activeSprint = useMemo(() => {
    if (selectedSprintId === 'all' || selectedSprintId === 'backlog') return null;
    return sprints.find(s => String(s.id) === String(selectedSprintId)) || null;
  }, [sprints, selectedSprintId]);

  // Determine Timeline Start & End Date
  const { startDate, endDate, todayStr } = useMemo(() => {
    const today = formatDate(new Date());

    if (activeSprint) {
      const sStart = activeSprint.start_date || formatDate(activeSprint.createdAt || new Date());
      const sEnd = activeSprint.end_date || addDays(sStart, 14);
      return { startDate: sStart, endDate: sEnd, todayStr: today };
    }

    // For Project
    let earliest = project?.createdAt ? formatDate(project.createdAt) : today;
    let latest = today;

    filteredTasks.forEach(t => {
      const created = formatDate(t.createdAt);
      if (created < earliest) earliest = created;
      if (t.due_date && t.due_date > latest) latest = t.due_date;
      if (t.completed_at && formatDate(t.completed_at) > latest) latest = formatDate(t.completed_at);
    });

    // Make sure timeline spans at least 7 days
    if (latest <= earliest) {
      latest = addDays(earliest, 7);
    } else {
      const diffDays = Math.ceil((new Date(latest) - new Date(earliest)) / (1000 * 60 * 60 * 24));
      if (diffDays < 7) latest = addDays(earliest, 7);
    }

    return { startDate: earliest, endDate: latest, todayStr: today };
  }, [project, activeSprint, filteredTasks]);

  // Helper to get task value (either 1 task or its story points)
  const getTaskValue = (task) => {
    if (metricUnit === 'points') {
      return task.story_points ? parseInt(task.story_points, 10) : 1;
    }
    return 1;
  };

  // Generate day-by-day burndown calculation
  const timelineData = useMemo(() => {
    const days = [];
    const curr = new Date(startDate);
    const end = new Date(endDate);

    // Limit maximum points to prevent performance drag if dates are years apart
    let count = 0;
    while (curr <= end && count < 60) {
      days.push(formatDate(curr));
      curr.setDate(curr.getDate() + 1);
      count++;
    }

    if (days.length === 0) days.push(todayStr);

    // Total scope of all tasks in the filtered set
    const totalScope = filteredTasks.reduce((sum, t) => sum + getTaskValue(t), 0);

    let maxScopeFound = totalScope;

    const data = days.map((day, idx) => {
      const isPastOrToday = day <= todayStr;

      // Tasks created on or before this day
      const tasksCreatedUpToDay = filteredTasks.filter(t => formatDate(t.createdAt) <= day);
      const scopeUpToDay = tasksCreatedUpToDay.reduce((sum, t) => sum + getTaskValue(t), 0);

      // Tasks completed on or before this day
      const tasksCompletedUpToDay = filteredTasks.filter(t => {
        if (t.status !== 'done') return false;
        const compDate = t.completed_at ? formatDate(t.completed_at) : formatDate(t.updatedAt);
        return compDate <= day;
      });
      const completedUpToDay = tasksCompletedUpToDay.reduce((sum, t) => sum + getTaskValue(t), 0);

      // Tasks completed exactly on this day
      const tasksCompletedOnDay = filteredTasks.filter(t => {
        if (t.status !== 'done') return false;
        const compDate = t.completed_at ? formatDate(t.completed_at) : formatDate(t.updatedAt);
        return compDate === day;
      });

      // Tasks created exactly on this day
      const tasksCreatedOnDay = filteredTasks.filter(t => formatDate(t.createdAt) === day);

      // Remaining work
      const remainingActual = isPastOrToday ? Math.max(0, scopeUpToDay - completedUpToDay) : null;

      // Ideal line linear calculation
      const progressRatio = days.length > 1 ? idx / (days.length - 1) : 1;
      const idealRemaining = Math.max(0, Math.round((totalScope * (1 - progressRatio)) * 10) / 10);

      if (scopeUpToDay > maxScopeFound) maxScopeFound = scopeUpToDay;

      return {
        date: day,
        displayDate: formatDisplayDate(day),
        isToday: day === todayStr,
        isPastOrToday,
        scopeUpToDay,
        completedUpToDay,
        remainingActual,
        idealRemaining,
        newTasksCount: tasksCreatedOnDay.length,
        doneTasksCount: tasksCompletedOnDay.length,
        newTasksValue: tasksCreatedOnDay.reduce((sum, t) => sum + getTaskValue(t), 0),
        doneTasksValue: tasksCompletedOnDay.reduce((sum, t) => sum + getTaskValue(t), 0),
      };
    });

    return { days: data, totalScope: maxScopeFound };
  }, [startDate, endDate, todayStr, filteredTasks, metricUnit]);

  // Overall Statistics
  const stats = useMemo(() => {
    const totalTasks = filteredTasks.length;
    const completedTasks = filteredTasks.filter(t => t.status === 'done').length;
    const inProgressTasks = filteredTasks.filter(t => t.status === 'in_progress').length;
    const todoTasks = filteredTasks.filter(t => t.status === 'todo').length;

    const totalPoints = filteredTasks.reduce((s, t) => s + (t.story_points || 0), 0);
    const completedPoints = filteredTasks.filter(t => t.status === 'done').reduce((s, t) => s + (t.story_points || 0), 0);
    const remainingPoints = totalPoints - completedPoints;

    const totalVal = metricUnit === 'points' ? (totalPoints || totalTasks) : totalTasks;
    const doneVal = metricUnit === 'points' ? completedPoints : completedTasks;
    const remainingVal = totalVal - doneVal;

    const completionPct = totalVal > 0 ? Math.round((doneVal / totalVal) * 100) : 0;

    // Check status compared to ideal on today
    const todayData = timelineData.days.find(d => d.date === todayStr) ||
                      timelineData.days.filter(d => d.isPastOrToday).slice(-1)[0];

    let scheduleStatus = 'on_track'; // 'ahead' | 'on_track' | 'behind'
    let delta = 0;

    if (todayData && todayData.remainingActual !== null) {
      delta = todayData.remainingActual - todayData.idealRemaining;
      if (delta < -0.5) scheduleStatus = 'ahead';
      else if (delta > 0.5) scheduleStatus = 'behind';
      else scheduleStatus = 'on_track';
    }

    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      todoTasks,
      totalPoints,
      completedPoints,
      remainingPoints,
      totalVal,
      doneVal,
      remainingVal,
      completionPct,
      scheduleStatus,
      delta: Math.abs(Math.round(delta * 10) / 10),
    };
  }, [filteredTasks, metricUnit, timelineData, todayStr]);

  // SVG Chart Dimensions & Coordinates
  const chartConfig = useMemo(() => {
    const width = 820;
    const height = 340;
    const padTop = 35;
    const padRight = 35;
    const padBottom = 45;
    const padLeft = 55;

    const plotWidth = width - padLeft - padRight;
    const plotHeight = height - padTop - padBottom;

    const daysList = timelineData.days;
    const numDays = daysList.length;

    const maxY = Math.max(1, Math.ceil(timelineData.totalScope * 1.15) || 5);

    const getX = (index) => {
      if (numDays <= 1) return padLeft + plotWidth / 2;
      return padLeft + (index / (numDays - 1)) * plotWidth;
    };

    const getY = (val) => {
      if (val == null) return null;
      const ratio = Math.max(0, Math.min(1, val / maxY));
      return padTop + plotHeight - ratio * plotHeight;
    };

    // Build Ideal Path
    const idealPath = daysList.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.idealRemaining)}`).join(' ');

    // Build Actual Path (only for past and today)
    const actualPoints = daysList
      .map((d, i) => ({ x: getX(i), y: getY(d.remainingActual), d, i }))
      .filter(p => p.y !== null);

    const actualPath = actualPoints.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    // Area path under actual line
    let actualArea = '';
    if (actualPoints.length > 0) {
      const first = actualPoints[0];
      const last = actualPoints[actualPoints.length - 1];
      const bottomY = padTop + plotHeight;
      actualArea = `${actualPath} L ${last.x} ${bottomY} L ${first.x} ${bottomY} Z`;
    }

    // Horizontal Y Grid lines
    const gridLines = [];
    const steps = 4;
    for (let s = 0; s <= steps; s++) {
      const val = Math.round((maxY / steps) * s * 10) / 10;
      const y = getY(val);
      gridLines.push({ val, y });
    }

    return {
      width,
      height,
      padLeft,
      padRight,
      padTop,
      padBottom,
      plotWidth,
      plotHeight,
      maxY,
      getX,
      getY,
      idealPath,
      actualPath,
      actualArea,
      actualPoints,
      gridLines,
    };
  }, [timelineData]);

  const unitLabel = metricUnit === 'points' ? 'SP' : 'Tasks';

  return (
    <div className="burndown-container animate-fadein">
      {/* Top Controls & Header */}
      <div className="burndown-header">
        <div>
          <h2 className="burndown-title">
            📉 Burndown Chart (Biểu đồ Đốt việc)
          </h2>
          <p className="burndown-subtitle">
            Theo dõi khối lượng công việc còn lại và đo lường tốc độ hoàn thành so với kế hoạch dự án.
          </p>
        </div>

        <div className="burndown-controls">
          {/* Sprint Selector */}
          <div className="burndown-control-group">
            <span className="control-label">Phạm vi:</span>
            <select
              className="form-input burndown-select"
              value={selectedSprintId}
              onChange={e => setSelectedSprintId(e.target.value)}
            >
              <option value="all">🌐 Toàn bộ Project</option>
              {sprints.map(s => (
                <option key={s.id} value={s.id}>
                  🏃 {s.name} ({s.status})
                </option>
              ))}
              <option value="backlog">📦 Chỉ Backlog</option>
            </select>
          </div>

          {/* Metric Unit Toggle */}
          <div className="burndown-toggle-group">
            <button
              className={`toggle-btn ${metricUnit === 'tasks' ? 'active' : ''}`}
              onClick={() => setMetricUnit('tasks')}
              title="Tính theo số lượng đầu việc"
            >
              📋 Số Task
            </button>
            <button
              className={`toggle-btn ${metricUnit === 'points' ? 'active' : ''}`}
              onClick={() => setMetricUnit('points')}
              title="Tính theo điểm Story Points (Agile)"
            >
              🎯 Story Points
            </button>
          </div>

          {/* View Tab Switcher */}
          <div className="burndown-tab-group">
            <button
              className={`tab-btn ${activeTab === 'chart' ? 'active' : ''}`}
              onClick={() => setActiveTab('chart')}
            >
              📈 Biểu đồ
            </button>
            <button
              className={`tab-btn ${activeTab === 'table' ? 'active' : ''}`}
              onClick={() => setActiveTab('table')}
            >
              📅 Theo ngày
            </button>
            <button
              className={`tab-btn ${activeTab === 'breakdown' ? 'active' : ''}`}
              onClick={() => setActiveTab('breakdown')}
            >
              📋 Danh sách
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="burndown-stats-grid">
        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: '#eff6ff', color: '#3b82f6' }}>
            📦
          </div>
          <div>
            <div className="stat-label">Tổng khối lượng</div>
            <div className="stat-value">{stats.totalVal} <span className="stat-unit">{unitLabel}</span></div>
            <div className="stat-hint">{stats.totalTasks} tasks tổng cộng</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: '#ecfdf5', color: '#10b981' }}>
            ✅
          </div>
          <div>
            <div className="stat-label">Đã hoàn thành</div>
            <div className="stat-value" style={{ color: '#10b981' }}>
              {stats.doneVal} <span className="stat-unit">{unitLabel}</span>
            </div>
            <div className="stat-hint">
              {stats.completionPct}% tiến độ ({stats.completedTasks}/{stats.totalTasks} tasks)
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: '#fef2f2', color: '#ef4444' }}>
            ⏳
          </div>
          <div>
            <div className="stat-label">Khối lượng còn lại</div>
            <div className="stat-value" style={{ color: '#ef4444' }}>
              {stats.remainingVal} <span className="stat-unit">{unitLabel}</span>
            </div>
            <div className="stat-hint">
              {stats.todoTasks} Cần làm · {stats.inProgressTasks} Đang làm
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{
            background: stats.scheduleStatus === 'ahead' ? '#f0fdf4' : stats.scheduleStatus === 'behind' ? '#fff7ed' : '#f8fafc',
            color: stats.scheduleStatus === 'ahead' ? '#16a34a' : stats.scheduleStatus === 'behind' ? '#ea580c' : '#4f46e5',
          }}>
            {stats.scheduleStatus === 'ahead' ? '🚀' : stats.scheduleStatus === 'behind' ? '⚠️' : '🎯'}
          </div>
          <div>
            <div className="stat-label">Đánh giá tiến độ</div>
            <div className="stat-value" style={{
              fontSize: '1.1rem',
              color: stats.scheduleStatus === 'ahead' ? '#16a34a' : stats.scheduleStatus === 'behind' ? '#ea580c' : '#4f46e5',
            }}>
              {stats.scheduleStatus === 'ahead' && `Nhanh hơn (${stats.delta} ${unitLabel})`}
              {stats.scheduleStatus === 'behind' && `Chậm hơn (${stats.delta} ${unitLabel})`}
              {stats.scheduleStatus === 'on_track' && 'Đúng tiến độ'}
            </div>
            <div className="stat-hint">
              {stats.scheduleStatus === 'ahead' && 'Đang vượt mục tiêu kế hoạch'}
              {stats.scheduleStatus === 'behind' && 'Cần đẩy nhanh tiến độ xử lý'}
              {stats.scheduleStatus === 'on_track' && 'Bám sát lộ trình lý tưởng'}
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="burndown-progress-bar-container">
        <div className="burndown-progress-bar">
          <div
            className="burndown-progress-fill"
            style={{ width: `${stats.completionPct}%` }}
          />
        </div>
        <div className="burndown-progress-labels">
          <span>Khởi đầu ({formatDisplayDate(startDate)})</span>
          <span style={{ fontWeight: 700, color: 'var(--primary)' }}>
            Hoàn thành: {stats.completionPct}%
          </span>
          <span>Hạn đích ({formatDisplayDate(endDate)})</span>
        </div>
      </div>

      {/* TAB 1: CHART VIEW */}
      {activeTab === 'chart' && (
        <div className="burndown-chart-card">
          {/* Chart Header & Legend */}
          <div className="chart-card-header">
            <div className="chart-legend">
              <div className="legend-item">
                <span className="legend-line actual-line" />
                <span>Thực tế còn lại (Nét liền tím)</span>
              </div>
              <div className="legend-item">
                <span className="legend-line ideal-line" />
                <span>Đường lý tưởng (Nét liền xám)</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot today-dot" />
                <span>Hôm nay ({formatDisplayDate(todayStr)})</span>
              </div>
            </div>

            <div className="chart-date-range">
              📅 {startDate} → {endDate} ({timelineData.days.length} ngày)
            </div>
          </div>

          {/* SVG Canvas */}
          {filteredTasks.length === 0 ? (
            <div className="chart-empty-state">
              <span style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📋</span>
              <h4>Chưa có dữ liệu nhiệm vụ</h4>
              <p>Tạo các nhiệm vụ trong Project hoặc Sprint này để bắt đầu theo dõi tiến độ Burndown.</p>
            </div>
          ) : (
            <div className="svg-wrapper">
              <svg
                viewBox={`0 0 ${chartConfig.width} ${chartConfig.height}`}
                className="burndown-svg"
                preserveAspectRatio="xMidYMid meet"
              >
                <defs>
                  {/* Gradient for area fill under actual line */}
                  <linearGradient id="burndownGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.28" />
                    <stop offset="85%" stopColor="#4f46e5" stopOpacity="0.02" />
                    <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
                  </linearGradient>

                  {/* Glow filter for active point */}
                  <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#4f46e5" floodOpacity="0.4" />
                  </filter>
                </defs>

                {/* Y Grid lines & Labels */}
                {chartConfig.gridLines.map((g, idx) => (
                  <g key={idx} className="grid-group">
                    <line
                      x1={chartConfig.padLeft}
                      y1={g.y}
                      x2={chartConfig.width - chartConfig.padRight}
                      y2={g.y}
                      stroke="var(--border)"
                      strokeDasharray="4,4"
                      strokeWidth="1"
                    />
                    <text
                      x={chartConfig.padLeft - 10}
                      y={g.y + 4}
                      textAnchor="end"
                      fill="var(--text-muted)"
                      fontSize="11"
                      fontFamily="Inter, sans-serif"
                    >
                      {g.val}
                    </text>
                  </g>
                ))}

                {/* Vertical marker for Today */}
                {timelineData.days.findIndex(d => d.isToday) !== -1 && (
                  (() => {
                    const todayIdx = timelineData.days.findIndex(d => d.isToday);
                    const todayX = chartConfig.getX(todayIdx);
                    return (
                      <g className="today-marker">
                        <line
                          x1={todayX}
                          y1={chartConfig.padTop}
                          x2={todayX}
                          y2={chartConfig.padTop + chartConfig.plotHeight}
                          stroke="#ef4444"
                          strokeWidth="1.5"
                          strokeDasharray="3,3"
                          opacity="0.8"
                        />
                        <text
                          x={todayX}
                          y={chartConfig.padTop - 8}
                          textAnchor="middle"
                          fill="#ef4444"
                          fontSize="10"
                          fontWeight="700"
                        >
                          HÔM NAY
                        </text>
                      </g>
                    );
                  })()
                )}

                {/* Vertical hover crosshair */}
                {hoveredPoint && (
                  (() => {
                    const hIdx = timelineData.days.findIndex(d => d.date === hoveredPoint.date);
                    if (hIdx === -1) return null;
                    const hX = chartConfig.getX(hIdx);
                    return (
                      <line
                        x1={hX}
                        y1={chartConfig.padTop}
                        x2={hX}
                        y2={chartConfig.padTop + chartConfig.plotHeight}
                        stroke="#6366f1"
                        strokeWidth="1.5"
                        strokeDasharray="2,2"
                        opacity="0.6"
                      />
                    );
                  })()
                )}

                {/* Ideal Guideline Path - NÉT LIỀN (Solid Line) */}
                <path
                  d={chartConfig.idealPath}
                  fill="none"
                  stroke="#64748b"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Actual Area Fill */}
                {chartConfig.actualArea && (
                  <path
                    d={chartConfig.actualArea}
                    fill="url(#burndownGrad)"
                  />
                )}

                {/* Actual Line Path - NÉT LIỀN (Solid Line) */}
                {chartConfig.actualPath && (
                  <path
                    d={chartConfig.actualPath}
                    fill="none"
                    stroke="#4f46e5"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Actual Data Points */}
                {chartConfig.actualPoints.map(p => (
                  <g
                    key={p.i}
                    className="data-point-group"
                    onMouseEnter={() => setHoveredPoint(p.d)}
                    onMouseLeave={() => setHoveredPoint(null)}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Invisible hit target for better hover detection */}
                    <circle cx={p.x} cy={p.y} r="14" fill="transparent" />

                    {/* Outer glow ring when hovered */}
                    {hoveredPoint?.date === p.d.date && (
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r="10"
                        fill="#4f46e5"
                        opacity="0.25"
                      />
                    )}

                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={p.d.isToday ? 6 : 4.5}
                      fill={p.d.isToday ? '#ef4444' : '#ffffff'}
                      stroke={p.d.isToday ? '#ef4444' : '#4f46e5'}
                      strokeWidth="2.5"
                      filter="url(#glow)"
                    />
                  </g>
                ))}

                {/* X-Axis Date Labels - TỰ CĂN ĐỀU (Evenly Balanced) */}
                {(() => {
                  const total = timelineData.days.length;
                  if (total === 0) return null;
                  const maxLabels = Math.min(total, total > 14 ? 8 : total);
                  const step = total > 1 ? (total - 1) / (maxLabels - 1) : 1;
                  const labelIndices = [];
                  for (let i = 0; i < maxLabels; i++) {
                    const targetIdx = Math.round(i * step);
                    if (!labelIndices.includes(targetIdx)) {
                      labelIndices.push(targetIdx);
                    }
                  }
                  if (!labelIndices.includes(0)) labelIndices.unshift(0);
                  if (!labelIndices.includes(total - 1)) labelIndices.push(total - 1);

                  return labelIndices.map(idx => {
                    const d = timelineData.days[idx];
                    if (!d) return null;
                    const x = chartConfig.getX(idx);
                    const y = chartConfig.height - chartConfig.padBottom + 22;
                    const anchor = idx === 0 ? 'start' : idx === total - 1 ? 'end' : 'middle';

                    return (
                      <text
                        key={idx}
                        x={x}
                        y={y}
                        textAnchor={anchor}
                        fill={d.isToday ? '#ef4444' : 'var(--text-secondary)'}
                        fontWeight={d.isToday ? '700' : '500'}
                        fontSize="11"
                        fontFamily="Inter, sans-serif"
                      >
                        {d.displayDate}
                      </text>
                    );
                  });
                })()}
              </svg>

              {/* Floating Tooltip */}
              {hoveredPoint && (
                <div className="chart-floating-tooltip">
                  <div className="tooltip-header">
                    📅 {hoveredPoint.date} {hoveredPoint.isToday ? '(Hôm nay)' : ''}
                  </div>
                  <div className="tooltip-body">
                    <div className="tooltip-row">
                      <span className="tooltip-label">Còn lại thực tế:</span>
                      <strong style={{ color: '#4f46e5' }}>
                        {hoveredPoint.remainingActual !== null ? `${hoveredPoint.remainingActual} ${unitLabel}` : '—'}
                      </strong>
                    </div>
                    <div className="tooltip-row">
                      <span className="tooltip-label">Mục tiêu lý tưởng:</span>
                      <span style={{ color: '#64748b' }}>
                        {hoveredPoint.idealRemaining} {unitLabel}
                      </span>
                    </div>
                    <div className="tooltip-row">
                      <span className="tooltip-label">Đã xong lũy kế:</span>
                      <span style={{ color: '#10b981' }}>
                        {hoveredPoint.completedUpToDay} {unitLabel}
                      </span>
                    </div>
                    {hoveredPoint.doneTasksCount > 0 && (
                      <div className="tooltip-row highlight-done">
                        <span>🎉 Xong trong ngày:</span>
                        <strong>+{hoveredPoint.doneTasksCount} task</strong>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quick explanation footer */}
          <div className="chart-footer-hint">
            💡 <em>Gợi ý đọc biểu đồ:</em> Nếu đường màu xanh tím <strong>nằm dưới</strong> đường đứt đoạn xám nghĩa là dự án đang <strong>nhanh hơn tiến độ</strong>. Nếu nằm phía trên, cần tập trung đẩy nhanh để kịp thời hạn.
          </div>
        </div>
      )}

      {/* TAB 2: DAILY TABLE VIEW */}
      {activeTab === 'table' && (
        <div className="burndown-table-card animate-fadein">
          <table className="burndown-data-table">
            <thead>
              <tr>
                <th>Ngày</th>
                <th>Task mới tạo</th>
                <th>Task hoàn thành</th>
                <th>Tổng khối lượng</th>
                <th>Lũy kế hoàn thành</th>
                <th>Còn lại thực tế</th>
                <th>Mục tiêu lý tưởng</th>
                <th>Tình trạng</th>
              </tr>
            </thead>
            <tbody>
              {timelineData.days.map((row) => {
                const delta = row.remainingActual !== null
                  ? Math.round((row.remainingActual - row.idealRemaining) * 10) / 10
                  : null;

                return (
                  <tr key={row.date} className={row.isToday ? 'row-today' : ''}>
                    <td>
                      <strong>{row.displayDate}</strong>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginLeft: '0.4rem' }}>
                        ({row.date})
                      </span>
                      {row.isToday && <span className="today-badge">Hôm nay</span>}
                    </td>
                    <td>
                      {row.newTasksCount > 0 ? (
                        <span className="tag-new">+{row.newTasksCount} task</span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td>
                      {row.doneTasksCount > 0 ? (
                        <span className="tag-done">+{row.doneTasksCount} task</span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td>{row.scopeUpToDay} {unitLabel}</td>
                    <td style={{ color: '#10b981', fontWeight: 600 }}>{row.completedUpToDay} {unitLabel}</td>
                    <td>
                      {row.remainingActual !== null ? (
                        <strong style={{ color: '#4f46e5' }}>{row.remainingActual} {unitLabel}</strong>
                      ) : (
                        <span className="text-muted">Chưa đến</span>
                      )}
                    </td>
                    <td style={{ color: '#64748b' }}>{row.idealRemaining} {unitLabel}</td>
                    <td>
                      {delta !== null ? (
                        delta < -0.5 ? (
                          <span className="status-chip ahead">🚀 Sớm {Math.abs(delta)}</span>
                        ) : delta > 0.5 ? (
                          <span className="status-chip behind">⚠️ Chậm {delta}</span>
                        ) : (
                          <span className="status-chip on-track">🎯 Đúng hạn</span>
                        )
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: TASKS BREAKDOWN */}
      {activeTab === 'breakdown' && (
        <div className="burndown-breakdown-grid animate-fadein">
          {/* Pending Tasks */}
          <div className="breakdown-card">
            <div className="breakdown-card-header">
              <h3>⏳ Các task chưa xong ({stats.totalTasks - stats.completedTasks})</h3>
              <span className="sp-badge-total">{stats.remainingPoints} SP</span>
            </div>
            <div className="breakdown-task-list">
              {filteredTasks.filter(t => t.status !== 'done').map(task => (
                <div
                  key={task.id}
                  className="breakdown-task-item"
                  onClick={() => onSelectTask && onSelectTask(task)}
                >
                  <div className="task-left">
                    <span className={`status-indicator status-${task.status}`} />
                    <span className="task-title">{task.title}</span>
                  </div>
                  <div className="task-right">
                    {task.story_points && <span className="sp-badge-sm">{task.story_points} SP</span>}
                    {task.assignee && (
                      <span className="task-assignee-name" title={task.assignee.name}>
                        👤 {task.assignee.name}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {filteredTasks.filter(t => t.status !== 'done').length === 0 && (
                <div className="empty-message">🎉 Tuyệt vời! Không còn task nào tồn đọng!</div>
              )}
            </div>
          </div>

          {/* Completed Tasks */}
          <div className="breakdown-card">
            <div className="breakdown-card-header">
              <h3>✅ Các task đã hoàn thành ({stats.completedTasks})</h3>
              <span className="sp-badge-total done">{stats.completedPoints} SP</span>
            </div>
            <div className="breakdown-task-list">
              {filteredTasks.filter(t => t.status === 'done').map(task => (
                <div
                  key={task.id}
                  className="breakdown-task-item completed"
                  onClick={() => onSelectTask && onSelectTask(task)}
                >
                  <div className="task-left">
                    <span className="done-check">✓</span>
                    <span className="task-title line-through">{task.title}</span>
                  </div>
                  <div className="task-right">
                    {task.completed_at && (
                      <span className="completed-date">
                        {formatDisplayDate(formatDate(task.completed_at))}
                      </span>
                    )}
                    {task.story_points && <span className="sp-badge-sm">{task.story_points} SP</span>}
                  </div>
                </div>
              ))}
              {filteredTasks.filter(t => t.status === 'done').length === 0 && (
                <div className="empty-message">Chưa có task nào được hoàn thành trong phạm vi này.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
