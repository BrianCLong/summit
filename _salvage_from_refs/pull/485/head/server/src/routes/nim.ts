import express from "express";

const router = express.Router();

router.get("/", (_req, res) => {
  res.json({
    graph: {
      nodes: [
        {
          id: "reddit:r/worldnews",
          community: "Reddit",
          riskScore: 0.3,
          lat: 34.05,
          lon: -118.25,
        },
        {
          id: "telegram:group123",
          community: "Telegram",
          riskScore: 0.8,
          lat: 51.51,
          lon: -0.13,
        },
      ],
      links: [
        {
          source: "reddit:r/worldnews",
          target: "telegram:group123",
          weight: 0.5,
        },
      ],
    },
  });
});

export default router;
