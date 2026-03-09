with open('server/src/marketplace/service.ts') as f:
    content = f.read()

# Make sure updateReputation works properly
content = content.replace("    this.updateReputation(pkg.contributorId, +2); // Reward for valid submission", "    const updatedRep = this.updateReputation(pkg.contributorId, +2); // Reward for valid submission\n    subgraph.reputationScore = updatedRep;")

with open('server/src/marketplace/service.ts', 'w') as f:
    f.write(content)
