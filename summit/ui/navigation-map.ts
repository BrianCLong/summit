export const NavigationMap = [
  { label: "Dashboard", path: "/dashboard", icon: "dashboard", permissions: ["viewer", "analyst", "operator", "admin"] },
  { label: "Investigations", path: "/investigations", icon: "search", permissions: ["analyst", "operator", "admin"] },
  { label: "IntelGraph", path: "/intelgraph", icon: "share-2", permissions: ["analyst", "operator", "admin"] },
  { label: "Repositories", path: "/repositories", icon: "folder", permissions: ["viewer", "analyst", "operator", "admin"] },
  { label: "Architecture Intelligence", path: "/architecture", icon: "box", permissions: ["analyst", "operator", "admin"] },
  { label: "Agents", path: "/agents", icon: "cpu", permissions: ["analyst", "operator", "admin"] },
  { label: "Simulations", path: "/simulations", icon: "play-circle", permissions: ["operator", "admin"] },
  { label: "Threat Intelligence", path: "/threat", icon: "shield", permissions: ["analyst", "operator", "admin"] },
  { label: "Data Sources", path: "/data", icon: "database", permissions: ["analyst", "operator", "admin"] },
  { label: "Experiments", path: "/experiments", icon: "flask-conical", permissions: ["operator", "admin"] },
  { label: "Governance", path: "/governance", icon: "briefcase", permissions: ["viewer", "analyst", "operator", "admin"] },
  { label: "Operations", path: "/operations", icon: "activity", permissions: ["operator", "admin"] },
  { label: "Settings", path: "/settings", icon: "settings", permissions: ["admin"] }
];
