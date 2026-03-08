export interface InfowarIncident {
  date: string;
  actor: string;
  narrative: string;
  platform: string;
  evidence_url: string;
}

export class InfowarCSVConnector {
  async parse(csvContent: string): Promise<InfowarIncident[]> {
    // Stub implementation
    const lines = csvContent.split('\n').filter(line => line.trim() !== '');
    if (lines.length <= 1) return []; // Only header or empty

    const incidents: InfowarIncident[] = [];
    const headers = lines[0].split(',');

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      incidents.push({
        date: values[0],
        actor: values[1],
        narrative: values[2],
        platform: values[3],
        evidence_url: values[4],
      });
    }

    return incidents;
  }
}
