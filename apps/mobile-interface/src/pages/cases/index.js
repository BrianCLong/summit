"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck - Placeholder components and API client compatibility
const react_1 = require("react");
const head_1 = __importDefault(require("next/head"));
const link_1 = __importDefault(require("next/link"));
const framer_motion_1 = require("framer-motion");
const outline_1 = require("@heroicons/react/24/outline");
const MobileLayout_1 = require("@/components/layouts/MobileLayout");
const SearchBar_1 = require("@/components/SearchBar");
const FilterPanel_1 = require("@/components/FilterPanel");
const LoadingSpinner_1 = require("@/components/LoadingSpinner");
const EmptyState_1 = require("@/components/EmptyState");
const Badge_1 = require("@/components/Badge");
const Avatar_1 = require("@/components/Avatar");
const react_query_1 = require("@tanstack/react-query");
const api_1 = require("@/services/api");
const useAuth_1 = require("@/hooks/useAuth");
const useOffline_1 = require("@/hooks/useOffline");
const date_fns_1 = require("date-fns");
const CasesPage = () => {
    const { user } = (0, useAuth_1.useAuth)();
    const { isOffline } = (0, useOffline_1.useOffline)();
    const [searchQuery, setSearchQuery] = (0, react_1.useState)('');
    const [showFilters, setShowFilters] = (0, react_1.useState)(false);
    const [filters, setFilters] = (0, react_1.useState)({
        status: [],
        priority: [],
        assignee: [],
    });
    const { data: cases = [], isLoading, } = (0, react_query_1.useQuery)({
        queryKey: ['cases', searchQuery, filters],
        queryFn: () => api_1.apiClient.getCases({ search: searchQuery, ...filters }),
        enabled: !!user && !isOffline,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
    const filteredCases = cases.filter((case_) => case_.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        case_.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const getStatusColor = (status) => {
        switch (status) {
            case 'active':
                return 'success';
            case 'pending':
                return 'warning';
            case 'resolved':
                return 'primary';
            case 'closed':
                return 'intel';
            default:
                return 'intel';
        }
    };
    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'critical':
                return 'danger';
            case 'high':
                return 'warning';
            case 'medium':
                return 'primary';
            case 'low':
                return 'intel';
            default:
                return 'intel';
        }
    };
    if (isLoading) {
        return (<MobileLayout_1.MobileLayout>
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner_1.LoadingSpinner size="lg"/>
        </div>
      </MobileLayout_1.MobileLayout>);
    }
    return (<>
      <head_1.default>
        <title>Cases - IntelGraph Mobile</title>
        <meta name="description" content="Manage investigation cases"/>
      </head_1.default>

      <MobileLayout_1.MobileLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-intel-900 dark:text-white">
                Cases
              </h1>
              <p className="text-intel-600 dark:text-intel-400 mt-1">
                {filteredCases.length} of {cases.length} cases
              </p>
            </div>

            <link_1.default href="/cases/new" className="bg-primary-600 hover:bg-primary-700 text-white p-3 rounded-xl transition-colors shadow-lg">
              <outline_1.PlusIcon className="w-6 h-6"/>
            </link_1.default>
          </div>

          {/* Search and Filter */}
          <div className="space-y-4">
            <SearchBar_1.SearchBar placeholder="Search cases..." onSearch={setSearchQuery} showVoiceSearch/>

            <div className="flex items-center space-x-3">
              <button onClick={() => setShowFilters(!showFilters)} className={`
                  flex items-center space-x-2 px-4 py-2 rounded-xl border transition-colors
                  ${showFilters
            ? 'bg-primary-100 dark:bg-primary-900/50 border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-300'
            : 'bg-white dark:bg-intel-800 border-intel-200 dark:border-intel-700 text-intel-700 dark:text-intel-300'}
                `}>
                <outline_1.FunnelIcon className="w-5 h-5"/>
                <span className="text-sm font-medium">Filters</span>
                {filters.status.length +
            filters.priority.length +
            filters.assignee.length >
            0 && (<Badge_1.Badge variant="primary" size="sm">
                    {filters.status.length +
                filters.priority.length +
                filters.assignee.length}
                  </Badge_1.Badge>)}
              </button>
            </div>

            {/* Filter Panel */}
            {showFilters && (<framer_motion_1.motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-white dark:bg-intel-800 rounded-xl p-4 border border-intel-200 dark:border-intel-700">
                <FilterPanel_1.FilterPanel filters={[
                {
                    key: 'status',
                    label: 'Status',
                    options: [
                        { value: 'active', label: 'Active' },
                        { value: 'pending', label: 'Pending' },
                        { value: 'resolved', label: 'Resolved' },
                        { value: 'closed', label: 'Closed' },
                    ],
                    selected: filters.status,
                },
                {
                    key: 'priority',
                    label: 'Priority',
                    options: [
                        { value: 'critical', label: 'Critical' },
                        { value: 'high', label: 'High' },
                        { value: 'medium', label: 'Medium' },
                        { value: 'low', label: 'Low' },
                    ],
                    selected: filters.priority,
                },
            ]} onChange={(key, values) => {
                setFilters((prev) => ({ ...prev, [key]: values }));
            }} onClear={() => {
                setFilters({ status: [], priority: [], assignee: [] });
            }}/>
              </framer_motion_1.motion.div>)}
          </div>

          {/* Cases List */}
          {filteredCases.length === 0 ? (<EmptyState_1.EmptyState icon={outline_1.FolderIcon} title="No cases found" description={searchQuery
                ? 'Try adjusting your search or filters'
                : 'Create your first case to get started'} action={<link_1.default href="/cases/new" className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-xl font-medium transition-colors">
                  Create Case
                </link_1.default>}/>) : (<div className="space-y-4">
              {filteredCases.map((case_, index) => (<framer_motion_1.motion.div key={case_.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
                  <link_1.default href={`/cases/${case_.id}`}>
                    <div className="bg-white dark:bg-intel-800 rounded-xl p-4 border border-intel-200 dark:border-intel-700 hover:border-primary-300 dark:hover:border-primary-700 transition-colors">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-intel-900 dark:text-white truncate">
                            {case_.title}
                          </h3>
                          <p className="text-sm text-intel-600 dark:text-intel-400 mt-1 line-clamp-2">
                            {case_.description}
                          </p>
                        </div>

                        <button className="p-2 -mr-2 text-intel-400 hover:text-intel-600 dark:hover:text-intel-300 transition-colors">
                          <outline_1.EllipsisVerticalIcon className="w-5 h-5"/>
                        </button>
                      </div>

                      {/* Status and Priority */}
                      <div className="flex items-center space-x-2 mb-3">
                        <Badge_1.Badge variant={getStatusColor(case_.status)} size="sm">
                          {case_.status}
                        </Badge_1.Badge>
                        <Badge_1.Badge variant={getPriorityColor(case_.priority)} size="sm">
                          {case_.priority}
                        </Badge_1.Badge>
                        {case_.entityCount > 0 && (<span className="text-xs text-intel-500 dark:text-intel-400">
                            {case_.entityCount} entities
                          </span>)}
                      </div>

                      {/* Tags */}
                      {case_.tags.length > 0 && (<div className="flex flex-wrap gap-1 mb-3">
                          {case_.tags.slice(0, 3).map((tag) => (<span key={tag} className="inline-block px-2 py-1 text-xs bg-intel-100 dark:bg-intel-700 text-intel-700 dark:text-intel-300 rounded-md">
                              {tag}
                            </span>))}
                          {case_.tags.length > 3 && (<span className="inline-block px-2 py-1 text-xs bg-intel-100 dark:bg-intel-700 text-intel-500 dark:text-intel-400 rounded-md">
                              +{case_.tags.length - 3}
                            </span>)}
                        </div>)}

                      {/* Footer */}
                      <div className="flex items-center justify-between text-sm text-intel-500 dark:text-intel-400">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-1">
                            <Avatar_1.Avatar src={case_.assignee.avatar} alt={case_.assignee.name} size="sm" fallback={case_.assignee.name.charAt(0)}/>
                            <span>{case_.assignee.name}</span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-1">
                          <outline_1.ClockIcon className="w-4 h-4"/>
                          <span>
                            {(0, date_fns_1.formatDistanceToNow)(new Date(case_.updatedAt), {
                    addSuffix: true,
                })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </link_1.default>
                </framer_motion_1.motion.div>))}
            </div>)}

          {/* Offline Indicator */}
          {isOffline && (<div className="bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 rounded-xl p-4 text-center">
              <p className="text-warning-800 dark:text-warning-200 font-medium">
                Showing cached cases
              </p>
              <p className="text-warning-600 dark:text-warning-400 text-sm mt-1">
                Data will refresh when connection is restored
              </p>
            </div>)}
        </div>
      </MobileLayout_1.MobileLayout>
    </>);
};
exports.default = CasesPage;
