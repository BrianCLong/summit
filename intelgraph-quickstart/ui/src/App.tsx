import { useEffect, useState } from "react";
import { gql } from "./api";
export default function App() {
  const [people, setPeople] = useState<any[]>([]);
  useEffect(() => {
    gql('{ searchPersons(q:"a", limit: 10){ id name } }').then((r) =>
      setPeople(r.data.searchPersons)
    );
  }, []);
  return (
    <div style={{ padding: 16 }}>
      <h1>IntelGraph Demo</h1>
      <ul>
        {people.map((p) => (
          <li key={p.id}>{p.name}</li>
        ))}
      </ul>
    </div>
  );
}
