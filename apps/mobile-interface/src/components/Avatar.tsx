// @ts-nocheck
import React from "react";

interface AvatarProps {
  src?: string;
  alt?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  fallback?: string;
}

export function Avatar({ src, alt = "", size = "md", className = "", fallback }: AvatarProps) {
  const sizeStyles = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
  };

  if (!src) {
    const initial = fallback?.[0]?.toUpperCase() || alt?.[0]?.toUpperCase() || "?";
    return (
      <div
        className={`inline-flex items-center justify-center rounded-full bg-gray-200 text-gray-600 ${sizeStyles[size]} ${className}`}
      >
        <span className="text-sm font-medium">{initial}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={`inline-block rounded-full ${sizeStyles[size]} ${className}`}
    />
  );
}
