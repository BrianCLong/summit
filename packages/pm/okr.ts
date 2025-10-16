export type OKR = {
  period: '2025Q4';
  objectives: {
    id: string;
    title: string;
    keyResults: { id: string; title: string; target: number; unit: string }[];
  }[];
};
export function linkIssueToKR(issue: any, krId: string) {
  /* store mapping in DB */
}
