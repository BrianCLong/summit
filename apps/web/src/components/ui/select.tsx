// Placeholder select component
import React from 'react';

export const Select = ({ children, ...props }: any) => <select {...props}>{children}</select>;
export const SelectContent = ({ children }: any) => <>{children}</>;
export const SelectItem = ({ children, value }: any) => <option value={value}>{children}</option>;
export const SelectTrigger = ({ children }: any) => <>{children}</>;
export const SelectValue = ({ placeholder }: any) => <>{placeholder}</>;
