import React, { useEffect, useRef, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import * as d3 from "d3";
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  OutlinedInput,
  Button,
  Stack,
} from "@mui/material";
import {
  fetchTimelineEvents,
  setFilterTypes,
  setFilterTags,
  selectEvent,
} from "../../store/slices/timelineSlice";
import { setSelectedNode } from "../../store/slices/graphSlice";

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

const TimelineView = () => {
  const dispatch = useDispatch();
  const { events, filterTypes, filterTags, selectedEventId } = useSelector(
    (state) => state.timeline,
  );
  const selectedNode = useSelector((state) => state.graph.selectedNode);
  const svgRef = useRef(null);

  useEffect(() => {
    dispatch(fetchTimelineEvents());
  }, [dispatch]);

  useEffect(() => {
    if (selectedNode && selectedNode !== selectedEventId) {
      dispatch(selectEvent(selectedNode));
    }
  }, [selectedNode, selectedEventId, dispatch]);

  const allTags = useMemo(
    () => Array.from(new Set(events.flatMap((e) => e.tags || []))),
    [events],
  );

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      const typeMatch =
        filterTypes.length === 0 || filterTypes.includes(e.type);
      const tagMatch =
        filterTags.length === 0 ||
        (e.tags || []).some((t) => filterTags.includes(t));
      return typeMatch && tagMatch;
    });
  }, [events, filterTypes, filterTags]);

  useEffect(() => {
    if (!events.length) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = svgRef.current.clientWidth || 600;
    const height = svgRef.current.clientHeight || 200;
    const margin = { top: 20, right: 20, bottom: 30, left: 40 };

    const x = d3
      .scaleTime()
      .domain(d3.extent(filteredEvents, (d) => new Date(d.timestamp)))
      .range([margin.left, width - margin.right]);

    const categories = Array.from(new Set(events.map((e) => e.type)));
    const color = d3
      .scaleOrdinal()
      .domain(categories)
      .range(d3.schemeCategory10);

    const axis = svg
      .append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .attr("class", "axis")
      .call(d3.axisBottom(x));

    const content = svg.append("g").attr("class", "content");

    const circles = content
      .selectAll("circle")
      .data(filteredEvents)
      .join("circle")
      .attr("cx", (d) => x(new Date(d.timestamp)))
      .attr("cy", height / 2)
      .attr("r", 6)
      .attr("fill", (d) => color(d.type))
      .attr("stroke", (d) => (d.id === selectedEventId ? "#000" : "none"))
      .on("click", (_, d) => {
        dispatch(selectEvent(d.id));
        dispatch(setSelectedNode(d.id));
      });

    const legend = svg.append("g").attr("transform", "translate(10,10)");
    categories.forEach((cat, i) => {
      const g = legend.append("g").attr("transform", `translate(0,${i * 20})`);
      g.append("rect")
        .attr("width", 10)
        .attr("height", 10)
        .attr("fill", color(cat));
      g.append("text").attr("x", 15).attr("y", 10).text(cat);
    });

    const zoomed = (event) => {
      const newX = event.transform.rescaleX(x);
      axis.call(d3.axisBottom(newX));
      circles.attr("cx", (d) => newX(new Date(d.timestamp)));
    };

    svg.call(d3.zoom().scaleExtent([0.5, 10]).on("zoom", zoomed));
  }, [filteredEvents, events, selectedEventId, dispatch]);

  const handleExportPNG = () => {
    const svgElement = svgRef.current;
    if (!svgElement) return;
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgElement);
    const canvas = document.createElement("canvas");
    canvas.width = svgElement.clientWidth;
    canvas.height = svgElement.clientHeight;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      const a = document.createElement("a");
      a.download = "timeline.png";
      a.href = canvas.toDataURL("image/png");
      a.click();
    };
    img.src =
      "data:image/svg+xml;base64," +
      window.btoa(unescape(encodeURIComponent(svgString)));
  };

  const handleExportJSON = () => {
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(events, null, 2));
    const a = document.createElement("a");
    a.href = dataStr;
    a.download = "timeline.json";
    a.click();
  };

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Stack direction="row" spacing={1} sx={{ m: 1 }}>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel id="type-filter-label">Type</InputLabel>
          <Select
            labelId="type-filter-label"
            multiple
            value={filterTypes}
            onChange={(e) => dispatch(setFilterTypes(e.target.value))}
            input={<OutlinedInput label="Type" />}
            renderValue={(selected) => (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                {selected.map((value) => (
                  <Chip key={value} label={value} />
                ))}
              </Box>
            )}
            MenuProps={MenuProps}
          >
            {Array.from(new Set(events.map((e) => e.type))).map((type) => (
              <MenuItem key={type} value={type}>
                {type}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel id="tag-filter-label">Tag</InputLabel>
          <Select
            labelId="tag-filter-label"
            multiple
            value={filterTags}
            onChange={(e) => dispatch(setFilterTags(e.target.value))}
            input={<OutlinedInput label="Tag" />}
            renderValue={(selected) => (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                {selected.map((value) => (
                  <Chip key={value} label={value} />
                ))}
              </Box>
            )}
            MenuProps={MenuProps}
          >
            {allTags.map((tag) => (
              <MenuItem key={tag} value={tag}>
                {tag}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button variant="outlined" size="small" onClick={handleExportPNG}>
          Export PNG
        </Button>
        <Button variant="outlined" size="small" onClick={handleExportJSON}>
          Export JSON
        </Button>
      </Stack>
      <Box sx={{ flexGrow: 1 }}>
        <svg ref={svgRef} width="100%" height="100%" />
      </Box>
    </Box>
  );
};

export default TimelineView;
