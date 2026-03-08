"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_router_dom_1 = require("react-router-dom");
const MaestroLayout_1 = require("./layouts/MaestroLayout");
const DashboardPage_1 = require("./pages/DashboardPage");
const RunsPage_1 = require("./pages/RunsPage");
const RunDetailPage_1 = require("./pages/RunDetailPage");
const AgentsPage_1 = require("./pages/AgentsPage");
const AutonomicPage_1 = require("./pages/AutonomicPage");
const MergeTrainsPage_1 = require("./pages/MergeTrainsPage");
const ExperimentsPage_1 = require("./pages/ExperimentsPage");
const GovernancePage_1 = require("./pages/GovernancePage");
const MaestroApp = () => {
    return (<react_router_dom_1.BrowserRouter>
      <react_router_dom_1.Routes>
        <react_router_dom_1.Route path="/" element={<react_router_dom_1.Navigate to="/maestro" replace/>}/>
        <react_router_dom_1.Route path="/maestro" element={<MaestroLayout_1.MaestroLayout />}>
          <react_router_dom_1.Route index element={<DashboardPage_1.DashboardPage />}/>
          <react_router_dom_1.Route path="runs" element={<RunsPage_1.RunsPage />}/>
          <react_router_dom_1.Route path="runs/:id" element={<RunDetailPage_1.RunDetailPage />}/>
          <react_router_dom_1.Route path="agents" element={<AgentsPage_1.AgentsPage />}/>
          <react_router_dom_1.Route path="autonomic" element={<AutonomicPage_1.AutonomicPage />}/>
          <react_router_dom_1.Route path="merge-trains" element={<MergeTrainsPage_1.MergeTrainsPage />}/>
          <react_router_dom_1.Route path="experiments" element={<ExperimentsPage_1.ExperimentsPage />}/>
          <react_router_dom_1.Route path="policy" element={<GovernancePage_1.GovernancePage />}/>
        </react_router_dom_1.Route>
      </react_router_dom_1.Routes>
    </react_router_dom_1.BrowserRouter>);
};
exports.default = MaestroApp;
