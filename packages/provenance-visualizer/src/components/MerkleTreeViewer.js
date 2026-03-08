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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MerkleTreeViewer = void 0;
// @ts-nocheck
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
const react_d3_tree_1 = __importDefault(require("react-d3-tree"));
const crypto_js_1 = __importDefault(require("crypto-js"));
const MerkleTreeViewer = ({ caseId, client, onVerify, }) => {
    const [bundle, setBundle] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    const [tamperedNodes, setTamperedNodes] = (0, react_1.useState)(new Set());
    (0, react_1.useEffect)(() => {
        loadBundle();
    }, [caseId]);
    const loadBundle = async () => {
        try {
            setLoading(true);
            setError(null);
            const bundleData = await client.getDisclosureBundle(caseId);
            setBundle(bundleData);
            // Verify Merkle tree
            const tampered = verifyMerkleTree(bundleData);
            setTamperedNodes(new Set(tampered));
            onVerify?.(tampered.length === 0, tampered);
        }
        catch (err) {
            setError(err.message || 'Failed to load disclosure bundle');
        }
        finally {
            setLoading(false);
        }
    };
    /**
     * Build Merkle tree from hash tree
     */
    const buildMerkleTree = (hashes) => {
        if (hashes.length === 0) {
            return { hash: '', level: 0, isLeaf: false };
        }
        const leaves = hashes.map((hash, index) => ({
            hash,
            level: 0,
            isLeaf: true,
            evidenceId: bundle?.evidence[index]?.id,
        }));
        let currentLevel = leaves;
        let level = 1;
        while (currentLevel.length > 1) {
            const nextLevel = [];
            for (let i = 0; i < currentLevel.length; i += 2) {
                const left = currentLevel[i];
                const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left;
                const combined = left.hash + right.hash;
                const parentHash = crypto_js_1.default.SHA256(combined).toString();
                nextLevel.push({
                    hash: parentHash,
                    left,
                    right: i + 1 < currentLevel.length ? right : undefined,
                    level,
                    isLeaf: false,
                });
            }
            currentLevel = nextLevel;
            level++;
        }
        return currentLevel[0];
    };
    /**
     * Verify Merkle tree integrity
     */
    const verifyMerkleTree = (bundleData) => {
        const tree = buildMerkleTree(bundleData.hashTree);
        const tampered = [];
        const verify = (node) => {
            if (node.isLeaf)
                return;
            if (node.left && node.right) {
                const combined = node.left.hash + node.right.hash;
                const expectedHash = crypto_js_1.default.SHA256(combined).toString();
                if (expectedHash !== node.hash) {
                    tampered.push(node.hash);
                }
                verify(node.left);
                verify(node.right);
            }
            else if (node.left) {
                verify(node.left);
            }
        };
        verify(tree);
        // Verify root matches
        if (tree.hash !== bundleData.merkleRoot) {
            tampered.push('root');
        }
        return tampered;
    };
    /**
     * Convert Merkle tree to react-d3-tree format
     */
    const treeData = (0, react_1.useMemo)(() => {
        if (!bundle)
            return null;
        const tree = buildMerkleTree(bundle.hashTree);
        const convert = (node) => {
            const isTampered = tamperedNodes.has(node.hash);
            return {
                name: node.isLeaf
                    ? `Evidence ${node.evidenceId?.slice(-8)}`
                    : `Node ${node.hash.slice(0, 8)}...`,
                attributes: {
                    Hash: node.hash.slice(0, 16) + '...',
                    Level: node.level.toString(),
                    Status: isTampered ? '⚠️ Tampered' : '✓ Verified',
                },
                nodeSvgShape: {
                    shape: node.isLeaf ? 'circle' : 'rect',
                    shapeProps: {
                        r: 10,
                        width: 20,
                        height: 20,
                        x: -10,
                        y: -10,
                        fill: isTampered ? '#f44336' : '#4caf50',
                    },
                },
                children: !node.isLeaf && (node.left || node.right)
                    ? [node.left && convert(node.left), node.right && convert(node.right)].filter(Boolean)
                    : undefined,
            };
        };
        return convert(tree);
    }, [bundle, tamperedNodes]);
    if (loading) {
        return (<material_1.Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <material_1.CircularProgress />
      </material_1.Box>);
    }
    if (error) {
        return <material_1.Alert severity="error">{error}</material_1.Alert>;
    }
    if (!bundle || !treeData) {
        return <material_1.Alert severity="warning">No disclosure bundle found</material_1.Alert>;
    }
    const isValid = tamperedNodes.size === 0;
    return (<material_1.Box>
      {/* Header */}
      <material_1.Card sx={{ mb: 2 }}>
        <material_1.CardContent>
          <material_1.Box display="flex" justifyContent="space-between" alignItems="center">
            <material_1.Typography variant="h6" display="flex" alignItems="center" gap={1}>
              <icons_material_1.AccountTree />
              Merkle Proof Visualization
            </material_1.Typography>
            <material_1.Chip icon={isValid ? <icons_material_1.CheckCircle /> : <icons_material_1.Error />} label={isValid ? 'Integrity Verified' : `${tamperedNodes.size} Node(s) Tampered`} color={isValid ? 'success' : 'error'}/>
          </material_1.Box>

          <material_1.Typography variant="body2" color="text.secondary" gutterBottom sx={{ mt: 2 }}>
            Case ID: {bundle.caseId}
          </material_1.Typography>
          <material_1.Typography variant="body2" color="text.secondary" gutterBottom>
            Evidence Count: {bundle.evidence.length}
          </material_1.Typography>
          <material_1.Typography variant="body2" color="text.secondary" gutterBottom>
            Merkle Root:{' '}
            <material_1.Tooltip title={bundle.merkleRoot}>
              <code>{bundle.merkleRoot.slice(0, 16)}...</code>
            </material_1.Tooltip>
          </material_1.Typography>
          <material_1.Typography variant="body2" color="text.secondary">
            Generated: {new Date(bundle.generated_at).toLocaleString()}
          </material_1.Typography>
        </material_1.CardContent>
      </material_1.Card>

      {/* Tree Visualization */}
      <material_1.Card>
        <material_1.CardContent>
          <material_1.Box height={500}>
            <react_d3_tree_1.default data={treeData} orientation="vertical" pathFunc="step" translate={{ x: 400, y: 50 }} nodeSize={{ x: 200, y: 100 }} separation={{ siblings: 1, nonSiblings: 1.5 }} renderCustomNodeElement={({ nodeDatum }) => (<g>
                  <circle r={20} fill={nodeDatum.attributes?.Status?.includes('Tampered')
                ? '#f44336'
                : '#4caf50'}/>
                  <text fill="white" strokeWidth="0" x="0" y="5" textAnchor="middle">
                    {nodeDatum.attributes?.Status?.includes('Tampered') ? '⚠' : '✓'}
                  </text>
                  <text fill="black" x="30" y="5" fontSize="12">
                    {nodeDatum.name}
                  </text>
                  <text fill="gray" x="30" y="20" fontSize="10">
                    {nodeDatum.attributes?.Hash}
                  </text>
                </g>)}/>
          </material_1.Box>
        </material_1.CardContent>
      </material_1.Card>

      {/* Evidence List */}
      <material_1.Card sx={{ mt: 2 }}>
        <material_1.CardContent>
          <material_1.Typography variant="h6" gutterBottom>
            Evidence Chain
          </material_1.Typography>
          {bundle.evidence.map((evidence, index) => (<material_1.Box key={evidence.id} sx={{
                p: 1.5,
                mb: 1,
                border: '1px solid',
                borderColor: 'grey.300',
                borderRadius: 1,
                bgcolor: 'grey.50',
            }}>
              <material_1.Typography variant="body2" fontWeight="medium">
                {index + 1}. {evidence.sourceRef}
              </material_1.Typography>
              <material_1.Typography variant="caption" color="text.secondary" display="block">
                ID: {evidence.id}
              </material_1.Typography>
              <material_1.Typography variant="caption" color="text.secondary" display="block">
                Checksum: {evidence.checksum.slice(0, 16)}...
              </material_1.Typography>
              {evidence.transformChain.length > 0 && (<material_1.Box mt={0.5}>
                  {evidence.transformChain.map((transform, i) => (<material_1.Chip key={i} label={transform.transformType} size="small" sx={{ mr: 0.5, mt: 0.5 }}/>))}
                </material_1.Box>)}
            </material_1.Box>))}
        </material_1.CardContent>
      </material_1.Card>
    </material_1.Box>);
};
exports.MerkleTreeViewer = MerkleTreeViewer;
