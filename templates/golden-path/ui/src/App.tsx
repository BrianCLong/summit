import './app.css';

function App() {
  return (
    <main className="app">
      <header className="app__header">
        <h1>{'{{SERVICE_NAME}}'}</h1>
        <p>Paved-road UI ready for provenance-aware deployments.</p>
      </header>
      <section>
        <h2>Release Checklist</h2>
        <ul>
          <li>SBOM generated with Syft</li>
          <li>Grype scan clean within CVE budget</li>
          <li>Cosign signature verified before deploy</li>
          <li>SLSA provenance stored with release</li>
        </ul>
      </section>
    </main>
  );
}

export default App;
