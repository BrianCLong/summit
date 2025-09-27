flow marketing_guard
source crm [purpose=marketing, jurisdiction=US, retention=14d]
transform enrich [purpose=analytics, jurisdiction=US, retention=30d]
sink ads [purpose=marketing, jurisdiction=EU, retention=90d]
sink analytics [purpose=analytics, jurisdiction=US, retention=90d]

crm -> enrich -> ads
enrich -> analytics
