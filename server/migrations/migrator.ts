export async function run(name: string, batch = 1000) {
  // Reads from migrations_progress (name, last_id, state)
  // Processes rows > last_id, updates cursor; safe to resume.
}
