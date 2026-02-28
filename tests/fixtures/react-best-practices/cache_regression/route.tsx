// RBP-002: Missing cache directive
export default async function Page() {
  // RBP-003: No streaming boundary
  return <div>No Cache or Suspense</div>;
}
