import React, { useState, useRef, useEffect } from "react";
import { useMutation, gql } from "@apollo/client";
import * as d3 from "d3";

const ANALYZE_STEGO_MUTATION = gql`
  mutation AnalyzeStego($mediaDataInput: JSON!) {
    analyzeStego(mediaDataInput: $mediaDataInput) {
      risk_matrix
      recommendations
      entropy
      simulated_dct_diffs_mean
      note
    }
  }
`;

const MatrixGraph: React.FC<{ matrix: number[][] }> = ({ matrix }) => {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current || !matrix || matrix.length === 0) return;

    const numRows = matrix.length;
    const numCols = matrix[0].length;
    const cellSize = 30;
    const width = cellSize * numCols;
    const height = cellSize * numRows;

    const container = d3.select(ref.current);
    container.selectAll("*").remove();

    const svg = container
      .append("svg")
      .attr("width", width)
      .attr("height", height);

    const x = d3
      .scaleBand<number>()
      .domain(d3.range(numCols))
      .range([0, width]);
    const y = d3
      .scaleBand<number>()
      .domain(d3.range(numRows))
      .range([0, height]);

    const maxValue = d3.max(matrix.flat()) ?? 0;
    const color = d3.scaleSequential(d3.interpolateBlues).domain([0, maxValue]);

    const tooltip = container
      .append("div")
      .style("position", "absolute")
      .style("visibility", "hidden")
      .style("background", "#fff")
      .style("padding", "4px 8px")
      .style("border", "1px solid #ccc")
      .style("border-radius", "4px")
      .style("font-size", "12px");

    svg
      .selectAll("g")
      .data(matrix)
      .enter()
      .append("g")
      .attr("transform", (_, i) => `translate(0,${y(i)!})`)
      .selectAll("rect")
      .data((row, i) => row.map((value, j) => ({ value, row: i, col: j })))
      .enter()
      .append("rect")
      .attr("x", (d) => x(d.col)!)
      .attr("y", 0)
      .attr("width", x.bandwidth())
      .attr("height", y.bandwidth())
      .attr("fill", (d) => color(d.value))
      .on("mouseover", (event, d) => {
        tooltip
          .style("visibility", "visible")
          .text(`Encoded ${d.row}, Decoded ${d.col}: ${d.value}`);
      })
      .on("mousemove", (event) => {
        tooltip
          .style("top", `${event.pageY - 10}px`)
          .style("left", `${event.pageX + 10}px`);
      })
      .on("mouseout", () => tooltip.style("visibility", "hidden"));
  }, [matrix]);

  return <div ref={ref} className="relative" />;
};

const StegoAnalyzer: React.FC = () => {
  const [mediaData, setMediaData] = useState("");
  const [stegoParams, setStegoParams] = useState("");
  const [analyzeStego, { data, loading, error }] = useMutation(
    ANALYZE_STEGO_MUTATION,
  );

  const handleSubmit = async () => {
    try {
      const parsedMediaData = mediaData; // This should be base64 string
      const parsedStegoParams = stegoParams ? JSON.parse(stegoParams) : {};
      await analyzeStego({
        variables: {
          mediaDataInput: { data: parsedMediaData, params: parsedStegoParams },
        },
      });
    } catch (e) {
      alert(
        "Invalid input. Media data should be base64 string, params should be JSON.",
      );
      console.error(e);
    }
  };

  return (
    <div className="stego-analyzer">
      <textarea
        className="w-full p-2 border rounded mb-4"
        rows={6}
        placeholder="Enter media data (e.g., base64 encoded image string)"
        value={mediaData}
        onChange={(e) => setMediaData(e.target.value)}
      ></textarea>
      <textarea
        className="w-full p-2 border rounded mb-4"
        rows={3}
        placeholder="Enter optional parameters in JSON format (e.g., { 'scan_type': 'full' })"
        value={stegoParams}
        onChange={(e) => setStegoParams(e.target.value)}
      ></textarea>
      <button
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        onClick={handleSubmit}
        disabled={loading}
      >
        {loading ? "Analyzing..." : "Run Steganographic Analysis"}
      </button>

      {error && <p className="text-red-500 mt-4">Error: {error.message}</p>}
      {data && (
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <h3 className="font-semibold">Analysis Results:</h3>
          <pre className="whitespace-pre-wrap text-sm">
            {JSON.stringify(data.analyzeStego, null, 2)}
          </pre>
          {Array.isArray(data.analyzeStego?.risk_matrix) && (
            <div className="mt-4">
              <h4 className="font-semibold mb-2">Encoded vs Decoded Matrix</h4>
              <MatrixGraph matrix={data.analyzeStego.risk_matrix} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StegoAnalyzer;
