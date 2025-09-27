import React from "react";
import { Box, Tooltip, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";

interface RelationshipCount {
  fromType: string;
  toType: string;
  count: number;
}

interface RelationshipMatrixProps {
  data: RelationshipCount[];
}

const RelationshipMatrix: React.FC<RelationshipMatrixProps> = ({ data }) => {
  const navigate = useNavigate();

  const types = Array.from(
    new Set(data.flatMap((d) => [d.fromType, d.toType])),
  ).sort();
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  const getCount = (from: string, to: string) => {
    return data.find((d) => d.fromType === from && d.toType === to)?.count || 0;
  };

  const handleCellClick = (from: string, to: string) => {
    navigate(`/relationships?fromType=${from}&toType=${to}`);
  };

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: `100px repeat(${types.length}, 1fr)`,
        gridAutoRows: 40,
        gap: 1,
      }}
    >
      <Box />
      {types.map((type) => (
        <Box
          key={`col-${type}`}
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 500,
          }}
        >
          {type}
        </Box>
      ))}
      {types.map((row) => (
        <React.Fragment key={row}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              pr: 1,
              fontWeight: 500,
            }}
          >
            {row}
          </Box>
          {types.map((col) => {
            const count = getCount(row, col);
            const intensity = count / maxCount;
            const backgroundColor = `rgba(25, 118, 210, ${intensity})`;
            return (
              <Tooltip
                key={`${row}-${col}`}
                title={`${count} relationships between ${row} and ${col}`}
              >
                <Box
                  onClick={() => handleCellClick(row, col)}
                  sx={{
                    backgroundColor,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: intensity > 0.6 ? "common.white" : "text.primary",
                    borderRadius: 1,
                  }}
                >
                  <Typography variant="caption">{count}</Typography>
                </Box>
              </Tooltip>
            );
          })}
        </React.Fragment>
      ))}
    </Box>
  );
};

export default RelationshipMatrix;
