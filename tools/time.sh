#!/usr/bin/env bash
set -euo pipefail

cmd="${1:-}"; shift || true

case "$cmd" in
  start) 
    task="${1:-task}"
    echo "🕒 Starting timer: symphony:$task"
    watson start "symphony:$task"
    ;;
  stop)  
    echo "⏱️  Stopping timer"
    watson stop || true
    ;;
  day)   
    echo "📊 Today's time log:"
    watson log --day
    ;;
  week)  
    echo "📊 This week's time report:"
    watson report --current-week
    ;;
  status)
    echo "⏱️  Current timer status:"
    watson status || echo "No active timer"
    ;;
  report)
    echo "# Symphony Time Report - $(date)"
    echo ""
    echo "## This Week"
    echo ""
    watson report --current-week 2>/dev/null || echo "No time data yet"
    echo ""
    echo "## Today" 
    echo ""
    watson log --day 2>/dev/null || echo "No time data today"
    ;;
  *) 
    echo "usage: time.sh {start <name>|stop|day|week|status|report}" >&2
    echo ""
    echo "examples:"
    echo "  time.sh start smoke-test"
    echo "  time.sh stop"
    echo "  time.sh day"
    echo "  time.sh report"
    exit 2
    ;;
esac