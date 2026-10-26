export function getDateRangeForPeriod(period) {
  const now = new Date();
  let startDate = new Date();
  let endDate = new Date();

  if (period === 'last15') {
    startDate = new Date(now);
    startDate.setDate(now.getDate() - 15);
    startDate.setHours(0, 0, 0, 0);

    endDate = new Date(now);
    endDate.setHours(23, 59, 59, 999);
  } else if (period === 'thisMonth') {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  } else if (period === 'lastMonth') {
    startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  }

  return { startDate, endDate };
}

export function getPeriodTitle(period) {
  if (period === 'last15') return 'Last 15 Days Logs';
  if (period === 'thisMonth') return "This Month's Logs";
  if (period === 'lastMonth') return "Last Month's Logs";
  return 'Attendance Logs';
}

const getLocalDateKey = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function calculateDailyUserLogs(person, userLogs, period) {
  if (!person || !userLogs) {
    return {
      dailySummaries: [],
      totalMinutes: 0,
      totalHoursFormatted: '0h 0m',
      grandTotalRate: 0,
      latestLogTime: 0,
    };
  }

  const { startDate, endDate } = getDateRangeForPeriod(period);

  // Filter logs for this specific person
  const logsForPerson = userLogs.filter((log) => {
    if (Array.isArray(log.user_id)) {
      return (
        log.user_id.includes(person.recordId) ||
        log.user_id.includes(person.id) ||
        log.user_id.includes(String(person.id)) ||
        log.user_id.includes(Number(person.id))
      );
    }
    return (
      String(log.user_id) === String(person.id) ||
      String(log.user_id) === String(person.recordId)
    );
  });

  // Group logs strictly by LOCAL date YYYY-MM-DD
  const groupedByDate = {};
  let latestLogTime = 0;

  logsForPerson.forEach((log) => {
    if (!log.datetime) return;
    const logDate = new Date(log.datetime);
    if (isNaN(logDate.getTime())) return;

    if (logDate.getTime() > latestLogTime) {
      latestLogTime = logDate.getTime();
    }

    if (logDate < startDate || logDate > endDate) return;

    const dateKey = getLocalDateKey(logDate);
    if (!groupedByDate[dateKey]) {
      groupedByDate[dateKey] = {
        dateObj: logDate,
        dateKey: dateKey,
        formattedDate: logDate.toLocaleDateString(undefined, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        logs: [],
      };
    }
    groupedByDate[dateKey].logs.push({
      type: log.type && String(log.type).toLowerCase() === 'in' ? 'In' : 'Out',
      date: logDate,
    });
  });

  let grandTotalMinutes = 0;
  let grandTotalRate = 0;

  const fullRate = Number(person.rate) || 0;
  const halfRate = Number(person.half_rate) || 0;
  const extraRate = Number(person.extra_rate) || 0;

  const dailySummaries = Object.values(groupedByDate).map((dayData) => {
    // Sort logs chronologically within the same local date
    dayData.logs.sort((a, b) => a.date.getTime() - b.date.getTime());

    const inLogs = dayData.logs.filter((l) => l.type === 'In');
    const outLogs = dayData.logs.filter((l) => l.type === 'Out');

    const firstIn = inLogs.length > 0 ? inLogs[0].date : null;
    const lastOut = outLogs.length > 0 ? outLogs[outLogs.length - 1].date : null;

    let loginStr = '--';
    if (firstIn) {
      loginStr = firstIn.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    }

    let logoutStr = '--';
    if (lastOut) {
      logoutStr = lastOut.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    }

    let totalHoursStr = '--';
    let rateVal = 0;
    let isDarkRed = false;
    let isHighlighted = false;

    if (firstIn && lastOut && lastOut > firstIn) {
      const diffMs = lastOut.getTime() - firstIn.getTime();
      const mins = Math.floor(diffMs / (1000 * 60));
      grandTotalMinutes += mins;
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      totalHoursStr = `${h}h ${m}m`;

      const decimalHours = diffMs / (1000 * 60 * 60);

      // Highlight in BOLD and UNDERLINE if total hours >= 12 AND log in is before 11:00 AM
      if (decimalHours >= 12 && firstIn.getHours() < 11) {
        isHighlighted = true;
      }

      if (decimalHours >= 10) {
        // 10 hours or more -> rate + (extra_rate * extra_hours)
        const extraHoursCount = Math.floor(decimalHours) - 9;
        rateVal = fullRate + extraHoursCount * extraRate;
        isDarkRed = false;
      } else if (decimalHours > 6) {
        // Less than 10 hours and greater than 6 hours -> rate
        rateVal = fullRate;
        isDarkRed = false;
      } else if (decimalHours >= 4) {
        // Between 4 and 6 hours (6 hours or less) -> half_rate
        rateVal = halfRate;
        isDarkRed = false;
      } else {
        // Less than 4 hours -> half_rate - 50 (font color: dark red)
        const computedHalfMinus50 = halfRate - 50;
        rateVal = computedHalfMinus50 > 0 ? computedHalfMinus50 : 0;
        isDarkRed = true;
      }
    } else if (firstIn && !lastOut) {
      totalHoursStr = 'Active';
      rateVal = 0;
      isDarkRed = false;
    }

    grandTotalRate += rateVal;

    return {
      dateKey: dayData.dateKey,
      formattedDate: dayData.formattedDate,
      dateObj: dayData.dateObj,
      logIn: loginStr,
      logOut: logoutStr,
      totalHours: totalHoursStr,
      rateVal: rateVal,
      isDarkRed: isDarkRed,
      isHighlighted: isHighlighted,
    };
  });

  // Sort daily summaries strictly DESCENDING by dateKey (newest date first)
  dailySummaries.sort((a, b) => b.dateKey.localeCompare(a.dateKey));

  const grandHours = Math.floor(grandTotalMinutes / 60);
  const grandMins = grandTotalMinutes % 60;
  const totalHoursFormatted = `${grandHours}h ${grandMins}m`;

  return {
    dailySummaries,
    totalMinutes: grandTotalMinutes,
    totalHoursFormatted,
    grandTotalRate,
    latestLogTime,
  };
}
