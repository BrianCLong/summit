import React, { useEffect, useState, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  Tooltip,
} from '@mui/material';
import { AccountTree, CheckCircle, Error as ErrorIcon } from '@mui/icons-material';
import Tree from 'react-d3-tree';
import CryptoJS from 'crypto-js';
import type { DisclosureBundle, MerkleNode } from '../types';
import { ProvenanceLedgerClient } from '../api/client';

interface MerkleTreeViewerProps {
  caseId: string;
  client: ProvenanceLedgerClient;
  onVerify?: (valid: boolean, tamperedNodes?: string[]) => void;
}

export const MerkleTreeViewer: React.FC<MerkleTreeViewerProps> = ({
  caseId,
  client,
  onVerify,
}) => {
  const [bundle, setBundle] = useState<DisclosureBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tamperedNodes, setTamperedNodes] = useState<Set<string>>(new Set());

  useEffect(() => {
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
    } catch (err: any) {
      setError(err.message || 'Failed to load disclosure bundle');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Build Merkle tree from hash tree
   */
  const buildMerkleTree = (hashes: string[]): MerkleNode => {
    if (hashes.length === 0) {
      return { hash: '', level: 0, isLeaf: false };
    }

    const leaves: MerkleNode[] = hashes.map((hash, index) => ({
      hash,
      level: 0,
      isLeaf: true,
      evidenceId: bundle?.evidence[index]?.id,
    }));

    let currentLevel = leaves;
    let level = 1;

    while (currentLevel.length > 1) {
      const nextLevel: MerkleNode[] = [];

      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left;

        const combined = left.hash + right.hash;
        const parentHash = CryptoJS.SHA256(combined).toString();

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
  const verifyMerkleTree = (bundleData: DisclosureBundle): string[] => {
    const tree = buildMerkleTree(bundleData.hashTree);
    const tampered: string[] = [];

    const verify = (node: MerkleNode): void => {
      if (node.isLeaf) return;

      if (node.left && node.right) {
        const combined = node.left.hash + node.right.hash;
        const expectedHash = CryptoJS.SHA256(combined).toString();

        if (expectedHash !== node.hash) {
          tampered.push(node.hash);
        }

        verify(node.left);
        verify(node.right);
      } else if (node.left) {
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
  const treeData = useMemo(() => {
    if (!bundle) return null;

    const tree = buildMerkleTree(bundle.hashTree);

    const convert = (node: MerkleNode): any => {
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
        children:
          !node.isLeaf && (node.left || node.right)
            ? [node.left && convert(node.left), node.right && convert(node.right)].filter(Boolean)
            : undefined,
      };
    };

    return convert(tree);
  }, [bundle, tamperedNodes]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (!bundle || !treeData) {
    return <Alert severity="warning">No disclosure bundle found</Alert>;
  }

  const isValid = tamperedNodes.size === 0;

  return (
    <Box>
      {/* Header */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" display="flex" alignItems="center" gap={1}>
              <AccountTree />
              Merkle Proof Visualization
            </Typography>
            <Chip
              icon={isValid ? <CheckCircle /> : <ErrorIcon />}
              label={isValid ? 'Integrity Verified' : `${tamperedNodes.size} Node(s) Tampered`}
              color={isValid ? 'success' : 'error'}
            />
          </Box>

          <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mt: 2 }}>
            Case ID: {bundle.caseId}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Evidence Count: {bundle.evidence.length}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Merkle Root:{' '}
            <Tooltip title={bundle.merkleRoot}>
              <code>{bundle.merkleRoot.slice(0, 16)}...</code>
            </Tooltip>
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Generated: {new Date(bundle.generated_at).toLocaleString()}
          </Typography>
        </CardContent>
      </Card>

      {/* Tree Visualization */}
      <Card>
        <CardContent>
          <Box height={500}>
            <Tree
              data={treeData}
              orientation="vertical"
              pathFunc="step"
              translate={{ x: 400, y: 50 }}
              nodeSize={{ x: 200, y: 100 }}
              separation={{ siblings: 1, nonSiblings: 1.5 }}
              renderCustomNodeElement={({ nodeDatum }: any) => (
                <g>
                  <circle
                    r={20}
                    fill={
                      nodeDatum.attributes?.Status?.includes('Tampered')
                        ? '#f44336'
                        : '#4caf50'
                    }
                  />
                  <text fill="white" strokeWidth="0" x="0" y="5" textAnchor="middle">
                    {nodeDatum.attributes?.Status?.includes('Tampered') ? '⚠' : '✓'}
                  </text>
                  <text fill="black" x="30" y="5" fontSize="12">
                    {nodeDatum.name}
                  </text>
                  <text fill="gray" x="30" y="20" fontSize="10">
                    {nodeDatum.attributes?.Hash}
                  </text>
                </g>
              )}
            />
          </Box>
        </CardContent>
      </Card>

      {/* Evidence List */}
      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Evidence Chain
          </Typography>
          {bundle.evidence.map((evidence, index) => (
            <Box
              key={evidence.id}
              sx={{
                p: 1.5,
                mb: 1,
                border: '1px solid',
                borderColor: 'grey.300',
                borderRadius: 1,
                bgcolor: 'grey.50',
              }}
            >
              <Typography variant="body2" fontWeight="medium">
                {index + 1}. {evidence.sourceRef}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                ID: {evidence.id}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                Checksum: {evidence.checksum.slice(0, 16)}...
              </Typography>
              {evidence.transformChain.length > 0 && (
                <Box mt={0.5}>
                  {evidence.transformChain.map((transform, i) => (
                    <Chip
                      key={i}
                      label={transform.transformType}
                      size="small"
                      sx={{ mr: 0.5, mt: 0.5 }}
                    />
                  ))}
                </Box>
              )}
            </Box>
          ))}
        </CardContent>
      </Card>
    </Box>
  );
};
