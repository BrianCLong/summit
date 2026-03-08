"use strict";
/**
 * Help Tooltip Component
 * Inline help tooltip that appears on hover/focus
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.HelpTooltip = HelpTooltip;
const react_1 = __importStar(require("react"));
const HelpContext_js_1 = require("../HelpContext.js");
function HelpTooltip({ anchorKey, children, placement = 'top', }) {
    const { fetchContextualHelp, setCurrentArticle, openHelp } = (0, HelpContext_js_1.useHelp)();
    const [isVisible, setIsVisible] = (0, react_1.useState)(false);
    const [tooltipContent, setTooltipContent] = (0, react_1.useState)(null);
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const containerRef = (0, react_1.useRef)(null);
    const timeoutRef = (0, react_1.useRef)();
    const fetchContent = (0, react_1.useCallback)(async () => {
        if (tooltipContent)
            return; // Already loaded
        setIsLoading(true);
        try {
            const currentPath = window.location.pathname;
            const result = await fetchContextualHelp(currentPath, anchorKey);
            if (result && result.articles.length > 0) {
                setTooltipContent(result.articles[0]);
            }
        }
        finally {
            setIsLoading(false);
        }
    }, [anchorKey, fetchContextualHelp, tooltipContent]);
    const handleMouseEnter = (0, react_1.useCallback)(() => {
        timeoutRef.current = setTimeout(() => {
            setIsVisible(true);
            fetchContent();
        }, 300);
    }, [fetchContent]);
    const handleMouseLeave = (0, react_1.useCallback)(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        setIsVisible(false);
    }, []);
    const handleClick = (0, react_1.useCallback)(() => {
        if (tooltipContent) {
            setCurrentArticle(tooltipContent);
            openHelp();
        }
    }, [tooltipContent, setCurrentArticle, openHelp]);
    // Cleanup timeout on unmount
    (0, react_1.useEffect)(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);
    const containerStyles = {
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
    };
    const iconStyles = {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '16px',
        height: '16px',
        marginLeft: '4px',
        borderRadius: '50%',
        backgroundColor: '#e0e0e0',
        color: '#666',
        fontSize: '11px',
        fontWeight: 'bold',
        cursor: 'pointer',
    };
    const getTooltipPosition = () => {
        const base = {
            position: 'absolute',
            zIndex: 1001,
            backgroundColor: '#fff',
            border: '1px solid #ddd',
            borderRadius: '6px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
            padding: '12px',
            width: '250px',
            maxWidth: '90vw',
        };
        switch (placement) {
            case 'top':
                return { ...base, bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '8px' };
            case 'bottom':
                return { ...base, top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: '8px' };
            case 'left':
                return { ...base, right: '100%', top: '50%', transform: 'translateY(-50%)', marginRight: '8px' };
            case 'right':
                return { ...base, left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: '8px' };
            default:
                return base;
        }
    };
    return (<span ref={containerRef} style={containerStyles} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      {children}
      <span style={iconStyles} onClick={handleClick} onKeyDown={(e) => e.key === 'Enter' && handleClick()} tabIndex={0} role="button" aria-label="Help">
        ?
      </span>

      {isVisible && (<div style={getTooltipPosition()} role="tooltip">
          {isLoading ? (<span style={{ color: '#666', fontSize: '13px' }}>Loading...</span>) : tooltipContent ? (<>
              <strong style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>
                {tooltipContent.title}
              </strong>
              {tooltipContent.currentVersion?.summary && (<p style={{ margin: 0, fontSize: '13px', color: '#666' }}>
                  {tooltipContent.currentVersion.summary}
                </p>)}
              <button type="button" onClick={handleClick} style={{
                    marginTop: '8px',
                    padding: '4px 8px',
                    fontSize: '12px',
                    backgroundColor: '#0066cc',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                }}>
                Read more
              </button>
            </>) : (<span style={{ color: '#666', fontSize: '13px' }}>
              No help available
            </span>)}
        </div>)}
    </span>);
}
