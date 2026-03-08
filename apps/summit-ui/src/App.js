"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.App = App;
const react_1 = require("react");
const Nav_1 = require("./components/Nav");
const Dashboard_1 = require("./pages/Dashboard");
const PromptSearch_1 = require("./pages/PromptSearch");
const ArtifactBrowser_1 = require("./pages/ArtifactBrowser");
const GoNoGo_1 = require("./pages/GoNoGo");
require("./styles/app.css");
function getInitialPage() {
    const hash = window.location.hash.replace('#', '');
    return ['dashboard', 'prompts', 'artifacts', 'release'].includes(hash) ? hash : 'dashboard';
}
function App() {
    const [page, setPage] = (0, react_1.useState)(getInitialPage);
    const navigate = (p) => {
        setPage(p);
        window.location.hash = p;
    };
    return (<div className="app">
      <Nav_1.Nav page={page} onNavigate={navigate}/>
      <main className="main" id="main-content">
        {page === 'dashboard' && <Dashboard_1.Dashboard />}
        {page === 'prompts' && <PromptSearch_1.PromptSearch />}
        {page === 'artifacts' && <ArtifactBrowser_1.ArtifactBrowser />}
        {page === 'release' && <GoNoGo_1.GoNoGo />}
      </main>
    </div>);
}
