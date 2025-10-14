import pandas as pd

data = {
    'Feature': [
        'Intelligence Feeds', 'Narrative Intelligence', 'Analyst & SME Calls', 'Landscape Reports',
        'Deep-Dive Reports', 'Network Discovery Maps', 'API Access', 'Team Integration',
        'Data Exports', 'Custom Training', 'User Access (Growth)', 'User Access (Company)',
        'User Access (Enterprise)', 'Community Data Downloads', 'Predictive Analytics',
        'Real-Time Alerting', 'Cross-Platform Integration', 'AI Explainability',
        'Collaborative Workspaces', 'Automated Playbooks'
    ],
    'Graphika': [
        'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes (Narrative Analytics)', 'Slack (Live), Teams (Coming)',
        'Yes (Reports, Maps)', 'Yes', '1 User', 'Up to 100 Users', 'Unlimited', 'Yes', 'Limited', 'No', 'Partial', 'No', 'No', 'No'
    ],
    'Proposed MVP-2': [
        'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Slack, Teams, Salesforce',
        'Yes', 'Yes', '1 User', 'Up to 100 Users', 'Unlimited', 'Yes', 'Yes', 'Yes', 'Yes', 'No', 'No', 'No'
    ],
    'Proposed GA': [
        'Yes+', 'Yes+', 'Yes+', 'Yes+', 'Yes+', 'Yes+', 'Yes+', 'Slack, Teams, Salesforce, Dynamics',
        'Yes+', 'Yes+', '1 User', 'Up to 100 Users', 'Unlimited', 'Yes+', 'Yes+', 'Yes+', 'Yes+', 'Yes', 'Yes', 'Yes'
    ]
}

df = pd.DataFrame(data)
df.to_csv('feature_gap_analysis.csv', index=False)
df.head(10).to_markdown(index=False)