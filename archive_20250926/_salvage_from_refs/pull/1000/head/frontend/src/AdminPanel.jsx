import { useState } from "react";

// Simple admin panel placeholder for managing the forecaster
export default function AdminPanel() {
  const [file, setFile] = useState(null);
  const [precision, setPrecision] = useState(null);
  const [mae, setMae] = useState(null);
  const [learningRate, setLearningRate] = useState("1e-3");

  const handleUpload = (e) => {
    setFile(e.target.files?.[0] || null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Placeholder: send file and hyperparameters to backend
    console.log("Uploading", file, "lr", learningRate);
    setPrecision(0.0);
    setMae(0.0);
  };

  return (
    <section
      style={{ border: "1px solid #ccc", padding: "1rem", marginTop: "1rem" }}
    >
      <h2>Admin Control Panel</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>
            Ground Truth CSV:
            <input type="file" accept=".csv" onChange={handleUpload} />
          </label>
        </div>
        <div>
          <label>
            Learning Rate:
            <input
              value={learningRate}
              onChange={(e) => setLearningRate(e.target.value)}
            />
          </label>
        </div>
        <button type="submit">Submit</button>
      </form>
      {precision !== null && (
        <div>
          <p>Precision@K: {precision}</p>
          <p>MAE: {mae}</p>
        </div>
      )}
    </section>
  );
}
