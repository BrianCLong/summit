import React from 'react';
export function seg() {
  const role = localStorage.getItem('role') || 'user';
  const plan = localStorage.getItem('plan') || 'free';
  return `${role}-${plan}`;
}
export const If = ({ show, children }: { show: string; children: any }) =>
  seg() === show ? children : null;
