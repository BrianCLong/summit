export function seed(): void {
  process.stdout.write('Seeding demo data\n');
}

if (require.main === module) {
  seed();
}
