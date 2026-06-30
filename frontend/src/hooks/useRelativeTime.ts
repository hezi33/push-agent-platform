import { useState, useEffect, useCallback } from 'react';

/**
 * 计算相对时间描述
 * "刚刚" / "1 分钟前" / "5 分钟前" / "1 小时前"
 */
function formatRelative(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return '刚刚';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  return `${Math.floor(hours / 24)} 天前`;
}

/**
 * 动态相对时间 Hook
 *
 * 传入一个过去的 ISO 时间戳，返回「X 分钟前」这样的动态描述。
 * 每 30 秒自动更新，让页面时间看起来是"活的"。
 *
 * 使用场景：
 * - Agent 巡检时间："上次巡检 X 分钟前"
 * - 数据更新时间："最后更新 X 分钟前"
 * - 告警发现时间："X 小时前发现"
 */
export function useRelativeTime(isoString: string): string {
  const calc = useCallback(() => {
    const diff = Date.now() - new Date(isoString).getTime();
    return formatRelative(Math.max(0, diff));
  }, [isoString]);

  const [text, setText] = useState(calc);

  useEffect(() => {
    setText(calc());
    const timer = setInterval(() => setText(calc()), 30_000);
    return () => clearInterval(timer);
  }, [calc]);

  return text;
}

/**
 * 生成一个"过去的随机时间"的 ISO 字符串
 * 用于初始化 Mock 时间，让它看起来不是写死的
 *
 * @param minSecondsAgo 最早多少秒前
 * @param maxSecondsAgo 最晚多少秒前
 */
export function randomPastTime(minSecondsAgo = 30, maxSecondsAgo = 300): string {
  const offset = minSecondsAgo + Math.random() * (maxSecondsAgo - minSecondsAgo);
  return new Date(Date.now() - offset * 1000).toISOString();
}
