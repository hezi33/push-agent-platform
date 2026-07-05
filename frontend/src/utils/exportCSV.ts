/**
 * 导出数据为 CSV 并触发浏览器下载
 */
export function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const bom = '﻿'; // BOM for Excel UTF-8
  const headerLine = headers.join(',');
  const dataLines = rows.map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));
  const csv = bom + [headerLine, ...dataLines].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * 导出趋势数据
 */
export function exportTrendData(metricName: string, dates: string[], values: number[], suffix: string) {
  const headers = ['日期', `${metricName}${suffix}`];
  const rows = dates.map((d, i) => [d, values[i]]);
  downloadCSV(`${metricName}_趋势数据_${dates[0]}_${dates[dates.length - 1]}.csv`, headers, rows);
}

/**
 * 导出维度对比数据
 */
export function exportDimensionData(metricName: string, dimName: string, data: { name: string; current: number; baseline: number }[], suffix: string) {
  const headers = [dimName, `当前值${suffix}`, `基线值${suffix}`, '差异'];
  const rows = data.map((d) => [d.name, d.current, d.baseline, +(d.current - d.baseline).toFixed(2)]);
  downloadCSV(`${metricName}_${dimName}对比.csv`, headers, rows);
}
