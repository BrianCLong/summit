import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

export const fetchTimelineEvents = createAsyncThunk(
  "timeline/fetchEvents",
  async () => {
    const res = await fetch("/api/events");
    if (!res.ok) throw new Error("Failed to fetch events");
    const data = await res.json();
    return data.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  },
);

const timelineSlice = createSlice({
  name: "timeline",
  initialState: {
    events: [],
    filterTypes: [],
    filterTags: [],
    selectedEventId: null,
    status: "idle",
    error: null,
  },
  reducers: {
    setFilterTypes(state, action) {
      state.filterTypes = action.payload;
    },
    setFilterTags(state, action) {
      state.filterTags = action.payload;
    },
    selectEvent(state, action) {
      state.selectedEventId = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTimelineEvents.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchTimelineEvents.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.events = action.payload;
      })
      .addCase(fetchTimelineEvents.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message;
      });
  },
});

export const { setFilterTypes, setFilterTags, selectEvent } =
  timelineSlice.actions;
export default timelineSlice.reducer;
