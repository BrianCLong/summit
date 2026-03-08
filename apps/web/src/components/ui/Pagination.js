"use strict";
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
exports.Pagination = Pagination;
const React = __importStar(require("react"));
const lucide_react_1 = require("lucide-react");
const utils_1 = require("@/lib/utils");
const Button_1 = require("./Button");
function Pagination({ currentPage, totalPages, onPageChange, showFirstLast = true, className, }) {
    const getVisiblePages = () => {
        const delta = 2;
        const range = [];
        const rangeWithDots = [];
        for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
            range.push(i);
        }
        if (currentPage - delta > 2) {
            rangeWithDots.push(1, '...');
        }
        else {
            rangeWithDots.push(1);
        }
        rangeWithDots.push(...range);
        if (currentPage + delta < totalPages - 1) {
            rangeWithDots.push('...', totalPages);
        }
        else if (totalPages > 1) {
            rangeWithDots.push(totalPages);
        }
        return rangeWithDots;
    };
    const visiblePages = getVisiblePages();
    if (totalPages <= 1) {
        return null;
    }
    return (<div className={(0, utils_1.cn)('flex items-center justify-center space-x-2', className)}>
      {showFirstLast && (<Button_1.Button variant="outline" size="icon" onClick={() => onPageChange(1)} disabled={currentPage === 1}>
          <lucide_react_1.ChevronsLeft className="h-4 w-4"/>
          <span className="sr-only">Go to first page</span>
        </Button_1.Button>)}

      <Button_1.Button variant="outline" size="icon" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}>
        <lucide_react_1.ChevronLeft className="h-4 w-4"/>
        <span className="sr-only">Go to previous page</span>
      </Button_1.Button>

      {visiblePages.map((page, index) => (<React.Fragment key={index}>
          {page === '...' ? (<Button_1.Button variant="ghost" size="icon" disabled>
              <lucide_react_1.MoreHorizontal className="h-4 w-4"/>
            </Button_1.Button>) : (<Button_1.Button variant={currentPage === page ? 'default' : 'outline'} size="icon" onClick={() => onPageChange(page)}>
              {page}
            </Button_1.Button>)}
        </React.Fragment>))}

      <Button_1.Button variant="outline" size="icon" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}>
        <lucide_react_1.ChevronRight className="h-4 w-4"/>
        <span className="sr-only">Go to next page</span>
      </Button_1.Button>

      {showFirstLast && (<Button_1.Button variant="outline" size="icon" onClick={() => onPageChange(totalPages)} disabled={currentPage === totalPages}>
          <lucide_react_1.ChevronsRight className="h-4 w-4"/>
          <span className="sr-only">Go to last page</span>
        </Button_1.Button>)}
    </div>);
}
